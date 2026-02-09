import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

async function verifyImageDimensions(filePath, expectedWidth, expectedHeight) {
    try {
        const metadata = await sharp(filePath).metadata();
        const matches = metadata.width === expectedWidth && metadata.height === expectedHeight;
        console.log(`Verifying ${path.basename(filePath)}: ${metadata.width}x${metadata.height} (Expected: ${expectedWidth}x${expectedHeight}) - ${matches ? "OK" : "MISMATCH"}`);
        return matches;
    } catch (err) {
        console.error(`Error verifying ${filePath}:`, err);
        return false;
    }
}

async function processImage(srcPath, destPath, options) {
    try {
        const safeOptions = options || {};
        if (await fs.pathExists(destPath)) {
            await fs.remove(destPath);
        }

        const tempDir = path.join(projectRoot, "temp");
        await fs.ensureDir(tempDir);
        const tempFile = path.join(tempDir, `temp_${path.basename(destPath)}`);

        const filename = path.basename(srcPath);
        const dimensions = safeOptions.resizeMap?.[filename] || {
            width: safeOptions.width || 1024,
            height: safeOptions.height || 1024
        };

        if (safeOptions.skipPostProcess) {
            await sharp(srcPath)
                .resize(dimensions.width, dimensions.height, {
                    fit: safeOptions.fit || "contain",
                    position: safeOptions.position || "center",
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png({
                    palette: safeOptions.palette,
                    colors: safeOptions.colors,
                    quality: safeOptions.quality || 60,
                    compressionLevel: 9,
                    effort: 10,
                    adaptiveFiltering: true,
                    dither: safeOptions.compression?.dithering ?? 0.5
                })
                .toFile(destPath);
        } else {
            await sharp(srcPath)
                .resize(dimensions.width, dimensions.height, {
                    fit: safeOptions.fit || "contain",
                    position: safeOptions.position || "center",
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .normalize()
                .median(3)
                .png({
                    palette: safeOptions.palette,
                    colors: safeOptions.colors,
                    quality: 100,
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                    effort: 10,
                    dither: 1.0
                })
                .toFile(tempFile);

            await sharp(tempFile)
                .png({
                    quality: safeOptions.quality || 40,
                    compressionLevel: 9,
                    effort: 10,
                    adaptiveFiltering: true,
                    palette: safeOptions.palette,
                    colors: safeOptions.colors,
                    dither: safeOptions.compression?.dithering ?? 0.5
                })
                .toFile(destPath);

            await fs.remove(tempFile);
        }

        const isCorrectSize = await verifyImageDimensions(destPath, dimensions.width, dimensions.height);
        if (!isCorrectSize) {
            console.error(`WARNING: ${path.basename(destPath)} has incorrect dimensions!`);
        }
    } catch (err) {
        console.error(`Error processing ${srcPath}:`, err);
    }
}

async function copyAssetsForGame(gameId) {
    const gameRoot = path.join(projectRoot, "games", gameId);
    if (!await fs.pathExists(gameRoot)) {
        console.warn(`Skipping missing game: ${gameId}`);
        return;
    }

    const imageConfigPath = path.join(gameRoot, "config", "image-processing.json");
    let config = null;
    if (await fs.pathExists(imageConfigPath)) {
        config = await fs.readJson(imageConfigPath);
    }

    const buildMode = process.env.BUILD_MODE || config?.general?.defaultMode || "modern";
    const modeConfig = (gameId === "black-signal") ? null : (config?.modes?.[buildMode] || null);

    console.log(`Building assets for ${gameId} in ${buildMode.toUpperCase()} mode...`);

    const rel = (...parts) => parts.join("/");
    const assetDirs = [
        { src: rel("games", gameId, "screen.png"), dest: rel("dist", "games", gameId, "screen.png"), isFile: true },
        { src: rel("games", gameId, "config"), dest: rel("dist", "games", gameId, "config") },
        { src: rel("games", gameId, "sprites"), dest: rel("dist", "games", gameId, "sprites"), process: !!modeConfig, exclude: ["ui"], options: modeConfig ? { resizeMap: modeConfig.sprites?.dimensions, ...modeConfig.sprites?.processing } : undefined },
        { src: rel("games", gameId, "sprites", "ui"), dest: rel("dist", "games", gameId, "sprites", "ui") },
        { src: rel("games", gameId, "audio"), dest: rel("dist", "games", gameId, "audio") },
        { src: rel("games", gameId, "fonts"), dest: rel("dist", "games", gameId, "fonts") },
        { src: rel("games", gameId, "videos"), dest: rel("dist", "games", gameId, "videos") },
        { src: rel("games", gameId, "3d"), dest: rel("dist", "games", gameId, "3d") },
        { src: rel("games", gameId, "backgrounds"), dest: rel("dist", "games", gameId, "backgrounds"), process: !!modeConfig, options: modeConfig ? { ...modeConfig.backgrounds?.dimensions, ...modeConfig.backgrounds?.processing } : undefined }
    ];

    for (const dir of assetDirs) {
        const srcPath = path.resolve(projectRoot, dir.src);
        const destPath = path.resolve(projectRoot, dir.dest);
        
        if (!await fs.pathExists(srcPath)) continue;

        if (dir.isFile) {
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(srcPath, destPath);
        } else if (dir.process && dir.options) {
            const processDirectory = async (currentSrc, currentDest) => {
                await fs.ensureDir(currentDest);
                const items = await fs.readdir(currentSrc, { withFileTypes: true });
                for (const item of items) {
                    if (dir.exclude && dir.exclude.includes(item.name)) continue;
                    const itemSrcPath = path.join(currentSrc, item.name);
                    const itemDestPath = path.join(currentDest, item.name.replace(/\.(png|jpg|jpeg)$/i, ".png"));
                    if (item.isDirectory()) await processDirectory(itemSrcPath, itemDestPath);
                    else if (item.isFile() && item.name.match(/\.(png|jpg|jpeg)$/i)) await processImage(itemSrcPath, itemDestPath, dir.options);
                }
            };
            await processDirectory(srcPath, destPath);
        } else {
            await fs.ensureDir(destPath);
            await fs.copy(srcPath, destPath);
        }
    }
}

async function main() {
    const gameIdArg = process.argv[2];
    const tempDir = path.join(projectRoot, "temp");
    await fs.remove(tempDir);

    if (gameIdArg && gameIdArg !== "all") {
        await copyAssetsForGame(gameIdArg);
    } else {
        const gamesDir = path.join(projectRoot, "games");
        const items = await fs.readdir(gamesDir, { withFileTypes: true });
        const gameIds = items.filter(i => i.isDirectory()).map(i => i.name);
        for (const id of gameIds) {
            await copyAssetsForGame(id);
        }
    }
    await fs.remove(tempDir);
    console.log("Asset copying complete!");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
