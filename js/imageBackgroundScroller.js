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
        const indices = Array.from({length: 17}, (_, i) => i + 1);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        for (let i = 0; i < 17; i++) {
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
        this.tempCanvas.width = 20;
        this.tempCanvas.height = 20;
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        this.lastColorSample = { x: null, y: null, color: null, time: 0 };
    }
    
    // Create a cached canvas version of the image with the transparency gradient baked in
    processLayer(layer) {
        if (!layer.image.complete || layer.image.naturalWidth === 0) return;

        const pCanvas = document.createElement('canvas');
        pCanvas.width = this.virtualWidth;
        pCanvas.height = this.virtualHeight;
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
        pCtx.globalCompositeOperation = 'source-over';
        
        layer.processed = pCanvas;
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
        if (this.lastColorSample.x === x && this.lastColorSample.y === y && now - this.lastColorSample.time < 100) {
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

                 this.tempCtx.clearRect(0, 0, 20, 20);
                 this.tempCtx.drawImage(source, x - 10, localY - 10, 20, 20, 0, 0, 20, 20);
                 
                 const data = this.tempCtx.getImageData(0, 0, 20, 20).data;
                 let r=0,g=0,b=0,count=0;
                 for(let i=0; i<data.length; i+=4) {
                     r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++;
                 }
                 this.lastColorSample = { x, y, color: { r: r/count, g: g/count, b: b/count }, time: now };
                 return this.lastColorSample.color;
             }
        }
        
        return {r:0,g:0,b:0};
    }
}
