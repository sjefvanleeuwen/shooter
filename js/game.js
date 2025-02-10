import BackgroundScroller from './backgroundScroller.js';
import Player from './player.js';
import { ParticleEngine, LaserEngine } from './particleEngine.js';
import ImageBackgroundScroller from './imageBackgroundScroller.js';

class Game {
    constructor() {
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
        // Create the Player entity.
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
        // Reset overall game positions.
        this.reset();
        // Start the game loop.
        this.startGameLoop();
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

    update(timestamp) {
        if (!this.lastTime) {
            this.lastTime = timestamp;
        }
        const delta = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
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
    }

    draw() {
        // Clear and setup transform
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
        
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
            
            // Draw player with radiosity effect
            this.ctx.save();
            
            // Draw base sprite
            this.ctx.drawImage(
                this.player.img,
                this.player.x,
                this.player.y,
                this.player.width,
                this.player.height
            );
            
            // Apply color influence using source-atop to respect transparency
            this.ctx.globalCompositeOperation = 'source-atop';
            this.ctx.fillStyle = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, 0.6)`;
            this.ctx.fillRect(
                this.player.x,
                this.player.y,
                this.player.width,
                this.player.height
            );
            
            this.ctx.restore();
        }

        // 4. Draw effects
        this.laserEngineLeft.draw();
        this.laserEngineRight.draw();
        this.particleEngine.draw();
        this.particleEngine2.draw();
        this.particleEngine3.draw();
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
