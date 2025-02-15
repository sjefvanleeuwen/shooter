class CanvasManager {
    constructor(canvasId, virtualWidth, virtualHeight) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.virtualWidth = virtualWidth;
        this.virtualHeight = virtualHeight;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.setupCanvas();
        this.bindEvents();
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
    
    clearScreen() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.applyTransform();
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

    getContext() {
        return this.ctx;
    }
}

export default CanvasManager;
