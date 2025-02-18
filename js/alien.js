class Alien {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.width = options.width || 100;
        this.height = options.height || 100;
        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080;
        
        // Position will be set by the formation manager
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Movement properties
        this.speed = options.speed || 100;
        this.direction = 1; // 1 for right, -1 for left
        
        // Update sprite path to match processed file
        this.img = new Image();
        this.img.src = './sprites/alien1.png';  // Updated path
    }

    update(delta) {
        // Basic horizontal movement
        this.x += this.speed * this.direction * delta;
    }

    draw() {
        const ctx = this.ctx;
        if (this.img.complete) {
            // Draw drop shadow (same as player)
            ctx.save();
            ctx.globalAlpha = 0.7;          // Same opacity as player
            ctx.filter = 'blur(15px) brightness(0)';
            ctx.drawImage(
                this.img,
                this.x + 20,               // Offset x (+20)
                this.y - 50,               // Offset y (-50)
                this.width * 1.2,          // Scaled width (1.2)
                this.height * 1.2          // Scaled height (1.2)
            );
            ctx.restore();
            // Draw original alien sprite
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
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
