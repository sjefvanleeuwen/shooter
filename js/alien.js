class Alien {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.type = options.type || 'normal';
        this.width = options.width || 100;
        this.height = options.height || 100;

        // Difficulty/Type adjustments
        if (this.type === 'elite') {
            this.width *= 1.5;
            this.height *= 1.5;
            this.health = 8; // Slightly reduced from 12 for better pacing
            this.maxHealth = 8;
        } else if (this.type === 'kamikaze') {
            this.health = 1;
        } else if (this.type === 'boss') {
            this.width = 400; // Explicitly large for boss
            this.height = 400;
            this.health = 75; // Reduced from 100 to make spark effects more meaningful without being tedious
            this.maxHealth = 75;
        }

        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080;
        
        // Position will be set by the formation manager
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Movement properties
        this.speed = options.speed || 100;
        this.direction = 1; // 1 for right, -1 for left
        this.health = options.health || (this.type === 'normal' ? 1 : this.health);
        this.isKamikaze = this.type === 'kamikaze';
        this.hitFlash = 0;
        
        // Update sprite path to match processed file
        this.img = new Image();
        this.img.src = './sprites/alien1.png';  // Updated path
    }

    update(delta) {
        // Position is usually set by PatternFormation, 
        // but we can add specific behaviors here if needed
        if (this.hitFlash > 0) {
            this.hitFlash -= delta;
        }
    }

    draw() {
        const ctx = this.ctx;
        if (this.img.complete) {
            ctx.save();
            
            // Base filter for the alien type
            let baseFilter = 'none';
            if (this.type === 'elite') {
                baseFilter = 'hue-rotate(90deg) brightness(1.2)';
            } else if (this.type === 'kamikaze') {
                baseFilter = 'hue-rotate(180deg) brightness(1.5)';
            } else if (this.type === 'boss') {
                baseFilter = 'hue-rotate(270deg) saturate(2)';
            }

            // Apply hit flash to renderer state if supported
            if (this.hitFlash > 0) {
                if (ctx.currentState) ctx.currentState.flash = 1.0;
            }

            // Draw drop shadow (explicitly set filter to brightness 0)
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.filter = 'brightness(0) blur(15px)';
            ctx.drawImage(
                this.img,
                this.x + 20,
                this.y - 50,
                this.width * 1.2,
                this.height * 1.2
            );
            ctx.restore();

            // Draw original alien sprite with its base filter
            ctx.filter = baseFilter;
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
            
            // Health bar for elites/bosses
            if (this.health < this.maxHealth) {
                const barWidth = this.width * 0.8;
                const barHeight = 6;
                const barX = this.x + (this.width - barWidth) / 2;
                const barY = this.y - 15;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.fillStyle = this.type === 'boss' ? '#ffcc00' : '#00ff00';
                ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
            }

            ctx.restore();
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    reverseDirection() {
        this.direction *= -1;
    }

    collidesWith(x, y) {
        return (
            x >= this.x && 
            x <= this.x + this.width &&
            y >= this.y && 
            y <= this.y + this.height
        );
    }
}

export default Alien;
