class PowerShield {
    constructor(x, y, radius, color = '#00aaff', audioManager = null) {
        this.x = x;
        this.y = y;
        this.baseRadius = radius;
        this.radius = radius * 0.8;
        this.maxRadius = radius * 1.3;
        this.life = 1.0;
        this.speed = 200; // Slow outward "pulse"
        this.color = color;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 5;

        // Play shield hit sound with random pitch and panning
        if (audioManager) {
            const pan = (x / 1024) * 2 - 1; // 1024 is virtualWidth
             // Determine which sound to play based on color/type
             // Orange = Player shield
             const isPlayer = color === '#ffaa00' || color === '#ff8800';
             const soundKey = isPlayer ? 'player-forcefield' : 'forcefield';
             const volume = isPlayer ? 0.6 : 0.4;
             
            audioManager.playSound(soundKey, {
                volume: volume,
                pitch: 0.8 + Math.random() * 0.4, // Random pitch between 0.8 and 1.2
                pan: pan
            });
        }
    }

    update(delta) {
        // Expand slightly and fade out
        this.radius += (this.maxRadius - this.radius) * 10 * delta;
        this.life -= 2.5 * delta; // Quick 0.4s flash
        this.rotation += this.rotationSpeed * delta;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Use a mix of the themed color and high-energy white
        ctx.fillStyle = this.color;
        
        // Draw the main shield ring
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        // Draw slightly larger than the ship to "surround" it
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw a second shimmer ring for plasma effect
        ctx.globalAlpha = this.life * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

export default class ShieldEffect {
    constructor(ctx, audioManager = null) {
        this.ctx = ctx;
        this.audioManager = audioManager;
        this.shields = [];
    }

    createRipple(x, y, color, size = 60) {
        this.shields.push(new PowerShield(x, y, size, color, this.audioManager));
    }

    update(delta) {
        this.shields = this.shields.filter(s => s.update(delta));
    }

    draw() {
        this.shields.forEach(s => s.draw(this.ctx));
    }
}
