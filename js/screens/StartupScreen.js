class StartupScreen {
    constructor(ctx, options = {}) {
        this.ctx = ctx;
        this.virtualWidth = options.virtualWidth;
        this.virtualHeight = options.virtualHeight;
        this.alpha = 0;
        this.fadeIn = true;
        this.fadeSpeed = 0.8;
        this.displayDuration = 2.0;
        this.timer = 0;
        this.readyForInput = false;
        this.showPressEnter = false;
    }

    update(delta) {
        if (this.fadeIn) {
            this.alpha = Math.min(1, this.alpha + delta * this.fadeSpeed);
            if (this.alpha >= 1) {
                this.fadeIn = false;
                // Show prompt immediately after fade in
                this.showPressEnter = true;
                this.readyForInput = true;
            }
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
        
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '32px "Press Start 2P"';  // Reduced from 48px
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw text with CRT-like glow effect
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 20;
        
        // Main text
        this.ctx.fillText('SWITCHING ON ARCADE...', 
            this.virtualWidth / 2, 
            this.virtualHeight / 2);

        // Draw "Press Enter" with blinking effect if ready
        if (this.showPressEnter) {
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.fillStyle = '#00ff00';
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
            this.ctx.fillText('PRESS ENTER TO CONTINUE', 
                this.virtualWidth / 2, 
                this.virtualHeight * 0.7);
        }
        
        this.ctx.restore();
    }

    handleInput(key) {
        if (this.readyForInput && key === 'Enter') {
            return 'intro';
        }
        return null;
    }
}

export default StartupScreen;
