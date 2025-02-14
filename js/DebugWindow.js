class DebugWindow {
    constructor() {
        this.visible = false;
        this.accumulatedTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        // Pre-set font string to reduce repeated construction
        this.fontStyle = '14px monospace';
    }
    
    update(delta) {
        this.accumulatedTime += delta;
        this.frameCount++;
        if (this.accumulatedTime >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.accumulatedTime = 0;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.font = this.fontStyle;
        ctx.fillStyle = 'yellow';
        ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        ctx.restore();
    }
}

export default DebugWindow;
