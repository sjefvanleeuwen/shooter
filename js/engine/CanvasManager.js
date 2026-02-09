import WebGLRenderer from './WebGLRenderer.js';

class CanvasManager {
    constructor(canvas) {
        this.canvas = canvas;
        if (!this.canvas) throw new Error('Canvas element required');

        // Set up WebGL renderer
        this.renderer = new WebGLRenderer(this.canvas);
        this.ctx = this.renderer; // Use renderer as ctx

        // Store virtual dimensions from the canvas itself
        this.virtualWidth = this.canvas.width;
        this.virtualHeight = this.canvas.height;
    }

    clearScreen() {
        this.renderer.clear();
    }

    setupCanvas() {
        // Keep the internal buffer at fixed virtual resolution
        // The actual display scaling is handled by CRTEffect's glCanvas
        this.canvas.width = this.virtualWidth;
        this.canvas.height = this.virtualHeight;
        
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
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
