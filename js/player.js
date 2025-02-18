class Player {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.width = options.width || 200;
        this.height = options.height || 200;
        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080; // Fix typo: was this.virtualHeight
        this.x = (this.virtualWidth - this.width) / 2;
        this.y = this.virtualHeight - this.height - 20;
        this.speed = options.speed || 300;

        // Input state
        this.movingLeft = false;
        this.movingRight = false;
        this.isFiring = false;

        // Load sprite image.
        this.img = new Image();
        this.img.src = './sprites/player.png';  // Updated path

        this.setupInput();

        // Add collision mask
        this.collisionMask = document.createElement('canvas');
        this.collisionMask.width = this.width;
        this.collisionMask.height = this.height;
        this.maskCtx = this.collisionMask.getContext('2d');
        this.createCollisionMask();

        this.velocity = { x: 0, y: 0 };  // Add this line for velocity tracking
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.movingLeft = true;
                    break;
                case 'ArrowRight':
                    this.movingRight = true;
                    break;
                case ' ':
                    this.isFiring = true;
                    this.shoot(); // Add this line to shoot when space is pressed
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.movingLeft = false;
                    break;
                case 'ArrowRight':
                    this.movingRight = false;
                    break;
                case ' ':
                    this.isFiring = false;
                    break;
            }
        });
    }

    handleInput(key) {
        switch(key) {
            case 'ArrowLeft':
                this.movingLeft = true;
                break;
            case 'ArrowRight':
                this.movingRight = true;
                break;
            case ' ':
                this.isFiring = true;
                break;
        }
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

    checkCollision(laser) {
        // Simple bounding box collision check
        return (
            laser.x >= this.x && 
            laser.x <= this.x + this.width &&
            laser.y >= this.y && 
            laser.y <= this.y + this.height &&
            this.checkPixelCollision(laser.x, laser.y)
        );
    }

    update(delta) {
        if (this.movingLeft) this.x -= this.speed * delta;
        if (this.movingRight) this.x += this.speed * delta;
        // Clamp within the virtual game width
        this.x = Math.max(0, Math.min(this.x, this.virtualWidth - this.width));
        
        // Remove the auto-reset of movement and firing states
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

    shoot() {
        // This is just a placeholder since actual shooting is handled by laser engines
        // But we need this method to prevent the error
    }
}

export default Player;
