/**
 * Generic Game Engine Library
 * Reusable core for 2D/3D arcade games.
 */

import CanvasManager from './CanvasManager.js';
import InputManager from './InputManager.js';
import AudioManager from './AudioManager.js';
import MusicPlayer from './MusicPlayer.js';
import CRTEffect from './CRTEffect.js';
import DebugWindow from './DebugWindow.js';
import MobileControls from './MobileControls.js';

export default class Engine {
    /**
     * @param {Object} options 
     * @param {number} [options.width=1024]
     * @param {number} [options.height=1024]
     * @param {boolean} [options.enableDebug=false]
     */
    constructor(options = {}) {
        this.virtualWidth = options.width || 1024;
        this.virtualHeight = options.height || 1024;
        this.gameId = options.gameId || 'game';
        
        // Debug Log Switch
        if (options.enableDebug === false) {
            console.log = () => {}; 
        }

        // Create container div for centering
        this.container = document.createElement('div');
        this.container.id = 'engine-container';
        this.container.style.position = 'fixed';
        this.container.style.width = '100vw';
        this.container.style.height = '100vh';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.background = '#000';
        this.container.style.overflow = 'hidden';
        document.body.appendChild(this.container);

        // Setup main canvas (hidden, used as source for CRT effect)
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'engine-canvas';
        this.canvas.width = this.virtualWidth;
        this.canvas.height = this.virtualHeight;
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);

        // Core Managers
        this.canvasManager = new CanvasManager(this.canvas);
        this.ctx = this.canvasManager.getContext();

        this.inputManager = new InputManager();
        this.audioManager = AudioManager.getInstance();
        this.musicPlayer = new MusicPlayer(options.musicTracks || []);
        this.mobileControls = new MobileControls(options.mobileControls || {});
        this.debugWindow = new DebugWindow();

        // CRT effect acts as the final output layer
        this.crtEffect = new CRTEffect(this.canvas, this.container, this.audioManager, options.crtConfigPath);

        // Hotkeys
        this.pendingScreenshot = false;
        this.inputManager.setCaptureHandler(() => {
            this.pendingScreenshot = true;
        });

        this.inputManager.setRecordingHandler(() => {
            if (!this.crtEffect || !this.crtEffect.videoRecorder) return;
            const recorder = this.crtEffect.videoRecorder;
            if (recorder.isRecording()) {
                recorder.stopRecording();
            } else {
                recorder.startRecording();
            }
        });

        if (this.mobileControls.isMobile) {
            this.container.style.alignItems = 'flex-start';
            this.crtEffect.setPadding({ bottom: 180, top: 20 });
        }

        // Screen management
        this.currentScreen = null;
        this.screens = {};
        
        this.lastTime = 0;
        this.isRunning = false;

        // Global access
        window.engine = this;

        // Resize handling
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    captureScreenshot() {
        const canvas = this.crtEffect?.glCanvas || this.canvas;
        if (!canvas) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${this.gameId}-screengrab-${timestamp}.png`;

        const downloadBlob = (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        // Prefer toBlob to avoid large base64 strings
        if (canvas.toBlob) {
            canvas.toBlob(downloadBlob, 'image/png');
        } else {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    }

    /**
     * Switch to a different registered screen.
     * @param {string} screenName 
     */
    switchScreen(screenName) {
        if (!this.screens[screenName]) {
            console.error(`Screen "${screenName}" not found.`);
            return;
        }

        // Cleanup current
        if (this.currentScreen && this.screens[this.currentScreen].cleanup) {
            this.screens[this.currentScreen].cleanup();
        }

        this.currentScreen = screenName;
        this.inputManager.setCurrentScreen(screenName);
    }

    /** Register multiple screens at once. */
    registerScreens(screensMap) {
        this.screens = { ...this.screens, ...screensMap };
        
        // Register input handlers for these screens
        Object.entries(screensMap).forEach(([name, screen]) => {
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
    }

    resize() {
        // Core engine resize only manages CRT state if needed 
        // Logic moved to CRTEffect.js resize
    }

    update(timestamp) {
        if (!this.isRunning) return;

        const delta = (timestamp - (this.lastTime || timestamp)) / 1000;
        this.lastTime = timestamp;
        
        // Update current screen
        if (this.currentScreen && this.screens[this.currentScreen].update) {
            this.screens[this.currentScreen].update(delta);
        }
        
        if (this.debugWindow.visible) {
            this.debugWindow.update(delta);
        }
    }

    draw() {
        if (!this.isRunning) return;

        // Clear hidden canvas
        this.canvasManager.clearScreen();

        // Draw current screen
        if (this.currentScreen && this.screens[this.currentScreen].draw) {
            this.screens[this.currentScreen].draw();
        }
        
        // Hook for subclasses to draw UI overlays before CRT
        this.onDrawOverlay();

        if (this.debugWindow.visible) {
            this.debugWindow.draw(this.ctx);
        }

        // Draw Recording Indicator
        if (this.crtEffect?.videoRecorder?.isRecording()) {
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Blinking red square
            if (Math.floor(performance.now() / 500) % 2 === 0) {
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(40, 40, 20, 20);
            }
            
            this.ctx.fillStyle = 'white';
            // Fallback font if Press Start 2P isn't loaded globally
            this.ctx.font = '20px "Press Start 2P", cursive';
            this.ctx.fillText('RECORDING', 75, 58);
            this.ctx.restore();
        }

        // Final output through CRT shader
        this.crtEffect.render(performance.now());

        if (this.pendingScreenshot) {
            this.pendingScreenshot = false;
            this.captureScreenshot();
        }
    }

    /** Hook for subclasses to draw elements on top of the screen before CRT processing. */
    onDrawOverlay() {}

    /** Start the game loop. */
    start() {
        this.isRunning = true;
        const loop = (timestamp) => {
            this.update(timestamp);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}
