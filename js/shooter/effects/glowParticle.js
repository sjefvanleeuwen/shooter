class GlowParticleEffect {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
    }

    emit(x, y) {
        // Reduce emission chance from 20% to 5%
        if (Math.random() < 0.05) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.05; // Even slower movement
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 0.4, // Lower initial alpha
                radius: Math.random() * 25 + 20 // Single large particle (20-45px)
            });
        }
    }

    update(delta) {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.2 * delta; // Slower fade out
        });
        // Keep only the 3 most recent particles
        this.particles = this.particles
            .filter(p => p.alpha > 0)
            .slice(-3);
    }

    draw() {
        this.ctx.save();
        this.ctx.filter = 'blur(12px)'; // Increased blur
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            // Acid green color with higher saturation
            this.ctx.fillStyle = `rgba(130,255,50, ${p.alpha})`;
            this.ctx.fill();
        });
        this.ctx.restore();
    }
}

export default GlowParticleEffect;
