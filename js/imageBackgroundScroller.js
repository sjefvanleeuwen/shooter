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
        // Create a small temporary canvas for sampling
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 20;  // Sample area size
        tempCanvas.height = 20;
        
        // Draw the currently visible portion of background
        const activeImg = this.images[this.currentImageIndex];
        const activePos = this.currentImageIndex === 0 ? this.position1 : this.position2;
        
        tempCtx.drawImage(
            activeImg,
            x - 10, y - 10 - activePos,  // Center the sampling area
            20, 20,                       // Source size
            0, 0,                         // Dest position
            20, 20                        // Dest size
        );
        
        // Get average color
        const data = tempCtx.getImageData(0, 0, 20, 20).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }
        
        return {
            r: r / count,
            g: g / count,
            b: b / count
        };
    }
}

export default ImageBackgroundScroller;
