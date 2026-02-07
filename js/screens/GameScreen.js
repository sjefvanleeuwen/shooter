import Player from '../player.js';
import { ParticleEngine, LaserEngine } from '../particleEngine.js';
import PatternFormation from '../PatternFormation.js';
import ImageBackgroundScroller from '../imageBackgroundScroller.js';
import { patterns } from '../patterns/formationPatterns.js';
import ShieldEffect from '../effects/ShieldEffect.js';

const ENABLE_AMBIENT_LIGHTING = false;

class GameScreen {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth;
        this.virtualHeight = options.virtualHeight;
        this.gameState = options.gameState;
        this.audioManager = options.audioManager;
        
        this.player = new Player(ctx, {
            virtualWidth: options.virtualWidth,
            virtualHeight: options.virtualHeight,
            audioManager: options.audioManager
        });

        this.bgScroller = new ImageBackgroundScroller(ctx, {
            virtualWidth: options.virtualWidth,
            virtualHeight: options.virtualHeight,
            viewportWidth: options.virtualWidth,
            checkerSize: 64,
            scrollSpeed: 100,
            offsetY: 0
        });

        this.initializeGameObjects();
        this.offCanvasCache = document.createElement('canvas');
    }

    initializeGameObjects() {
        this.player = new Player(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            speed: 300
        });

        // Initialize particle and laser engines
        this.particleEngine = new ParticleEngine(this.ctx);
        this.particleEngine2 = new ParticleEngine(this.ctx);
        this.particleEngine3 = new ParticleEngine(this.ctx);
        this.laserEngineLeft = new LaserEngine(this.ctx, this.audioManager);
        this.laserEngineRight = new LaserEngine(this.ctx, this.audioManager);

        this.shieldEffect = new ShieldEffect(this.ctx, this.audioManager);

        // Initialize user firepower
        this.updatePlayerFirepower(1);

        // Initialize formation with points callback
        const patternNames = Object.keys(patterns);
        const startPattern = patternNames[Math.floor(Math.random() * patternNames.length)];

        this.formation = new PatternFormation(this.ctx, {
            virtualWidth: this.virtualWidth,
            virtualHeight: this.virtualHeight,
            pattern: startPattern,
            audioManager: this.audioManager,
            shieldEffect: this.shieldEffect,
            onPointsScored: (points) => this.addPoints(points)
        });
    }

    handleInput(key) {
        this.player.handleInput(key);
    }

    update(delta) {
        this.bgScroller.update(delta);
        this.player.update(delta);
        
        this.shieldEffect.update(delta);
        this.updateParticles(delta);
        this.updateFormation(delta);
        this.checkCollisions();
    }

    updateParticles(delta) {
        // Update engine particles
        const centerX = this.player.x + this.player.width / 2;
        const engineY = this.player.y + this.player.height - 25;
        
        this.particleEngine.setEmitter(centerX, engineY);
        this.particleEngine2.setEmitter(centerX - 21, engineY - 20);
        this.particleEngine3.setEmitter(centerX + 21, engineY - 20);
        
        this.particleEngine.update(delta);
        this.particleEngine2.update(delta);
        this.particleEngine3.update(delta);

        // Update lasers
        const firing = this.player.isFiring;
        this.laserEngineLeft.setFiring(firing);
        this.laserEngineRight.setFiring(firing);
        
        const laserLeftX = this.player.x + this.player.width * 0.3;
        const laserRightX = this.player.x + this.player.width * 0.7;
        const laserY = this.player.y;
        
        this.laserEngineLeft.setEmitter(laserLeftX, laserY);
        this.laserEngineRight.setEmitter(laserRightX, laserY);
        
        this.laserEngineLeft.update(delta);
        this.laserEngineRight.update(delta);
    }

    updateFormation(delta) {
        this.formation.update(delta);
        if (this.formation.aliens.length === 0) {
            const nextDifficulty = this.formation.difficulty + 1;
            let nextPattern;

            // Delayed introduction of Big Boss: Level 7 instead of 5
            if (nextDifficulty >= 7 && nextDifficulty % 7 === 0) {
                // Boss wave every 7 levels
                nextPattern = 'boss_wave';
            } else {
                const patternNames = Object.keys(patterns).filter(p => p !== 'boss_wave');
                nextPattern = patternNames[Math.floor(Math.random() * patternNames.length)];
            }
            
            this.formation = new PatternFormation(this.ctx, {
                virtualWidth: this.virtualWidth,
                virtualHeight: this.virtualHeight,
                pattern: nextPattern,
                bgScroller: this.bgScroller,
                difficulty: nextDifficulty,
                audioManager: this.audioManager,
                shieldEffect: this.shieldEffect,
                onPointsScored: (points) => this.addPoints(points)
            });

            this.updatePlayerFirepower(nextDifficulty);
        }
    }

    updatePlayerFirepower(difficulty) {
        const baseRate = 4;
        const rateIncrease = 0.2; // Increase fire rate by 0.2 per level
        const newRate = baseRate + (difficulty - 1) * rateIncrease;
        
        // Cap the rate at 12 shots per second (reduced from 20)
        const cappedRate = Math.min(newRate, 12);
        
        this.laserEngineLeft.emissionRate = cappedRate;
        this.laserEngineRight.emissionRate = cappedRate;
    }

    checkCollisions() {
        // Check player collisions with formation lasers
        for (const laser of this.formation.lasers) {
            if (this.player.checkCollision(laser)) {
                this.handlePlayerHit();
                laser.life = 0;
                break;
            }
        }

        // Check lasers collision with formation
        [this.laserEngineLeft, this.laserEngineRight].forEach(engine => {
            engine.particles.forEach(laser => {
                const result = this.formation.checkCollision(laser.x, laser.y);
                if (result.hit) {
                    laser.life = 0;
                }
            });
        });
    }

    addPoints(points) {
        this.gameState.addPoints(points);
    }

    handlePlayerHit() {
        if (this.gameState.handlePlayerHit()) {
            window.game.gameOver();
        }
    }

    draw() {
        // Draw background
        this.bgScroller.draw();
        
        // Draw player with effects
        this.drawPlayer();
        
        // Draw formation
        this.formation.draw();
        
        // Draw effects
        this.shieldEffect.draw();
        
        // Draw particle effects
        this.laserEngineLeft.draw();
        this.laserEngineRight.draw();
        this.particleEngine.draw();
        this.particleEngine2.draw();
        this.particleEngine3.draw();
    }

    getActiveBoss() {
        if (!this.formation || !this.formation.aliens) return null;
        return this.formation.aliens.find(a => a.type === 'boss');
    }

    drawPlayer() {
        if (!this.player.img.complete) return;

        // Draw player shadow (Cached)
        if (this.player.shadowCache) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.7;
            // No filter needed here, it's baked in
            // The shadow cache includes padding and scaling
            // Original logic: x + 20, y - 50. 
            // Cache padding creates offset of -20,-20 relative to that origin.
            this.ctx.drawImage(
                this.player.shadowCache,
                this.player.x, // (x+20) - 20
                this.player.y - 70 // (y-50) - 20
            );
            this.ctx.restore();
        }

        // Draw player
        this.ctx.save();
        
        let drawSource = this.player.img;

        if (ENABLE_AMBIENT_LIGHTING) {
            // Draw player with background color effect
            const bgColor = this.bgScroller.getColorAt(
                this.player.x + this.player.width/2,
                this.player.y + this.player.height
            );

            const offCanvas = this.offCanvasCache;
            if (offCanvas.width !== this.player.img.width || offCanvas.height !== this.player.img.height) {
                offCanvas.width = this.player.img.width;
                offCanvas.height = this.player.img.height;
            }
            
            const offCtx = offCanvas.getContext('2d');
            offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
            offCtx.drawImage(this.player.img, 0, 0);
            offCtx.globalCompositeOperation = 'source-atop';
            offCtx.fillStyle = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, 0.33)`;
            offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
            
            drawSource = offCanvas;
        }

        if (this.gameState.playerInvulnerable) {
            this.ctx.globalAlpha = this.gameState.getInvulnerabilityAlpha();
        }
        
        this.ctx.drawImage(
            drawSource,
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height
        );
        this.ctx.restore();
    }
}

export default GameScreen;
