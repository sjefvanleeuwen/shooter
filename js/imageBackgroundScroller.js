class ImageBackgroundScroller {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1080;
        this.virtualHeight = options.virtualHeight || 1080;
        this.scrollSpeed = options.scrollSpeed || 100;
        this.offsetY = options.offsetY || 0;
        this.scrollY = 0;

        // Load both background images
        this.images = [new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image(),new Image(), new Image()];
        this.images[0].src = './backgrounds/4.png';
        this.images[1].src = './backgrounds/7.png';
        this.images[2].src = './backgrounds/3.png';
        this.images[3].src = './backgrounds/4.png';                
        this.images[4].src = './backgrounds/5.png';        
        this.images[5].src = './backgrounds/6.png';        
        this.images[6].src = './backgrounds/7.png';        
        this.images[7].src = './backgrounds/8.png';        
        this.images[8].src = './backgrounds/9.png';                
        this.images[9].src = './backgrounds/10.png';                
        this.currentImageIndex = 0;
        this.currentImage = this.images[0];

        // Track two image positions
        this.position1 = 0;
        this.position2 = -this.virtualHeight;
        this.activeImage = 0;  // Track which image is currently visible
    }
    
    update(delta) {
        // Move both positions down
        this.position1 += this.scrollSpeed * delta;
        this.position2 += this.scrollSpeed * delta;
        
        // When the first image moves completely out of view
        if (this.position1 >= this.virtualHeight) {
            this.position1 = this.position2 - this.virtualHeight;
            this.activeImage = 1;
        }
        
        // When the second image moves completely out of view
        if (this.position2 >= this.virtualHeight) {
            this.position2 = this.position1 - this.virtualHeight;
            this.activeImage = 0;
        }
    }
    
    draw(scale) {
        if (!this.images[0].complete || !this.images[1].complete) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, this.virtualWidth, this.virtualHeight);
        ctx.clip();
        
        // Draw both images at their current positions
        ctx.drawImage(
            this.images[0],
            0, this.position1,
            this.virtualWidth, this.virtualHeight
        );
        
        ctx.drawImage(
            this.images[1],
            0, this.position2,
            this.virtualWidth, this.virtualHeight
        );
        
        ctx.restore();
    }

    getColorAt(x, y) {
        // Create a small temporary canvas for sampling
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 20;  // Sample area size
        tempCanvas.height = 20;
        
        // Draw the currently visible portion of background
        const activeImg = this.images[this.activeImage];
        const activePos = this.activeImage === 0 ? this.position1 : this.position2;
        
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
