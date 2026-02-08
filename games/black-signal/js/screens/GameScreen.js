import Enemy from '../entities/Enemy.js';

export default class GameScreen {
    constructor(ctx, options) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth;
        this.virtualHeight = options.virtualHeight;

        // Player properties
        this.player = {
            x: 200,
            y: 800,
            width: 64,
            height: 64,
            vx: 0,
            vy: 0,
            speed: 400,
            jumpForce: -1200,
            onGround: false,
            color: '#00ffcc',
            health: 10,
            maxHealth: 10,
            invuln: 0,
            attackCooldown: 0
        };

        this.pulses = []; // Player projectiles
        this.enemies = [
            new Enemy(ctx, { x: 800, y: 852, patrolRange: 300 }),
            new Enemy(ctx, { x: 1500, y: 852, patrolRange: 400 }),
            new Enemy(ctx, { x: 2000, y: 652, patrolRange: 100 }), // On a platform area
            new Enemy(ctx, { x: 2800, y: 852, patrolRange: 500 })
        ];

        this.gravity = 2500;
        this.groundY = 900;
        this.cameraX = 0;

        // Moving Platforms
        this.platforms = [
            { x: 400, y: 700, w: 200, h: 32, vx: 150, vy: 0, range: 400, startX: 400, startY: 700 },
            { x: 1000, y: 550, w: 200, h: 32, vx: 0, vy: 100, range: 200, startX: 1000, startY: 550 },
            { x: 1600, y: 700, w: 200, h: 32, vx: -200, vy: 0, range: 500, startX: 1600, startY: 700 },
            { x: 2200, y: 500, w: 250, h: 32, vx: 120, vy: 50, range: 300, startX: 2200, startY: 500 }
        ];

        this.onPlatform = null; // Track if player is on a specific platform

