class ExplosionParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 150 + 50; // Reduced speed range
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = Math.random() * 0.4 + 0.3; // Shorter life: 0.3 to 0.7 seconds
        this.maxLife = this.life;
        this.radius = Math.random() * 8 + 4; // Smaller particles: 4-12px

        // Brighter neon green
        this.hue = Math.random() * 15 + 90; // Tighter hue range
        this.saturation = 100;
        this.brightness = Math.random() * 10 + 90; // Even brighter: 90-100%
        
        // Tighter glow
        this.pulseSpeed = Math.random() * 10 + 8;
        this.glowSize = Math.random() * 1.5 + 1.5; // 1.5-3x size glow
    }

    update(delta) {
        this.x += this.vx * delta;
        this.y += this.vy * delta;
        this.life -= delta;
        this.vy += 100 * delta; // Less gravity
        this.radius *= 0.95; // Faster shrink
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * 2.0; // Even brighter
        const pulse = 1 + Math.sin(this.life * this.pulseSpeed) * 0.3;
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Outer glow
        ctx.globalAlpha = alpha * 0.5;
        ctx.filter = 'blur(8px)';
        ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.glowSize * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Middle glow
        ctx.globalAlpha = alpha * 0.7;
        ctx.filter = 'blur(4px)';
        ctx.fillStyle = `hsla(${this.hue}, 100%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.globalAlpha = alpha;
        ctx.filter = 'none';
        ctx.fillStyle = `hsla(${this.hue}, 100%, 100%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class ExplosionEffect {
    constructor(ctx) {
        this.ctx = ctx;
        this.explosions = [];
    }

    createExplosion(x, y) {
        const particles = [];
        // Fewer particles
        for (let i = 0; i < 15; i++) {
            particles.push(new ExplosionParticle(x, y));
        }
        // Just 3 highlight particles
        for (let i = 0; i < 3; i++) {
            const p = new ExplosionParticle(x, y);
            p.radius *= 1.5; // Not as huge
            p.life *= 1.2;
            particles.push(p);
        }
        this.explosions.push(particles);
    }

    update(delta) {
        this.explosions.forEach(particles => {
            particles.forEach(p => p.update(delta));
        });
        // Remove finished explosions
        this.explosions = this.explosions.filter(particles => 
            particles.some(p => p.life > 0)
        );
    }

    draw() {
        this.explosions.forEach(particles => {
            particles.forEach(p => p.draw(this.ctx));
        });
    }
}

export default ExplosionEffect;
