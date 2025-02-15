import BackgroundScroller from './backgroundScroller.js';
import Player from './player.js';
import { ParticleEngine, LaserEngine } from './particleEngine.js';
import ImageBackgroundScroller from './imageBackgroundScroller.js';
import PatternFormation from './PatternFormation.js';  // Add this import
import IntroScreen from './screens/IntroScreen.js';
import MusicPlayer from './audio/MusicPlayer.js';
import StartupScreen from './screens/StartupScreen.js';
import DebugWindow from './DebugWindow.js';

class Game {
    constructor() {
        // Make the game instance globally accessible
        window.game = this;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.bindEvents();
        // Force a resize event to immediately update offsets.
        window.dispatchEvent(new Event('resize'));
        
        // Virtual resolution setup - now square
        this.virtualWidth = 1080;  // Changed from 1920 to match height
        this.virtualHeight = 1080; // Keeping this the same
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
            game: null // Will be initialized when switching to game state
        };
        
        this.currentScreen = 'startup';
        
        // Setup input handling for screens AFTER screens are initialized
        window.addEventListener('keydown', (e) => this.handleInput(e));

        // Move initGameScreen AFTER screens initialization
        this.initGameScreen();
        
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

    initGameScreen() {
        // Move all game-specific initialization here
        this.player = new Player(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            speed: 300
        });
        // Create original ParticleEngine instance.
        this.particleEngine = new ParticleEngine(this.ctx);
        // Create two additional particle engines.
        this.particleEngine2 = new ParticleEngine(this.ctx);
        this.particleEngine3 = new ParticleEngine(this.ctx);
        // Create laser engines for left and right guns
        this.laserEngineLeft = new LaserEngine(this.ctx);
        this.laserEngineRight = new LaserEngine(this.ctx);
        // Create the formation
        this.formation = new PatternFormation(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            pattern: 'infinity'  // Use the infinity pattern
        });
        // Reset overall game positions.
        this.reset();
        this.score = 0;
        this.lives = 3;
        this.playerHit = false;
        this.playerInvulnerable = false;
        this.invulnerabilityTimer = 0;
    }

    handlePlayerHit() {
        if (!this.playerInvulnerable) {
            this.lives--;
            this.playerHit = true;
            this.playerInvulnerable = true;
            
            if (this.lives <= 0) {
                this.gameOver();
            }
        }
    }

    gameOver() {
        // Switch to intro screen with game over flag
        this.screens.intro = new IntroScreen(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            bgScroller: this.bgScroller,
            isGameOver: true,
            finalScore: this.score,
            highScore: this.highScore
        });
        this.currentScreen = 'intro';
    }

    setupCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        // Use the smaller scale to maintain a strict 1:1 ratio
        this.scale = Math.min(displayWidth / this.virtualWidth, displayHeight / this.virtualHeight);
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        // Center the game area horizontally and vertically.
        this.offsetX = (displayWidth - (this.virtualWidth * this.scale)) / 2;
        this.offsetY = (displayHeight - (this.virtualHeight * this.scale)) / 2;
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    }

    bindEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
            }, 100);
        });
    }
    
    reset() {
        this.setupCanvas();
        // Reposition player at center bottom of the virtual game area, raised 50px.
        this.player.x = (this.virtualWidth - this.player.width) / 2;
        this.player.y = this.virtualHeight - this.player.height - 20 - 50;
    }

    handleInput(e) {
        // Toggle debug window when d is pressed
        if(e.key === 'd' || e.key === 'D'){
            this.debugWindow.visible = !this.debugWindow.visible;
        }
        // Add null check for current screen
        if (this.screens[this.currentScreen] && this.screens[this.currentScreen].handleInput) {
            const nextScreen = this.screens[this.currentScreen].handleInput(e.key);
            if (nextScreen) {
                this.switchScreen(nextScreen);
            }
        }
    }

    switchScreen(screenName) {
        // Start music when transitioning from startup to intro
        if (this.currentScreen === 'startup' && screenName === 'intro') {
            this.musicPlayer.start().then(() => {
                this.musicPlayer.fadeIn(3);
            });
        }

        // Fade out music when going to game over
        if (screenName === 'intro' && this.screens[this.currentScreen]?.isGameOver) {
            this.musicPlayer.fadeOut(2);
        }

        // Cleanup current screen if it exists
        if (this.screens[this.currentScreen]?.cleanup) {
            this.screens[this.currentScreen].cleanup();
        }

        if (screenName === 'game' && !this.screens.game) {
            this.initGameScreen();
        }
        this.currentScreen = screenName;
    }

    update(timestamp) {
        const delta = (timestamp - (this.lastTime || timestamp)) / 1000;
        this.lastTime = timestamp;
        
        if (this.currentScreen === 'game') {
            // Cache properties to avoid repeated lookups
            const player = this.player;
            const formation = this.formation;
            
            this.bgScroller.update(delta);
            player.update(delta);
            
            // Update emitter positions with local variables
            const engine1X = player.x + player.width / 2;
            const engine1Y = player.y + player.height - 25;
            const engine2X = engine1X - 21;   // simplified math
            const engine2Y = engine1Y - 20;
            const engine3X = engine1X + 21;
            const engine3Y = engine1Y - 20;
            
            this.particleEngine.setEmitter(engine1X, engine1Y);
            this.particleEngine2.setEmitter(engine2X, engine2Y);
            this.particleEngine3.setEmitter(engine3X, engine3Y);
            this.particleEngine.update(delta);
            this.particleEngine2.update(delta);
            this.particleEngine3.update(delta);
            
            // Update lasers using cached firing state
            const firing = player.isFiring;
            this.laserEngineLeft.setFiring(firing);
            this.laserEngineRight.setFiring(firing);
            const laserLeftX = player.x + player.width * 0.3;
            const laserRightX = player.x + player.width * 0.7;
            const laserY = player.y;
            this.laserEngineLeft.setEmitter(laserLeftX, laserY);
            this.laserEngineRight.setEmitter(laserRightX, laserY);
            
            this.laserEngineLeft.update(delta);
            this.laserEngineRight.update(delta);
            
            formation.update(delta);
            
            // Collision detection using cached player bounds
            const px = player.x, py = player.y, pw = player.width, ph = player.height;
            for (const laser of formation.lasers) {
                if (laser.x >= px && laser.x <= px + pw &&
                    laser.y >= py && laser.y <= py + ph) {
                    if (player.checkPixelCollision(laser.x, laser.y)) {
                        this.handlePlayerHit();
                        laser.life = 0;
                        break;
                    }
                }
            }
            
            // Check collisions for player lasers
            [this.laserEngineLeft, this.laserEngineRight].forEach(engine => {
                engine.particles.forEach(laser => {
                    if (formation.checkCollision(laser.x, laser.y)) {
                        laser.life = 0;
                    }
                });
            });
            
            if (formation.aliens.length === 0) {
                this.formation = new PatternFormation(this.ctx, {
                    virtualWidth: this.virtualWidth,
                    virtualHeight: this.virtualHeight,
                    pattern: 'infinity',
                    bgScroller: this.bgScroller,
                    difficulty: formation.difficulty + 1
                });
            }
            
            if (this.playerInvulnerable) {
                this.invulnerabilityTimer += delta;
                if (this.invulnerabilityTimer >= this.invulnerabilityTime) {
                    this.playerInvulnerable = false;
                    this.invulnerabilityTimer = 0;
                }
            }
        } else {
            // ...existing screen update code...
            // Check if startup screen is complete
            if (this.currentScreen === 'startup') {
                this.screens.startup.update(delta);
                if (this.screens.startup.complete) {
                    this.switchScreen('intro');
                }
            } else if (this.currentScreen === 'intro') {
                this.screens.intro.update(delta);
            }
        }
        if(this.debugWindow.visible){
            this.debugWindow.update(delta);
        }
    }

    draw() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#000000'; // Changed from #333333 to pure black
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

        // Draw current screen
        if (this.currentScreen === 'startup') {
            this.screens.startup.draw();
        } else if (this.currentScreen === 'intro') {
            this.screens.intro.draw();
        } else if (this.currentScreen === 'game') {
            // 1. Draw background
            this.bgScroller.draw(this.scale);
            
            if (this.player.img.complete) {
                // Draw darker and higher player shadow with halved offsets
                this.ctx.save();
                this.ctx.globalAlpha = 0.7;          // Much darker (was 0.4)
                this.ctx.filter = 'blur(15px) brightness(0)';
                this.ctx.drawImage(
                    this.player.img,
                    this.player.x + 20,      // Halved from 40
                    this.player.y - 50,      // Halved from -100
                    this.player.width * 1.2,
                    this.player.height * 1.2
                );
                this.ctx.restore();

                // Sample background color near the player
                const bgColor = this.bgScroller.getColorAt(
                    this.player.x + this.player.width/2,
                    this.player.y + this.player.height
                );

                // Draw player with radiosity effect applied directly on the player's image
                // Use offCanvasCache instead of creating a new canvas each frame
                const offCanvas = this.offCanvasCache;
                offCanvas.width = this.player.img.width;
                offCanvas.height = this.player.img.height;
                const offCtx = offCanvas.getContext('2d');
                offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
                offCtx.drawImage(this.player.img, 0, 0);
                offCtx.globalCompositeOperation = 'source-atop';
                offCtx.fillStyle = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, 0.33)`;
                offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
                this.ctx.save();
                if (this.playerInvulnerable) {
                    this.ctx.globalAlpha = 0.5 + Math.sin(this.invulnerabilityTimer * 10) * 0.3;
                }
                this.ctx.drawImage(
                    offCanvas,
                    this.player.x,
                    this.player.y,
                    this.player.width,
                    this.player.height
                );
                this.ctx.restore();
            }

            // Draw formation after background but before particles
            this.formation.draw();

            // 4. Draw effects
            this.laserEngineLeft.draw();
            this.laserEngineRight.draw();
            this.particleEngine.draw();
            this.particleEngine2.draw();
            this.particleEngine3.draw();

            // Draw HUD if in game screen
            this.drawHUD();
        }
        
        // Draw debug window if enabled
        if(this.debugWindow.visible){
            this.debugWindow.draw(this.ctx);
        }
    }

    drawHUD() {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px "Press Start 2P"';

        // Lives at bottom left
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, this.virtualHeight - 20);

        // High Score at bottom center
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`HIGH SCORE: ${this.highScore}`, this.virtualWidth / 2, this.virtualHeight - 20);

        // Score at bottom right
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${this.score}`, this.virtualWidth - 20, this.virtualHeight - 20);

        this.ctx.restore();
    }

    addPoints(points) {
        console.log('Adding points:', points); // Debug log
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString()); // Store high score to local storage
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
