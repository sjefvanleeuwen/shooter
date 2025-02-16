class CanvasManager {
    constructor(canvas) {
        this.canvas = canvas;
        if (!this.canvas) throw new Error('Canvas element required');

        // Force exact 1024x1024 dimensions
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        
        // Set up context with fixed dimensions
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Store virtual dimensions
        this.virtualWidth = 1024;
        this.virtualHeight = 1024;
    }

    clearScreen() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, 1024, 1024);
    }

    setupCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        this.scale = Math.min(displayWidth / this.virtualWidth, displayHeight / this.virtualHeight);
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        this.offsetX = (displayWidth - (this.virtualWidth * this.scale)) / 2;
        this.offsetY = (displayHeight - (this.virtualHeight * this.scale)) / 2;
        this.applyTransform();
    }
    
    applyTransform() {
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    }
    
    bindEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
            }, 100);
        });
    }

    resize(scale, left, top) {
        // Maintain fixed dimensions
        this.canvas.width = this.virtualWidth;
        this.canvas.height = this.virtualHeight;
        
        // Apply exact transforms
        this.canvas.style.width = `${this.virtualWidth}px`;
        this.canvas.style.height = `${this.virtualHeight}px`;
        this.canvas.style.position = 'absolute';
        this.canvas.style.transformOrigin = '0 0';
        this.canvas.style.transform = `scale(${scale})`;
        this.canvas.style.left = `${left}px`;
        this.canvas.style.top = `${top}px`;
    }

    getContext() {
        return this.ctx;
    }
}

export default CanvasManager;
