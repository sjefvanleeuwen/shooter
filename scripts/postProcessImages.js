import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const config = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'config/image-processing.json'), 'utf8')
);

// Determine build mode (default to modern if not specified)
const buildMode = process.env.BUILD_MODE || config.general.defaultMode || 'modern';
const modeConfig = config.modes[buildMode];

console.log(`Running post-process optimization in ${buildMode.toUpperCase()} mode...`);

if (!modeConfig) {
    console.error(`Invalid build mode: ${buildMode}`);
    process.exit(1);
}

async function optimizeImages() {
    const directories = ['sprites', 'backgrounds'].map(dir => 
        path.join(projectRoot, 'dist', dir)
    );

    for (const dir of directories) {
        if (!await fs.pathExists(dir)) continue;

        console.log(`Optimizing images in ${dir}...`);
        
        // Helper to recursively process directories
        const processDir = async (currentDir) => {
            const items = await fs.readdir(currentDir, { withFileTypes: true });
            const isSpritesDir = currentDir.includes('sprites');
            
            // Use modeConfig instead of config
            const compressionConfig = isSpritesDir 
                ? modeConfig.sprites.processing.compression
                : modeConfig.backgrounds.processing.compression;

            for (const item of items) {
                const itemPath = path.join(currentDir, item.name);
                
                if (item.isDirectory()) {
                    await processDir(itemPath);
                } else if (item.isFile() && item.name.match(/\.(png|jpg|jpeg)$/i)) {
                    try {
                        await imagemin([itemPath], {
                            destination: currentDir,
                            plugins: [
                                imageminPngquant(compressionConfig)
                            ]
                        });
                        console.log(`Optimized: ${item.name}`);
                    } catch (err) {
                        console.error(`Error optimizing ${item.name}:`, err.message);
                    }
                }
            }
        };

        await processDir(dir);
    }
}

optimizeImages().catch(console.error);
