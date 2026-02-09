import Engine from '../../../js/engine/Engine.js';
import GameScreen from './screens/GameScreen.js';
import assets from './config/assetManifest.js';

export default class BlackSignalGame extends Engine {
    constructor() {
        super({
            gameId: 'black-signal',
            width: 1920,
            height: 1080,
            enableDebug: false,
            musicTracks: assets.music,
            crtConfigPath: 'games/black-signal/config/crt-effect.json',
            mobileControls: {
                // We'll use simple colors or placeholders for now
                buttonBlueUrl: 'games/xenowar/sprites/ui/button-blue.png',
                buttonRedUrl: 'games/xenowar/sprites/ui/button-red.png'
            }
        });

        window.game = this;

        // Initialize screens
        this.registerScreens({
            game: new GameScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                audioManager: this.audioManager
            })
        });

        // Set initial screen
        this.switchScreen('game');

        // Start music on first interaction to comply with browser policies
        const startAudio = () => {
            this.audioManager.resumeContext();
            this.musicPlayer?.start();
            window.removeEventListener('keydown', startAudio);
            window.removeEventListener('mousedown', startAudio);
            window.removeEventListener('touchstart', startAudio);
        };
        window.addEventListener('keydown', startAudio);
        window.addEventListener('mousedown', startAudio);
        window.addEventListener('touchstart', startAudio);

        // Start the engine loop
        this.start();
    }
}
