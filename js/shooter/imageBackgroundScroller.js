export default class ImageBackgroundScroller {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth || 1080;
        this.virtualHeight = options.virtualHeight || 1080;
        this.scrollSpeed = options.scrollSpeed || 100;

        // Config
        this.overlap = 160;
        this.spacing = this.virtualHeight - this.overlap;
        
        // State
        this.scrollY = 0; 
        
        // Load and Pre-Process Images
        // We do this ONCE to ensure stability and performance
        this.layers = [];

        // Generate indices and shuffle them
        const indices = Array.from({length: 21}, (_, i) => i + 1);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        for (let i = 0; i < 21; i++) {
            const img = new Image();
            img.src = `./backgrounds/level0/${indices[i]}.png`;
            
            const layerObj = {
                image: img,
                processed: null, // Will hold the canvas with fade applied
                ready: false
            };
            
            img.onload = () => {
                this.processLayer(layerObj);
            };
            
            this.layers.push(layerObj);
        }

        // Color sampling cache
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = 1;
        this.tempCanvas.height = 1;
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        this.lastColorSample = { x: null, y: null, color: null, time: 0 };
    }
    
    // Create a cached canvas version of the image with the transparency gradient baked in
    async processLayer(layer) {
        if (!layer.image.complete || layer.image.naturalWidth === 0) return;

        // Use OffscreenCanvas if available to avoid DOM overhead
        const isOffscreen = typeof OffscreenCanvas !== 'undefined';
        const pCanvas = isOffscreen 
            ? new OffscreenCanvas(this.virtualWidth, this.virtualHeight)
            : document.createElement('canvas');

        if (!isOffscreen) {
            pCanvas.width = this.virtualWidth;
            pCanvas.height = this.virtualHeight;
        }

        const pCtx = pCanvas.getContext('2d');

        // 1. Draw Image
        pCtx.drawImage(layer.image, 0, 0, this.virtualWidth, this.virtualHeight);

        // 2. Apply Fade (Erase bottom)
        pCtx.globalCompositeOperation = 'destination-out';
        const grad = pCtx.createLinearGradient(0, this.virtualHeight - this.overlap, 0, this.virtualHeight);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        pCtx.fillStyle = grad;
        pCtx.fillRect(0, this.virtualHeight - this.overlap, this.virtualWidth, this.overlap);

        // 3. Reset and Store
        // Optimize: Convert to ImageBitmap for faster WebGL upload
        try {
            const bitmap = await createImageBitmap(pCanvas);
            layer.processed = bitmap;
        } catch (e) {
            // Fallback for browsers that might fail bitmap creation
            pCtx.globalCompositeOperation = 'source-over';
            layer.processed = pCanvas; 
        }
        
        layer.ready = true;
    }
    
    update(delta) {
        this.scrollY += this.scrollSpeed * delta;
    }
    
    draw() {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.virtualWidth, this.virtualHeight);
        this.ctx.clip();
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

        const minN = Math.floor((this.scrollY - this.virtualHeight) / this.spacing);
        const maxN = Math.ceil((this.scrollY + this.virtualHeight) / this.spacing);

        for (let n = minN; n <= maxN; n++) {
            const y = this.scrollY - (n * this.spacing);
            
            // Map n to 0..3
            const len = this.layers.length;
            const idx = ((n % len) + len) % len;
            const layer = this.layers[idx];
            
            this.drawLayer(layer, y);
        }
        
        this.ctx.restore();
    }

    drawLayer(layer, y) {
        const drawY = Math.floor(y);
        if (drawY >= this.virtualHeight || drawY + this.virtualHeight <= 0) return;

        if (layer.ready && layer.processed) {
            // Draw the pre-processed canvas
            this.ctx.drawImage(layer.processed, 0, drawY, this.virtualWidth, this.virtualHeight);
        } else if (layer.image && layer.image.complete) {
            // Fallback: draw raw image if not processed yet
            this.ctx.drawImage(layer.image, 0, drawY, this.virtualWidth, this.virtualHeight);
        }
    }

    getColorAt(x, y) {
        const now = performance.now();
        // Performance optimization: Throttle sampling to ~10 times per second
        // Removing x/y check allows relying on cache even while moving
        if (this.lastColorSample.color && now - this.lastColorSample.time < 100) {
            return this.lastColorSample.color;
        }

        const minN = Math.floor((this.scrollY - this.virtualHeight) / this.spacing);
        const maxN = Math.ceil((this.scrollY + this.virtualHeight) / this.spacing);

        for (let n = maxN; n >= minN; n--) {
             const tileY = this.scrollY - (n * this.spacing);
             if (y >= tileY && y < tileY + this.virtualHeight) {
                 const localY = y - tileY;
                 
                 const len = this.layers.length;
                 const idx = ((n % len) + len) % len;
                 const layer = this.layers[idx];
                 
                 const source = layer.processed || layer.image;
                 if (!source) continue;

                 // Optimize: 1x1 pixel sample
                 this.tempCtx.clearRect(0, 0, 1, 1);
                 this.tempCtx.drawImage(
                    source, 
                    Math.floor(x), Math.floor(localY), 1, 1, 
                    0, 0, 1, 1
                 );
                 
                 const data = this.tempCtx.getImageData(0, 0, 1, 1).data;
                 
                 this.lastColorSample = { 
                     x, y, 
                     color: { r: data[0], g: data[1], b: data[2] }, 
                     time: now 
                 };
                 return this.lastColorSample.color;
             }
        }
        
        return {r:0,g:0,b:0};
    }
}
