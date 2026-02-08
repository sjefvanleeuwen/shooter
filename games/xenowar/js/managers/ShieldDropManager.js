import { GLBLoader } from '../../../../js/engine/GLBLoader.js';

export default class ShieldDropManager {
    constructor(gameScreen) {
        this.ctx = gameScreen.ctx;
        this.virtualWidth = gameScreen.virtualWidth;
        this.virtualHeight = gameScreen.virtualHeight;
        this.gameScreen = gameScreen;
        
        this.drops = [];
        this.shieldModel = null;
        this.initialized = false;
        
        this.dropTimer = 0;
        // Check for drops every 5 seconds
        this.checkInterval = 5; 
        
        this.initialize();
    }

    async initialize() {
        try {
            const data = await GLBLoader.load('games/xenowar/3d/shield_s.glb');
            if (this.ctx && this.ctx.create3DModel) {
                this.shieldModel = this.ctx.create3DModel(data);
                this.initialized = true;
                console.log('Shield 3D Model loaded successfully');
            }
        } catch (e) {
            console.error('Failed to load shield model:', e);
        }
    }

    spawnDrop() {
        // Only one drop at a time
        if (this.drops.length > 0) return;

        // Spawn at random X, top of screen
        const drop = {
            x: Math.random() * (this.virtualWidth - 100) + 50,
            y: -100,
            rotation: 0,
            speed: 150,
            active: true
        };
        this.drops.push(drop);
    }

    update(delta) {
        if (!this.initialized) return;

        // Only spawn when player has lost lives
        const lives = window.game?.gameState?.lives ?? 3;
        if (lives >= 3) {
            this.dropTimer = 0;
            return;
        }

        // Check if we need to spawn a drop
        this.dropTimer += delta;
        if (this.dropTimer >= this.checkInterval) {
            this.dropTimer = 0;
            // Random chance to drop (40%)
            if (Math.random() < 0.4) {
                this.spawnDrop();
            }
        }

        // Update active drops
        this.drops.forEach(drop => {
            drop.y += drop.speed * delta;
            drop.rotation += Math.PI * delta; // 180 degrees per second spin
            
            // Check collision with player
            if (drop.active && this.checkPlayerCollision(drop)) {
                drop.active = false;
                this.collectShield();
            }

            // Remove if off screen
            if (drop.y > this.virtualHeight + 100) {
                drop.active = false;
            }
        });

        // Filter inactive
        this.drops = this.drops.filter(d => d.active);
    }

    checkPlayerCollision(drop) {
        const player = this.gameScreen.player;
        if (!player) return false;
        
        const dx = drop.x - (player.x + player.width/2);
        const dy = drop.y - (player.y + player.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        return dist < (player.width/2 + 40); // 40 is approx shield radius
    }

    collectShield() {
        window.game.audioManager.playSound('energize-shields', { volume: 0.8, pitch: 1.0 });
        // Effect: Restore 1 life? Or just invulnerability?
        // User implied "shields are low", so let's give a life if possible, or just shield points?
        // GameStateManager has lives. Let's add a life.
        if (window.game.gameState.lives < 3) {
            window.game.gameState.lives++;
        }
        
        // Trigger visual effect
        if (this.gameScreen.shieldEffect) {
            this.gameScreen.shieldEffect.createRipple(
                this.gameScreen.player.x + this.gameScreen.player.width/2,
                this.gameScreen.player.y + this.gameScreen.player.height/2,
                '#00ffff', 
                150
            );
        }
    }

    draw() {
        if (!this.initialized || !this.ctx.draw3DModel) return;

        this.drops.forEach(drop => {
            // Draw 3D model
            // x, y, size, rotation
            // Scale down: 60 / 1.25 = 48
            this.ctx.draw3DModel(this.shieldModel, drop.x, drop.y, 36, drop.rotation); 
        });
    }
}
