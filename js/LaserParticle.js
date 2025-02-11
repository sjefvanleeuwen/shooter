class AlienLaser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 16;
        this.vy = 600;  // Moving downward
        this.life = 2.0;
        this.maxLife = this.life;
    }

    update(delta) {
        this.y += this.vy * delta;
        this.life -= delta;
    }

    draw(ctx) {
        ctx.save();
        const alpha = Math.max(this.life / this.maxLife, 0);
        
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x, this.y + this.height
        );
        
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        ctx.restore();
    }
}

export default AlienLaser;
