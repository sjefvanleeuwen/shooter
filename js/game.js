import BackgroundScroller from './backgroundScroller.js';
import Player from './player.js';
import { ParticleEngine, LaserEngine } from './particleEngine.js';
import ImageBackgroundScroller from './imageBackgroundScroller.js';
import PatternFormation from './PatternFormation.js';  // Add this import
import IntroScreen from './screens/IntroScreen.js';

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

        // Initialize screens
        this.screens = {
            intro: new IntroScreen(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                bgScroller: this.bgScroller
            }),
            game: null // Will be initialized when switching to game state
        };
        
        this.currentScreen = 'intro';
        
        // Move game-specific initialization to initGameScreen method
        this.initGameScreen();
        
        // Setup input handling for screens
        window.addEventListener('keydown', (e) => this.handleInput(e));
        
        // Start the game loop
        this.startGameLoop();

        this.playerHit = false;
        this.playerInvulnerable = false;
        this.invulnerabilityTime = 2.0;
        this.invulnerabilityTimer = 0;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.lives = 3;
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
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    reset() {
        this.setupCanvas();
        // Reposition player at center bottom of the virtual game area, raised 50px.
        this.player.x = (this.virtualWidth - this.player.width) / 2;
        this.player.y = this.virtualHeight - this.player.height - 20 - 50;
    }

    handleInput(e) {
        const nextScreen = this.screens[this.currentScreen].handleInput(e.key);
        if (nextScreen) {
            this.switchScreen(nextScreen);
        }
    }

    switchScreen(screenName) {
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

        // Update current screen
        if (this.currentScreen === 'intro') {
            this.screens.intro.update(delta);
        } else if (this.currentScreen === 'game') {
            this.bgScroller.update(delta);
            this.player.update(delta);
            // Update emitter positions relative to the player's sprite.
            const engine1X = this.player.x + this.player.width / 2;
            const engine1Y = this.player.y + this.player.height - 25; // was 50
            // For engine 2 and 3, adjust: 10px down and 8px inward.
            const engine2X = engine1X - 25 + 4;  // was 50+8
            const engine2Y = engine1Y - 25 + 5;  // was 50+10
            const engine3X = engine1X + 25 - 4;  // was 50-8
            const engine3Y = engine1Y - 25 + 5;  // was 50+10
            this.particleEngine.setEmitter(engine1X, engine1Y);
            this.particleEngine2.setEmitter(engine2X, engine2Y);
            this.particleEngine3.setEmitter(engine3X, engine3Y);
            // Update particle engines with the new emitter positions.
            this.particleEngine.update(delta);
            this.particleEngine2.update(delta);
            this.particleEngine3.update(delta);
            
            // Update laser firing state
            this.laserEngineLeft.setFiring(this.player.isFiring);
            this.laserEngineRight.setFiring(this.player.isFiring);
            
            // Update laser emitter positions (from top of sprite, spread apart)
            const laserLeftX = this.player.x + this.player.width * 0.3; // 30% from left
            const laserRightX = this.player.x + this.player.width * 0.7; // 70% from left
            const laserY = this.player.y; // Top of sprite
            
            this.laserEngineLeft.setEmitter(laserLeftX, laserY);
            this.laserEngineRight.setEmitter(laserRightX, laserY);
            
            this.laserEngineLeft.update(delta);
            this.laserEngineRight.update(delta);
            
            this.formation.update(delta);

            // Check player collision with alien lasers
            if (this.formation.checkPlayerCollision(
                this.player.x, 
                this.player.y,
                this.player.width,
                this.player.height
            )) {
                this.handlePlayerHit();
            }

            // Check laser collisions with aliens
            if (this.laserEngineLeft) {
                this.laserEngineLeft.particles.forEach(laser => {
                    if (this.formation.checkCollision(laser.x, laser.y)) {
                        laser.life = 0; // Destroy laser on hit
                    }
                });
            }
            if (this.laserEngineRight) {
                this.laserEngineRight.particles.forEach(laser => {
                    if (this.formation.checkCollision(laser.x, laser.y)) {
                        laser.life = 0; // Destroy laser on hit
                    }
                });
            }

            // Check if all aliens are destroyed
            if (this.formation.aliens.length === 0) {
                // Create new formation with increased difficulty
                this.formation = new PatternFormation(this.ctx, {
                    virtualWidth: this.virtualWidth,
                    virtualHeight: this.virtualHeight,
                    pattern: 'infinity',
                    bgScroller: this.bgScroller,
                    difficulty: this.formation.difficulty + 1
                });
            }

            // Handle invulnerability
            if (this.playerInvulnerable) {
                this.invulnerabilityTimer += delta;
                if (this.invulnerabilityTimer >= this.invulnerabilityTime) {
                    this.playerInvulnerable = false;
                    this.invulnerabilityTimer = 0;
                }
            }
        }
    }

    draw() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

        // Draw current screen
        if (this.currentScreen === 'intro') {
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
                // Create an offscreen canvas to tint the image
                const offCanvas = document.createElement('canvas');
                offCanvas.width = this.player.img.width;
                offCanvas.height = this.player.img.height;
                const offCtx = offCanvas.getContext('2d');
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
    }

    drawHUD() {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px "Press Start 2P"';  // Smaller size due to pixel font
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, 30);
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 60);
        this.ctx.fillText(`HIGH SCORE: ${this.highScore}`, 20, 90);
        this.ctx.restore();
    }

    addPoints(points) {
        console.log('Adding points:', points); // Debug log
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString());
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
