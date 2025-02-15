class HUDManager {
    constructor(ctx, virtualWidth, virtualHeight) {
        this.ctx = ctx;
        this.virtualWidth = virtualWidth;
        this.virtualHeight = virtualHeight;
        this.font = '16px "Press Start 2P"';
    }

    draw(lives, score, highScore) {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = this.font;

        // Lives at bottom left
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`LIVES: ${lives}`, 20, this.virtualHeight - 20);

        // High Score at bottom center
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`HIGH SCORE: ${highScore}`, this.virtualWidth / 2, this.virtualHeight - 20);

        // Score at bottom right
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${score}`, this.virtualWidth - 20, this.virtualHeight - 20);

        this.ctx.restore();
    }
}

export default HUDManager;
