export default class CloudOverlay {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.width = options.virtualWidth || 1080;
        this.height = options.virtualHeight || 1080;
        
        // Generate distinct layers for parallax
        // Speed: pixels per second (vertical)
        // Scale: size of cloud blobs
        // Opacity: transparency of the layer
        this.layers = [
            // Layer 1: Slow, distant, large dark patches (Atmospheric depth)
            // Reduced count 6->3, opacity 0.15->0.1
            { speed: 40, scale: 2.0, opacity: 0.1, color: '#304060', count: 3 },
            
            // Layer 2: Medium speed, defined cloud islands
            // Reduced count 8->4, opacity 0.2->0.12
            { speed: 90, scale: 1.2, opacity: 0.12, color: '#6080b0', count: 4 },
            
            // Layer 3: Fast, closer, brighter wisps
            // Reduced count 10->5, opacity 0.25->0.15
            { speed: 180, scale: 1.0, opacity: 0.15, color: '#a0d0ff', count: 5 }
        ];

        this.canvases = this.layers.map(layer => this.createCloudTexture(layer));
        // Initialize random offsets so they don't all align at start
        this.offsets = this.layers.map(() => Math.random() * this.height);
    }

    createCloudTexture(layer) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Generate distinct CLOUD CLUSTERS instead of random scattered blobs
        
        const drawPuff = (cx, cy, r) => {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, layer.color);
            grad.addColorStop(0.2, layer.color); // Reduced solid core 0.4 -> 0.2 for softer look
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        };

        const drawCloudCluster = (centerX, centerY, baseRadius) => {
             // Draw a cluster of puffs to form a non-circular cloud
             const puffs = 3 + Math.floor(Math.random() * 4); // 3-6 puffs per cloud
             
             for(let i=0; i<puffs; i++) {
                 // Offset from center
                 const angle = Math.random() * Math.PI * 2;
                 const dist = Math.random() * baseRadius * 0.8;
                 const px = centerX + Math.cos(angle) * dist;
                 const py = centerY + Math.sin(angle) * dist;
                 
                 // Vary puff size
                 const pr = (baseRadius * 0.5) + (Math.random() * baseRadius * 0.8);
                 
                 // Draw wrapped puff
                 drawWrapped(px, py, pr);
             }
        };

        const drawWrapped = (cx, cy, r) => {
            // Determine wrap positions
            // We need to check -1, 0, +1 combinations for creating a seamless tile
            const rangeX = [0];
            const rangeY = [0];

            if (cx - r < 0) rangeX.push(this.width);
            if (cx + r > this.width) rangeX.push(-this.width);
            
            if (cy - r < 0) rangeY.push(this.height);
            if (cy + r > this.height) rangeY.push(-this.height);

            for (let ox of rangeX) {
                for (let oy of rangeY) {
                    drawPuff(cx + ox, cy + oy, r);
                }
            }
        };

        for (let i = 0; i < layer.count; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            // Radius of the whole cloud cluster
            const clusterRadius = (150 + Math.random() * 100) * layer.scale;

            drawCloudCluster(x, y, clusterRadius);
        }

        return canvas;
    }

    update(delta) {
        this.layers.forEach((layer, i) => {
            this.offsets[i] += layer.speed * delta;
            // Loop the offset
            if (this.offsets[i] >= this.height) {
                this.offsets[i] -= this.height;
            }
        });
    }

    draw() {
        this.ctx.save();
        // Screen blend mode makes light pixels brighter, good for glowing clouds/mist
        // over dark space background
        this.ctx.globalCompositeOperation = 'screen'; 
        
        this.layers.forEach((layer, i) => {
            this.ctx.globalAlpha = layer.opacity;
            // Optional: apply blur if performance isn't an issue? 
            // Canvas filters are expensive. Baking fuzzy gradients is better. 
            // We used fuzzy gradients in createCloudTexture.
            
            const y = this.offsets[i];
            const texture = this.canvases[i];
            
            // Draw current and wrapped version
            // Ensure integer coordinates to avoid sub-pixel blurring artifacts or seams
            const iy = Math.floor(y);
            
            this.ctx.drawImage(texture, 0, iy);
            this.ctx.drawImage(texture, 0, iy - this.height);
        });

        this.ctx.restore();
    }
}
