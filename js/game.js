import Player from './player.js';
import { ParticleEngine, LaserEngine } from './particleEngine.js';
import ImageBackgroundScroller from './imageBackgroundScroller.js';
import PatternFormation from './PatternFormation.js';  // Add this import
import IntroScreen from './screens/IntroScreen.js';
import MusicPlayer from './audio/MusicPlayer.js';
import StartupScreen from './screens/StartupScreen.js';
import DebugWindow from './DebugWindow.js';
import CanvasManager from './CanvasManager.js';
import InputManager from './InputManager.js';
import HUDManager from './managers/HUDManager.js';
import GameStateManager from './managers/GameStateManager.js';
import GameScreen from './screens/GameScreen.js';

class Game {
    constructor() {
        // Make the game instance globally accessible
        window.game = this;

        this.virtualWidth = 1080;  // Changed from 1920 to match height
        this.virtualHeight = 1080; // Keeping this the same

        // Initialize managers
        this.canvasManager = new CanvasManager('gameCanvas', this.virtualWidth, this.virtualHeight);
        this.inputManager = new InputManager();
        this.gameState = new GameStateManager();
        this.hudManager = new HUDManager(this.canvasManager.getContext(), this.virtualWidth, this.virtualHeight);
        
        this.ctx = this.canvasManager.getContext();
        
        // Remove setupCanvas() and bindEvents() calls
        // Force a resize event to immediately update offsets.
        window.dispatchEvent(new Event('resize'));
        
        // Virtual resolution setup - now square
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.viewportWidth = 1080;  // Changed from 1920 to match new virtual width
        this.checkerSize = 64;
        
        this.lastTime = 0;
        // Create the ImageBackgroundScroller entity instead of BackgroundScroller
        this.bgScroller = new ImageBackgroundScroller(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            viewportWidth: this.viewportWidth,
            checkerSize: this.checkerSize,
            scrollSpeed: 100,
            offsetY: this.offsetY
        });

        // Initialize screens BEFORE setting up input handlers
        this.screens = {
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
                gameState: this.gameState
            })
        };
        
        this.currentScreen = 'startup';
        
        // Register input handlers
        this.inputManager.setDebugHandler(() => {
            this.debugWindow.visible = !this.debugWindow.visible;
        });

        // Register screen handlers
        Object.entries(this.screens).forEach(([name, screen]) => {
            if (screen && screen.handleInput) {
                this.inputManager.registerScreen(name, (key) => {
                    const nextScreen = screen.handleInput(key);
                    if (nextScreen) {
                        this.switchScreen(nextScreen);
                    }
                    return nextScreen;
                });
            }
        });

        // Set initial screen
        this.inputManager.setCurrentScreen('startup');

        // Start the game loop
        this.startGameLoop();

        this.playerHit = false;
        this.playerInvulnerable = false;
        this.invulnerabilityTime = 2.0;
        this.invulnerabilityTimer = 0;
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') 
            ? parseInt(localStorage.getItem('highScore'), 10)
            : 0;
        this.lives = 3;

        // Initialize music player without starting it
        this.musicPlayer = new MusicPlayer();
        // Create persistent offscreen canvas for player tinting effects
        this.offCanvasCache = document.createElement('canvas');
        this.debugWindow = new DebugWindow();
    }

    gameOver() {
        // Create new intro screen with game over state
        this.screens.intro = new IntroScreen(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            bgScroller: this.bgScroller,
            isGameOver: true,
            finalScore: this.gameState.score,
            highScore: this.gameState.highScore
        });
        this.switchScreen('intro');
    }

    reset() {
        // Reposition player at center bottom of the virtual game area, raised 50px.
        this.player.x = (this.virtualWidth - this.player.width) / 2;
        this.player.y = this.virtualHeight - this.player.height - 20 - 50;
    }

    switchScreen(screenName) {
        // Cleanup current screen
        if (this.screens[this.currentScreen]?.cleanup) {
            this.screens[this.currentScreen].cleanup();
        }

        // Special handling for game screen
        if (screenName === 'game') {
            // Always create a new game screen instance
            this.screens.game = new GameScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                bgScroller: this.bgScroller,
                gameState: this.gameState
            });
        }

        // Handle music transitions
        if (this.currentScreen === 'startup' && screenName === 'intro') {
            this.musicPlayer.start().then(() => {
                this.musicPlayer.fadeIn(3);
            });
        }

        this.currentScreen = screenName;
        this.inputManager.setCurrentScreen(screenName);
    }

    update(timestamp) {
        const delta = (timestamp - (this.lastTime || timestamp)) / 1000;
        this.lastTime = timestamp;
        
        // Update game state
        this.gameState.update(delta);
        
        // Update current screen
        this.screens[this.currentScreen]?.update(delta);
        
        if(this.debugWindow.visible) {
            this.debugWindow.update(delta);
        }
    }

    draw() {
        this.canvasManager.clearScreen();

        // Draw current screen
        this.screens[this.currentScreen]?.draw();
        
        // Draw HUD if in game screen
        if (this.currentScreen === 'game') {
            this.hudManager.draw(
                this.gameState.lives,
                this.gameState.score,
                this.gameState.highScore
            );
        }
        
        if(this.debugWindow.visible) {
            this.debugWindow.draw(this.ctx);
        }
    }

    startGameLoop() {
        const loop = (timestamp) => {
            this.update(timestamp);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

window.onload = () => {
    new Game();
};
