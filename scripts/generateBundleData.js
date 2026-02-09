import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function getBase64(filePath, mime) {
    const buffer = await fs.readFile(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function processImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const isBackground = filePath.includes('backgrounds');
    
    if (isBackground) {
        // Compress backgrounds to JPG to save massive amounts of space
        console.log(`Compressing background: ${path.basename(filePath)}`);
        const buffer = await sharp(filePath)
            .resize(1024, 1024, { fit: 'fill' }) // Ensure fixed size for backgrounds
            .jpeg({ quality: 60 })
            .toBuffer();
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }

    // Standard sprites - just optimize and keep PNG transparency
    const buffer = await sharp(filePath)
        .png({ quality: 60, compressionLevel: 9 })
        .toBuffer();
    return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function run() {
    const game = process.argv[2] || 'xenowar';
    const manifestPath = path.join(projectRoot, 'games', game, 'js/config/assetManifest.js');
    
    if (!await fs.pathExists(manifestPath)) {
        console.error(`Manifest not found: ${manifestPath}`);
        return;
    }

    // We can't easily import the ESM manifest in a node script without workarounds
    // instead we will parse the manifest or just hardcode the folders to crawl
    const bundleData = {};

    const folders = [
        path.join(projectRoot, 'games', game, 'sprites'),
        path.join(projectRoot, 'games', game, 'backgrounds/level0'),
        path.join(projectRoot, 'games', game, 'audio'),
        path.join(projectRoot, 'games', game, '3d'),
        path.join(projectRoot, 'games', game, 'config')
    ];

    for (const folder of folders) {
        if (!await fs.pathExists(folder)) continue;

        const files = await fs.readdir(folder, { recursive: true });
        for (const file of files) {
            const fullPath = path.join(folder, file);
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) continue;

            const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
            const ext = path.extname(file).toLowerCase();
            
            // Filter music to save space - only take the first 2 tracks for single-file version
            if (relativePath.includes('audio/music') && !relativePath.includes('Cyberdyne') && !relativePath.includes('Cyberwave')) {
                console.log(`Skipping music track to save space: ${file}`);
                continue;
            }

            // Skip non-level0 backgrounds
            if (relativePath.includes('backgrounds/') && !relativePath.includes('level0/')) {
                 continue;
            }

            console.log(`Bundling: ${relativePath}`);
            
            try {
                if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                    bundleData[relativePath] = await processImage(fullPath);
                } else if (['.mp3', '.m4a', '.wav', '.flac'].includes(ext)) {
                    const mime = ext === '.m4a' ? 'audio/mp4' : (ext === '.flac' ? 'audio/flac' : `audio/${ext.slice(1)}`);
                    bundleData[relativePath] = await getBase64(fullPath, mime);
                } else if (ext === '.glb') {
                    bundleData[relativePath] = await getBase64(fullPath, 'model/gltf-binary');
                } else if (ext === '.json') {
                    bundleData[relativePath] = await getBase64(fullPath, 'application/json');
                } else if (['.txt', '.html', '.css', '.js'].includes(ext)) {
                    bundleData[relativePath] = await getBase64(fullPath, 'text/plain');
                } else {
                    // Fallback for everything else
                    bundleData[relativePath] = await getBase64(fullPath, 'application/octet-stream');
                }
            } catch (err) {
                console.error(`Failed to bundle ${relativePath}:`, err);
            }
        }
    }

    const outputPath = path.join(projectRoot, 'games', game, 'js/config/bundleData.js');
    const content = `// Auto-generated bundle data\nexport const bundleData = ${JSON.stringify(bundleData, null, 2)};\nexport default bundleData;`;
    await fs.writeFile(outputPath, content);
    console.log(`Bundle data generated at ${outputPath}`);
    console.log(`Total bundled assets: ${Object.keys(bundleData).length}`);
}

run();
