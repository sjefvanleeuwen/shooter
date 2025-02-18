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

async function optimizeImages() {
    const directories = ['sprites', 'backgrounds'].map(dir => 
        path.join(projectRoot, 'dist', dir)
    );

    for (const dir of directories) {
        if (!await fs.pathExists(dir)) continue;

        console.log(`Optimizing images in ${dir}...`);
        const files = await fs.readdir(dir);
        
        const isSpritesDir = dir.includes('sprites');
        const compressionConfig = isSpritesDir 
            ? config.sprites.processing.compression
            : config.backgrounds.processing.compression;
        
        for (const file of files) {
            if (!file.match(/\.(png|jpg|jpeg)$/i)) continue;
            
            try {
                await imagemin([path.join(dir, file)], {
                    destination: dir,
                    plugins: [
                        imageminPngquant(compressionConfig)
                    ]
                });
                
                console.log(`Optimized: ${file}`);
            } catch (err) {
                console.error(`Error optimizing ${file}:`, err.message);
            }
        }
    }
}

optimizeImages().catch(console.error);