        // Parallax Layers (from back to front)
        this.layers = [
            { 
                name: 'mountains', 
                scrollFactor: 0.2, 
                color: '#1a1a2e', 
                elements: this.generateRocks(10, 300, 600, 400) 
            },
            { 
                name: 'trees', 
                scrollFactor: 0.5, 
                color: '#162416', 
                elements: this.generateRocks(20, 40, 100, 250) 
            },
            { 
                name: 'world', 
                scrollFactor: 1.0, 
                color: '#333', 
                elements: [] // Main objects go here if we had them
            },
            { 
                name: 'grass', 
                scrollFactor: 1.5, 
                color: '#2d5a27', 
                elements: this.generateRocks(30, 10, 30, 50) 
            }
        ];
    }

    generateRocks(count, minW, maxW, maxH) {
        const elements = [];
        const spacing = 6000 / count;
        for (let i = 0; i < count; i++) {
            elements.push({
                x: i * spacing + Math.random() * spacing,
                w: minW + Math.random() * (maxW - minW),
                h: 50 + Math.random() * maxH,
            });
        }
        return elements;
    }

    update(dt) {
        // Update Timers
        if (this.player.invuln > 0) this.player.invuln -= dt;
        if (this.player.attackCooldown > 0) this.player.attackCooldown -= dt;

        // Update Platforms
        this.platforms.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Simple oscillation
            if (p.vx !== 0 && Math.abs(p.x - p.startX) > p.range) {
                p.vx *= -1;
                p.x = p.startX + Math.sign(p.x - p.startX) * p.range;
            }
            if (p.vy !== 0 && Math.abs(p.y - p.startY) > p.range) {
                p.vy *= -1;
                p.y = p.startY + Math.sign(p.y - p.startY) * p.range;
            }
        });

        // Horizontal Movement
        const input = window.game?.inputManager;
        if (!input || !input.keys) return;
        
        this.player.vx = 0;
        if (input.keys.has('ArrowLeft') || input.keys.has('a')) this.player.vx = -this.player.speed;
        if (input.keys.has('ArrowRight') || input.keys.has('d')) this.player.vx = this.player.speed;

        // Attack (Pulse)
        if ((input.keys.has('f') || input.keys.has('j') || input.keys.has('Shift')) && this.player.attackCooldown <= 0) {
            this.shootPulse();
        }

        // Jump
        if ((input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has(' ')) && this.player.onGround) {
            this.player.vy = this.player.jumpForce;
            this.player.onGround = false;
            this.onPlatform = null;
        }

        // Physics
        this.player.vy += this.gravity * dt;
        
        // Apply platform velocity if riding
        if (this.onPlatform) {
            this.player.x += (this.player.vx + this.onPlatform.vx) * dt;
            this.player.y += this.onPlatform.vy * dt;
        } else {
            this.player.x += this.player.vx * dt;
        }
        
        // Base vertical movement (gravity/velocity)
        if (!this.onPlatform) {
            this.player.y += this.player.vy * dt;
        }

        // Collision Checks
        let wasOnGround = this.player.onGround;
        this.player.onGround = false;
        let currentPlatform = null;

        // Platform Collisions (One-way: fall through from bottom)
        if (this.player.vy >= 0) { // Only collide when falling or stationary vertically
            for (const p of this.platforms) {
                const px = this.player.x + this.player.width * 0.2; // Narrower collision box for player
                const pw = this.player.width * 0.6;
                
                if (px < p.x + p.w &&
                    px + pw > p.x &&
                    this.player.y + this.player.height >= p.y &&
                    this.player.y + this.player.height <= p.y + p.h + this.player.vy * dt + 10) {
                    
                    this.player.y = p.y - this.player.height;
                    this.player.vy = 0;
                    this.player.onGround = true;
                    currentPlatform = p;
                    break;
                }
            }
        }
        this.onPlatform = currentPlatform;

        // World Bounds / Floor
        if (this.player.y + this.player.height > this.groundY) {
            this.player.y = this.groundY - this.player.height;
            this.player.vy = 0;
            this.player.onGround = true;
            this.onPlatform = null;
        }

        // Update Projectiles
        this.pulses.forEach((pulse, index) => {
            pulse.x += pulse.vx * dt;
            pulse.life -= dt;
            if (pulse.life <= 0) this.pulses.splice(index, 1);
            
            // Check hit enemies
            this.enemies.forEach(enemy => {
                if (!enemy.isDead && 
                    pulse.x < enemy.x + enemy.width &&
                    pulse.x + 20 > enemy.x &&
                    pulse.y < enemy.y + enemy.height &&
                    pulse.y + 20 > enemy.y) {
                    
                    enemy.takeDamage();
                    pulse.life = 0; // Destroy pulse on hit
                }
            });
        });

        // Update Enemies
        this.enemies.forEach(enemy => {
            if (enemy.isDead) return;
            enemy.update(dt, this.player);

            // Check hit player
            if (this.player.invuln <= 0 &&
                this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                
                this.player.health--;
                this.player.invuln = 1.0; // 1 second invuln
                this.player.vy = -600; // Knockback jump
                this.player.vx = (this.player.x < enemy.x ? -1 : 1) * 400;
            }
        });

        // Camera follow
        const targetCamX = this.player.x - this.virtualWidth / 2;
        this.cameraX += (targetCamX - this.cameraX) * 0.1;
    }

    shootPulse() {
        const dir = (this.player.vx >= 0) ? 1 : -1;
        this.pulses.push({
            x: this.player.x + (dir > 0 ? this.player.width : -20),
            y: this.player.y + this.player.height / 2 - 10,
            vx: dir * 800,
            life: 1.5
        });
        this.player.attackCooldown = 0.3;
    }

    draw() {
        // Clear background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

        // Draw Layers (Mountains and Trees are behind)
        this.drawParallaxLayer(this.layers.find(l => l.name === 'mountains'));
        this.drawParallaxLayer(this.layers.find(l => l.name === 'trees'));

        // Main World
        this.drawGround();
        this.drawPlatforms();
        this.drawEnemies();
        this.drawPulses();
        this.drawPlayer();

        // Foreground (Grass is in front)
        this.drawParallaxLayer(this.layers.find(l => l.name === 'grass'));
        
        // UI Overlay (Optional)
        this.drawUI();
    }

    drawEnemies() {
        this.enemies.forEach(enemy => enemy.draw(this.ctx, this.cameraX));
    }

    drawPulses() {
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffcc';
        this.pulses.forEach(pulse => {
            this.ctx.fillRect(pulse.x, pulse.y, 20, 20);
        });
        this.ctx.restore();
    }

    drawUI() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('SIGNAL: STABLE', 40, 60);
        
        // Health Bar UI
        const hbWidth = 300;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(40, 80, hbWidth, 20);
        this.ctx.fillStyle = this.player.health > 3 ? '#00ffcc' : '#ff3333';
        this.ctx.fillRect(40, 80, hbWidth * (Math.max(0, this.player.health) / this.player.maxHealth), 20);
    }

    drawParallaxLayer(layer) {
        this.ctx.fillStyle = layer.color;
        const worldWidth = 6000;
        
        layer.elements.forEach(el => {
            // Calculate screen position with wrapping
            let x = (el.x - this.cameraX * layer.scrollFactor) % worldWidth;
            if (x < -el.w) x += worldWidth;
            if (x > this.virtualWidth) x -= worldWidth;

            this.ctx.fillRect(x, this.groundY - el.h, el.w, el.h);
        });
    }

    drawGround() {
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        // Segmented ground
        const segmentSize = 256;
        const startVisible = Math.floor(this.cameraX / segmentSize);
        const endVisible = Math.ceil((this.cameraX + this.virtualWidth) / segmentSize);

        for (let i = startVisible; i <= endVisible; i++) {
            this.ctx.fillStyle = i % 2 === 0 ? '#111' : '#151515';
            this.ctx.fillRect(i * segmentSize, this.groundY, segmentSize, this.virtualHeight - this.groundY);
            
            // Grid line
            this.ctx.strokeStyle = '#222';
            this.ctx.strokeRect(i * segmentSize, this.groundY, segmentSize, this.virtualHeight - this.groundY);
        }
        this.ctx.restore();
    }

    drawPlatforms() {
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        this.platforms.forEach(p => {
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(p.x + 5, p.y + 5, p.w, p.h);

            // Platform Body
            this.ctx.fillStyle = '#444';
            this.ctx.fillRect(p.x, p.y, p.w, p.h);

            // Tech highlight
            this.ctx.strokeStyle = '#00ffcc';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, p.y, p.w, p.h);
            
            // "Signal" pattern on platform
            this.ctx.fillStyle = '#00ffcc22';
            const blocks = 4;
            const blockW = p.w / blocks;
            for(let i = 0; i < blocks; i++) {
                if ((Math.floor(p.x / 50) + i) % 2 === 0) {
                    this.ctx.fillRect(p.x + i * blockW, p.y, blockW, p.h);
                }
            }
        });
        
        this.ctx.restore();
    }

    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        // Blink if invuln
        if (this.player.invuln > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
        }

        // Inner glow for "Black Signal" look
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.player.color;
        
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Eyes/Detail for the block
        this.ctx.fillStyle = '#000';
        const eyeX = (this.player.vx >= 0) ? this.player.x + 40 : this.player.x + 10;
        this.ctx.fillRect(eyeX, this.player.y + 15, 10, 10);
        
        this.ctx.restore();
    }

    handleInput() {}
}
