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

        // Add collision mask
        this.collisionMask = document.createElement('canvas');
        this.collisionMask.width = this.width;
        this.collisionMask.height = this.height;
        this.maskCtx = this.collisionMask.getContext('2d');
        this.createCollisionMask();
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

    createCollisionMask() {
        // Wait for image to load
        if (!this.img.complete) {
            this.img.addEventListener('load', () => this.createCollisionMask());
            return;
        }

        // Draw image to collision mask
        this.maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
        // Get pixel data for collision detection
        this.maskData = this.maskCtx.getImageData(0, 0, this.width, this.height).data;
    }

    checkPixelCollision(x, y) {
        // Convert world coordinates to local sprite coordinates
        const localX = Math.floor(x - this.x);
        const localY = Math.floor(y - this.y);

        // Check bounds first
        if (localX < 0 || localX >= this.width || localY < 0 || localY >= this.height) {
            return false;
        }

        // Get pixel alpha value from mask
        const pixelIndex = (localY * this.width + localX) * 4 + 3;
        const alpha = this.maskData[pixelIndex];

        // Consider hit if alpha is above threshold (e.g., 50)
        return alpha > 50;
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
