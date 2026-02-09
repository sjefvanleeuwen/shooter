import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

async function optimizeGame(gameId) {
    const gameRoot = path.join(projectRoot, "games", gameId);
    const imageConfigPath = path.join(gameRoot, "config", "image-processing.json");
    
    if (!await fs.pathExists(imageConfigPath)) {
        console.warn(`No image-processing config for ${gameId}, skipping.`);
        return;
    }

    const config = await fs.readJson(imageConfigPath);
    const buildMode = process.env.BUILD_MODE || config.general?.defaultMode || "modern";
    const modeConfig = config.modes?.[buildMode];

    if (!modeConfig) {
        console.warn(`No mode config for ${buildMode} in ${gameId}, skipping.`);
        return;
    }

    console.log(`Optimizing ${gameId} (${buildMode})...`);
    
    const directories = ["sprites", "backgrounds"].map(dir =>
        path.join(projectRoot, "dist/games", gameId, dir)
    );

    for (const dir of directories) {
        if (!await fs.pathExists(dir)) continue;
        
        const processDir = async (currentDir) => {
            const items = await fs.readdir(currentDir, { withFileTypes: true });
            const isSpritesDir = currentDir.includes(`${path.sep}sprites`);
            const compressionConfig = isSpritesDir 
                ? modeConfig.sprites?.processing?.compression
                : modeConfig.backgrounds?.processing?.compression;

            if (!compressionConfig) return;

            for (const item of items) {
                const itemPath = path.join(currentDir, item.name);
                if (item.isDirectory()) {
                    await processDir(itemPath);
                } else if (item.isFile() && item.name.match(/\.(png|jpg|jpeg)$/i)) {
                    try {
                        await imagemin([itemPath], {
                            destination: currentDir,
                            plugins: [imageminPngquant(compressionConfig)]
                        });
                    } catch (err) {
                        console.error(`Error optimizing ${item.name}:`, err.message);
                    }
                }
            }
        };
        await processDir(dir);
    }
}

async function main() {
    const gameIdArg = process.argv[2];
    if (gameIdArg && gameIdArg !== "all") {
        if (gameIdArg === "black-signal") {
            console.log("Skipping optimization for black-signal as requested.");
            return;
        }
        await optimizeGame(gameIdArg);
    } else {
        const gamesDir = path.join(projectRoot, "games");
        const items = await fs.readdir(gamesDir, { withFileTypes: true });
        for (const i of items) {
            if (i.isDirectory() && i.name !== "black-signal") {
                await optimizeGame(i.name);
            }
        }
    }
    console.log("Optimization complete!");
}

main().catch(console.error);
