export default class Enemy {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 48;
        this.height = options.height || 48;
        this.color = options.color || '#ff3333';
        
        this.vx = options.vx || 100;
        this.vy = 0;
        this.speed = Math.abs(this.vx);
        
        this.health = 3;
        this.isDead = false;
        this.hitFlash = 0;
        
        this.state = 'patrol'; // patrol, chase
        this.detectionRange = 400;
        this.patrolRange = options.patrolRange || 200;
        this.startX = this.x;

        this.renderer = options.renderer;
        this.animTime = Math.random() * 10; // offset animation so they aren't in sync
    }

    update(dt, player) {
        if (this.isDead) return;

        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Simple AI
        const distToPlayer = Math.abs(player.x - this.x);
        
        if (distToPlayer < this.detectionRange && Math.abs(player.y - this.y) < 100) {
            this.state = 'chase';
        } else {
            this.state = 'patrol';
        }

        if (this.state === 'chase') {
            const dir = player.x > this.x ? 1 : -1;
            this.vx = dir * this.speed * 1.5;
        } else {
            // Patrol back and forth
            if (Math.abs(this.x - this.startX) > this.patrolRange) {
                const dir = this.x > this.startX ? -1 : 1;
                this.vx = dir * this.speed;
            }
        }

        this.x += this.vx * dt;
        this.animTime += dt;
    }

    takeDamage() {
        this.health--;
        this.hitFlash = 0.1;
        if (this.health <= 0) {
            this.isDead = true;
        }
        return this.isDead;
    }

    draw(ctx, cameraX) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(-cameraX, 0);
        
        // Draw 3D-generated sprite if renderer is available
        if (this.renderer && this.renderer.ready) {
            // "Sticky" facing for enemies
            if (this.vx > 0.1) this.lastFacing = 1;
            else if (this.vx < -0.1) this.lastFacing = -1;
            
            const facing = this.lastFacing || (this.vx > 0 ? 1 : -1);
            const animState = Math.abs(this.vx) > 1 ? 'walk' : 'idle';
            
            const frame = this.renderer.getFrame(animState, this.animTime);

            const drawW = 120;
            const drawH = 120;
            
            if (frame) {
                // Apply hit flash highlight
                if (this.hitFlash > 0) {
                    ctx.filter = 'brightness(3) contrast(2)';
                }

                ctx.save();
                if (facing < 0) {
                    ctx.translate(this.x + this.width / 2 + drawW / 2, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(frame, 0, this.y + this.height - drawH + 10, drawW, drawH);
                } else {
                    ctx.drawImage(
                        frame,
                        this.x + this.width / 2 - drawW / 2,
                        this.y + this.height - drawH + 10,
                        drawW,
                        drawH
                    );
                }
                ctx.restore();
                
                ctx.filter = 'none';
            }
        } else {
            // Draw body fallback
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Eye
            ctx.fillStyle = '#000';
            const eyeX = this.vx > 0 ? this.x + 30 : this.x + 8;
            ctx.fillRect(eyeX, this.y + 12, 10, 10);
        }

        // Health bar
        const healthPercent = Math.max(0, this.health / 3);
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 15, this.width, 5);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - 15, this.width * healthPercent, 5);

        ctx.restore();
    }
}
