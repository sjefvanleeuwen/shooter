import ShooterGame from '../games/xenowar/js/ShooterGame.js';
import { bundleData } from '../games/xenowar/js/config/bundleData.js';

window.gameBundleData = bundleData;

window.onload = () => {
    new ShooterGame();
};
