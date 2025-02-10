class BackgroundScroller {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1920;
        this.virtualHeight = options.virtualHeight || 1080;
        this.viewportWidth = options.viewportWidth || 1920;
        this.checkerSize = options.checkerSize || 64;
        this.scrollSpeed = options.scrollSpeed || 100; // pixels per second
        this.offsetY = options.offsetY || 0;
        this.scrollY = 0; // Accumulated scroll (in pixels)
    }
    
    update(delta) {
        this.scrollY += this.scrollSpeed * delta;
    }
    
    draw(scale) {
        const ctx = this.ctx;
        ctx.save();
        // Apply clip to the virtual game area
        ctx.beginPath();
        ctx.rect(0, 0, this.virtualWidth, this.virtualHeight);
        ctx.clip();
        
        // Compute scrolling offsets
        const effectiveScroll = this.scrollY % this.checkerSize;
        const rowOffset = Math.floor(this.scrollY / this.checkerSize);
        const cols = Math.ceil(this.viewportWidth / this.checkerSize) + 1;
        const startRow = -1;
        const totalVisibleRows = Math.ceil(this.virtualHeight / this.checkerSize) + 2;
        
        for (let row = startRow; row < startRow + totalVisibleRows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * this.checkerSize;
                // For downward scrolling, add effectiveScroll
                const y = row * this.checkerSize + effectiveScroll;
                // Adjust grid row to maintain pattern consistency
                const gridRow = row - rowOffset;
                const isWhite = ((col + gridRow) % 2 === 0);
                ctx.fillStyle = isWhite ? '#555555' : '#666666';
                ctx.fillRect(x, y, this.checkerSize + 1, this.checkerSize + 1);
            }
        }
        ctx.restore();
    }
}

export default BackgroundScroller;
