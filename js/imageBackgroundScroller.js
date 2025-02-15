class ImageBackgroundScroller {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1080;
        this.virtualHeight = options.virtualHeight || 1080;
        this.scrollSpeed = options.scrollSpeed || 100;

        // Load all background images
        this.images = [
            // './backgrounds/level3/1.png',
            // './backgrounds/level3/2.png',
            // './backgrounds/level3/3.png',
            // './backgrounds/level3/4.png',
            './backgrounds/1.png',
            './backgrounds/3.png',
            './backgrounds/4.png',
            './backgrounds/5.png',
            './backgrounds/6.png',
            './backgrounds/7.png',
            './backgrounds/8.png',
            './backgrounds/9.png',
            './backgrounds/10.png'
        ].map(src => {
            const img = new Image();
            img.src = src;
            return img;
        });

        this.currentImageIndex = 0;
        this.nextImageIndex = 1;
        this.position1 = 0;
        this.position2 = -this.virtualHeight;
        this.transitionPoint = this.virtualHeight;

        // Track flip states for each position instead of toggling
        this.position1Flipped = false;
        this.position2Flipped = true; // Start second position flipped for alternating pattern

        // Create a reusable temporary canvas for sampling background color.
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = 20;
        this.tempCanvas.height = 20;
        // Use willReadFrequently to improve getImageData performance.
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });

        this.lastColorSample = { x: null, y: null, color: null, time: 0 };
    }
    
    update(delta) {
        this.position1 += this.scrollSpeed * delta;
        this.position2 += this.scrollSpeed * delta;
        
        if (this.position1 >= this.transitionPoint) {
            this.position1 = this.position2 - this.virtualHeight;
            this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
            // Keep the flip state consistent for this position
        }
        
        if (this.position2 >= this.transitionPoint) {
            this.position2 = this.position1 - this.virtualHeight;
            this.nextImageIndex = (this.nextImageIndex + 1) % this.images.length;
            // Keep the flip state consistent for this position
        }
    }
    
    draw() {
        if (!this.images[this.currentImageIndex]?.complete || 
            !this.images[this.nextImageIndex]?.complete) return;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.virtualWidth, this.virtualHeight);
        this.ctx.clip();
        
        // Draw first position with its fixed flip state
        this.ctx.save();
        if (this.position1Flipped) {
            this.ctx.scale(1, -1);
            this.ctx.drawImage(
                this.images[this.currentImageIndex],
                0, -this.position1 - this.virtualHeight,
                this.virtualWidth, this.virtualHeight
            );
        } else {
            this.ctx.drawImage(
                this.images[this.currentImageIndex],
                0, this.position1,
                this.virtualWidth, this.virtualHeight
            );
        }
        this.ctx.restore();
        
        // Draw second position with its fixed flip state
        this.ctx.save();
        if (this.position2Flipped) {
            this.ctx.scale(1, -1);
            this.ctx.drawImage(
                this.images[this.nextImageIndex],
                0, -this.position2 - this.virtualHeight,
                this.virtualWidth, this.virtualHeight
            );
        } else {
            this.ctx.drawImage(
                this.images[this.nextImageIndex],
                0, this.position2,
                this.virtualWidth, this.virtualHeight
            );
        }
        this.ctx.restore();
        
        this.ctx.restore();
    }

    getColorAt(x, y) {
        const now = performance.now();
        // Increase threshold to 100ms to reduce frequent sampling
        if (
            this.lastColorSample.x === x &&
            this.lastColorSample.y === y &&
            now - this.lastColorSample.time < 100
        ) {
            return this.lastColorSample.color;
        }
        
        const tempCtx = this.tempCtx;
        tempCtx.clearRect(0, 0, 20, 20);
        const activeImg = this.images[this.currentImageIndex];
        const activePos = this.currentImageIndex === 0 ? this.position1 : this.position2;
        
        tempCtx.drawImage(
            activeImg,
            x - 10, y - 10 - activePos, 20, 20,
            0, 0, 20, 20
        );
        
        const data = tempCtx.getImageData(0, 0, 20, 20).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }
        const color = {
            r: r / count,
            g: g / count,
            b: b / count
        };
        this.lastColorSample = { x, y, color, time: now };
        return color;
    }
}

export default ImageBackgroundScroller;
