import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const config = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'config/image-processing.json'), 'utf8')
);

// Determine build mode (default to modern if not specified)
const buildMode = process.env.BUILD_MODE || config.general.defaultMode || 'modern';
const modeConfig = config.modes[buildMode];

console.log(`Building assets in ${buildMode.toUpperCase()} mode...`);

if (!modeConfig) {
    console.error(`Invalid build mode: ${buildMode}. Available modes: ${Object.keys(config.modes).join(', ')}`);
    process.exit(1);
}

const assetDirs = [
    {
        src: 'sprites',
        dest: 'dist/sprites',
        process: true,
        exclude: ['ui'],
        options: {
            resizeMap: modeConfig.sprites.dimensions,
            ...modeConfig.sprites.processing
        }
    },
    {
        src: 'sprites/ui',
        dest: 'dist/sprites/ui',
        process: false
    },
    {
        src: 'audio',
        dest: 'dist/audio',
        process: false
    },
    {
        src: 'backgrounds',
        dest: 'dist/backgrounds',
        process: true,
        options: {
            ...modeConfig.backgrounds.dimensions,
            ...modeConfig.backgrounds.processing
        }
    }
];

async function verifyImageDimensions(filePath, expectedWidth, expectedHeight) {
    try {
        const metadata = await sharp(filePath).metadata();
        const matches = metadata.width === expectedWidth && metadata.height === expectedHeight;
        console.log(`Verifying ${path.basename(filePath)}: ${metadata.width}x${metadata.height} (Expected: ${expectedWidth}x${expectedHeight}) - ${matches ? 'OK' : 'MISMATCH'}`);
        return matches;
    } catch (err) {
        console.error(`Error verifying ${filePath}:`, err);
        return false;
    }
}

async function processImage(srcPath, destPath, options) {
    try {
        // Force delete destination file if it exists
        if (await fs.pathExists(destPath)) {
            await fs.remove(destPath);
            console.log(`Removed existing file: ${destPath}`);
        }

        const tempDir = path.join(projectRoot, 'temp');
        await fs.ensureDir(tempDir);
        const tempFile = path.join(tempDir, `temp_${path.basename(destPath)}`);

        // Get specific dimensions for sprites if available
        const filename = path.basename(srcPath);
        const dimensions = options.resizeMap?.[filename] || {
            width: options.width || TARGET_SIZE,
            height: options.height || TARGET_SIZE
        };

        console.log(`Processing ${filename} to ${dimensions.width}x${dimensions.height}`);

        // Special handling for backgrounds - single pass processing
        if (options.skipPostProcess) {
            await sharp(srcPath)
                .resize(options.width, options.height, {
                    fit: options.fit || 'contain',
                    position: options.position || 'center',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent background
                })
                .png({
                    palette: options.palette,
                    colors: options.colors,
                    quality: options.quality || 60,
                    compressionLevel: 9,
                    effort: 10,
                    adaptiveFiltering: true,
                    dither: options.compression?.dithering ?? 0.5
                })
                .toFile(destPath);
        } else {
            // First pass with specific dimensions
            await sharp(srcPath)
                .resize(dimensions.width, dimensions.height, {
                    fit: options.fit || 'contain',
                    position: options.position || 'center',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent background
                })
                .normalize()
                .median(3)
                .png({
                    palette: options.palette, // Respect config
                    colors: options.colors,
                    quality: 100, // Keep first pass high quality
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                    effort: 10,
                    dither: 1.0
                })
                .toFile(tempFile);

            // Second pass: Optimize with configured settings
            await sharp(tempFile)
                .png({
                    quality: options.quality || 40, 
                    compressionLevel: 9,
                    effort: 10,
                    adaptiveFiltering: true,
                    palette: options.palette, // Respect config
                    colors: options.colors,
                    dither: options.compression?.dithering ?? 0.5
                })
                .toFile(destPath);

            // Clean up temp file
            await fs.remove(tempFile);
        }
        
        // Log compression results
        const originalStats = await fs.stat(srcPath);
        const finalStats = await fs.stat(destPath);
        const compressionRatio = ((originalStats.size - finalStats.size) / originalStats.size * 100).toFixed(2);
        
        console.log(`Processed: ${path.basename(srcPath)}`);
        console.log(`  Original: ${(originalStats.size / 1024).toFixed(2)}KB`);
        console.log(`  Final: ${(finalStats.size / 1024).toFixed(2)}KB`);
        console.log(`  Compression: ${compressionRatio}%`);
        console.log(`Processed ${filename}: ${dimensions.width}x${dimensions.height}`);

        // Verify dimensions after processing
        const isCorrectSize = await verifyImageDimensions(destPath, dimensions.width, dimensions.height);
        if (!isCorrectSize) {
            console.error(`WARNING: ${path.basename(destPath)} has incorrect dimensions!`);
        }

    } catch (err) {
        console.error(`Error processing ${srcPath}:`, err);
    }
}

// Add cleanup function for temp directory
async function cleanup() {
    const tempDir = path.join(projectRoot, 'temp');
    if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
    }
}

// Update main function to include cleanup
async function copyAssets() {
    try {
        // Clean dist directories first
        for (const dir of assetDirs) {
            const destPath = path.resolve(projectRoot, dir.dest);
            if (await fs.pathExists(destPath)) {
                await fs.remove(destPath);
                console.log(`Cleaned directory: ${destPath}`);
            }
        }

        await cleanup(); // Clean up before starting
        for (const dir of assetDirs) {
            const srcPath = path.resolve(projectRoot, dir.src);
            const destPath = path.resolve(projectRoot, dir.dest);
            
            if (!fs.existsSync(srcPath)) {
                console.warn(`Warning: Source directory ${dir.src} not found`);
                continue;
            }

            await fs.ensureDir(destPath);

            if (dir.process) {
                // Helper to recursively process directories
                const processDirectory = async (currentSrc, currentDest) => {
                    await fs.ensureDir(currentDest);
                    const items = await fs.readdir(currentSrc, { withFileTypes: true });
                    
                    for (const item of items) {
                        // Handle exclusions
                        if (dir.exclude && dir.exclude.includes(item.name)) {
                            continue;
                        }

                        const itemSrcPath = path.join(currentSrc, item.name);
                        
                        if (item.isDirectory()) {
                            // Recursively process subdirectories
                            const itemDestPath = path.join(currentDest, item.name);
                            await processDirectory(itemSrcPath, itemDestPath);
                        } else if (item.isFile() && item.name.match(/\.(png|jpg|jpeg)$/i)) {
                            // Process image files
                            const itemDestPath = path.join(currentDest, path.basename(item.name, path.extname(item.name)) + '.png');
                            await processImage(itemSrcPath, itemDestPath, dir.options);
                        }
                    }
                };

                await processDirectory(srcPath, destPath);
            } else {
                // Simple copy for non-processed assets
                await fs.copy(srcPath, destPath);
            }
            
            console.log(`Copied ${dir.src} to ${dir.dest}`);
        }
        console.log('Asset copying complete!');
        await cleanup(); // Clean up after finishing
    } catch (err) {
        console.error('Error copying assets:', err);
        await cleanup(); // Clean up on error
        process.exit(1);
    }
}

copyAssets();
