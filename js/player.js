class Player {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        // Set dimensions to half the previous size
        this.width = options.width || 200;      // was 400, now 200
        this.height = options.height || 200;     // was 400, now 200
        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080;
        // Position player centered at bottom with a margin.
        this.x = (this.virtualWidth - this.width) / 2;
        this.y = this.virtualHeight - this.height - 20;
        this.speed = options.speed || 300; // pixels per second

        // Load sprite image.
        this.img = new Image();
        this.img.src = './sprites/player.png';

        this.movingLeft = false;
        this.movingRight = false;
        this.isFiring = false;
        this.setupInput();
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.movingLeft = true;
            if (e.key === 'ArrowRight') this.movingRight = true;
            if (e.key === ' ') this.isFiring = true;  // Spacebar
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') this.movingLeft = false;
            if (e.key === 'ArrowRight') this.movingRight = false;
            if (e.key === ' ') this.isFiring = false; // Spacebar
        });
    }

    update(delta) {
        if (this.movingLeft) this.x -= this.speed * delta;
        if (this.movingRight) this.x += this.speed * delta;
        // Clamp within the virtual game width.
        this.x = Math.max(0, Math.min(this.x, this.virtualWidth - this.width));
    }

    draw() {
        const ctx = this.ctx;
        // Draw sprite only, no shadow
        if (this.img.complete) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

export default Player;
