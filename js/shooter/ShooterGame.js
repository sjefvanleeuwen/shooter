import Engine from '../engine/Engine.js';
import StartupScreen from './screens/StartupScreen.js';
import IntroScreen from './screens/IntroScreen.js';
import GameScreen from './screens/GameScreen.js';
import GameStateManager from './managers/GameStateManager.js';
import HUDManager from './managers/HUDManager.js';
import ImageBackgroundScroller from './imageBackgroundScroller.js';
import { assets } from './config/assetManifest.js';

export default class ShooterGame extends Engine {
    constructor() {
        super({
            width: 1024,
            height: 1024,
            enableDebug: false,
            musicTracks: assets.music
        });

        this.bossVoiceKeys = [
            'boss_hope', 'boss_mistake', 'boss_devour', 'boss_erase', 
            'boss_run', 'boss_galaxy', 'boss_dead', 'boss_inevitable', 'boss_annihilation'
        ];

        this.gameState = new GameStateManager();
        this.hudManager = new HUDManager(this.ctx, this.virtualWidth, this.virtualHeight);

        // Preload sounds
        this.audioManager.preloadGameSounds(assets.sfx).catch(err => {
            console.error('Failed to preload shooter sounds:', err);
        });

        // Pre-create the background scroller shared between screens
        this.bgScroller = new ImageBackgroundScroller(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            scrollSpeed: 100
        });

        // Initialize screens
        this.registerScreens({
            startup: new StartupScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight
            }),
            intro: new IntroScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                bgScroller: this.bgScroller
            }),
            game: new GameScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                bgScroller: this.bgScroller,
                gameState: this.gameState,
                audioManager: this.audioManager
            })
        });

        // Set initial screen
        this.switchScreen('startup');

        // Start the engine loop
        this.start();

        // Specific initialization
        this.offCanvasCache = document.createElement('canvas');
        
        // Ensure game is globally accessible for convenience (screens often use it)
        window.game = this;
    }

    /** Game over logic - creates a fresh intro screen with stats. */
    gameOver() {
        this.screens.intro = new IntroScreen(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            bgScroller: this.bgScroller,
            isGameOver: true,
            finalScore: this.gameState.score,
            highScore: this.gameState.highScore
        });
        
        // Re-register input handler for the new instance
        this.inputManager.registerScreen('intro', (key) => this.screens.intro.handleInput(key));
        
        this.switchScreen('intro');
    }

    /** 
     * Specific screen switch logic.
     * Overrides base engine to handle game-specific music transitions.
     */
    switchScreen(screenName) {
        // Prepare game screen when switching TO it
        if (screenName === 'game') {
            this.screens.game = new GameScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                bgScroller: this.bgScroller,
                gameState: this.gameState,
                audioManager: this.audioManager
            });
            // Re-register input
            this.inputManager.registerScreen('game', (key) => this.screens.game.handleInput(key));
        }

        // Music transitions
        if (this.currentScreen === 'startup' && screenName === 'intro') {
            if (this.musicPlayer) {
                this.musicPlayer.fadeIn(3);
            }
        }

        super.switchScreen(screenName);
    }

    /** 
     * Specific update logic.
     * Overrides base engine to include game state updates.
     */
    update(timestamp) {
        // Calculate delta BEFORE calling super.update() which updates this.lastTime
        const delta = (timestamp - (this.lastTime || timestamp)) / 1000;
        
        super.update(timestamp);
        
        if (this.isRunning) {
            this.gameState.update(delta);
        }
    }

    /** 
     * Specific draw overlays.
     * Called by base engine before CRT rendering.
     */
    onDrawOverlay() {
        // Overlay HUD on top of everything
        if (this.currentScreen === 'game' && this.screens.game) {
            const boss = this.screens.game.getActiveBoss();
            this.hudManager.draw(
                this.gameState.lives,
                this.gameState.score,
                this.gameState.highScore,
                boss
            );
        }
    }

    /** Specific shooter logic: Play a random boss voice. */
    playRandomBossVoice() {
        this.audioManager.playPlaylistRandom('boss-voices', this.bossVoiceKeys, { volume: 1.5, pan: 0 });
    }
}
