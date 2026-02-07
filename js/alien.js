// Shared asset cache
const spriteCache = {};
const shadowCache = {};

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
            this.health = 8; 
        } else if (this.type === 'kamikaze') {
            this.health = 1;
        } else if (this.type === 'boss') {
            this.width = 400; 
            this.height = 400;
            this.health = 75; 
        } else {
            this.health = 1;
        }

        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080;
        
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        this.speed = options.speed || 100;
        this.direction = 1; 

        // Apply health override from options if present
        if (options.health) {
            this.health = options.health;
        }
        
        // Ensure maxHealth is synchronized with the final determined health
        this.maxHealth = this.health;

        this.isKamikaze = this.type === 'kamikaze';
        this.hitFlash = 0;
        
        // Shared sprite loading
        const src = './sprites/alien1.png';
        if (!spriteCache[src]) {
            const img = new Image();
            img.src = src;
            spriteCache[src] = img;
            
            // Generate shadow when image loads
            img.onload = () => {
                this.generateShadow(src, img);
            };
        }
        this.img = spriteCache[src];
        this.shadowKey = src; // Key to access shadowCache
    }

    generateShadow(key, img) {
        if (shadowCache[key]) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width + 100; // Add padding for blur
        canvas.height = img.height + 100;
        const ctx = canvas.getContext('2d');
        
        // Increase blur amount significantly
        ctx.filter = 'brightness(0) blur(20px) opacity(0.7)';
        ctx.drawImage(img, 50, 50); // Offset to account for larger canvas
        
        // Use ImageBitmap if available
        if (typeof createImageBitmap !== 'undefined') {
            createImageBitmap(canvas).then(bitmap => {
                shadowCache[key] = bitmap;
            });
        } else {
            shadowCache[key] = canvas;
        }
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
            
            // Draw shadow first
            if (shadowCache[this.shadowKey]) {
                ctx.save();
                // Draw with offset for height illusion
                // Shadow offset should be roughly same as padding (50) minus some perspective shift (e.g. 20)
                // So (x + 50) - 20 = x + 30
                
                // Adjust for size differences:
                // The shadow cache has padding. We need to center it relative to the alien.
                // Shadow Cache Size = Img + 100
                // Alien Size = this.width / this.height (scaled)
                
                const shadowScaleX = this.width / this.img.width;
                const shadowScaleY = this.height / this.img.height;
                
                // Position shadow relative to alien, shifted down/right
                const shadowX = this.x - (50 * shadowScaleX) + (20 * shadowScaleX);
                const shadowY = this.y - (50 * shadowScaleY) + (60 * shadowScaleY);
                
                ctx.drawImage(shadowCache[this.shadowKey], 
                    shadowX, 
                    shadowY, 
                    this.width + (100 * shadowScaleX), 
                    this.height + (100 * shadowScaleY));
                
                ctx.restore();
            }

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

            // Draw pre-rendered drop shadow
            if (shadowCache[this.shadowKey]) {
                const shadow = shadowCache[this.shadowKey];
                ctx.save();
                ctx.globalAlpha = 0.5;
                // No blur/filter needed needed
                ctx.drawImage(
                    shadow,
                    this.x + 20 - 16, // Adjust for padding (img/w * 1.2?)
                    this.y - 50 - 16,
                    this.width * 1.2 + 32, // Adjust scale
                    this.height * 1.2 + 32
                );
                ctx.restore();
            }

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
