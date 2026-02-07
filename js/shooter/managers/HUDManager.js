class HUDManager {
    constructor(ctx, virtualWidth, virtualHeight) {
        this.ctx = ctx;
        this.virtualWidth = virtualWidth;
        this.virtualHeight = virtualHeight;
        this.font = '16px "Press Start 2P"';
        
        // Cache boss health gradient
        this.bossGradient = null;
        this.initGradient();
    }

    initGradient() {
        const barWidth = this.virtualWidth * 0.6;
        const barX = (this.virtualWidth - barWidth) / 2;
        this.bossGradient = this.ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        this.bossGradient.addColorStop(0, '#ff0000');
        this.bossGradient.addColorStop(0.5, '#ffff00');
        this.bossGradient.addColorStop(1, '#00ff00');
    }

    draw(lives, score, highScore, boss = null) {
        this.ctx.save();
        
        // Reset typical context state that might be modified by game objects
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        this.ctx.filter = 'none';

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = this.font;
        this.ctx.textBaseline = 'alphabetic';

        // Lives at bottom left
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`LIVES: ${lives}`, 20, this.virtualHeight - 20);

        // High Score at bottom center
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`HIGH SCORE: ${highScore}`, this.virtualWidth / 2, this.virtualHeight - 20);

        // Score at bottom right
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${score}`, this.virtualWidth - 20, this.virtualHeight - 20);

        // Draw Boss Health Bar
        if (boss) {
            this.drawBossHealth(boss);
        }

        this.ctx.restore();
    }

    drawBossHealth(boss) {
        const barWidth = this.virtualWidth * 0.6;
        const barHeight = 20;
        const barX = (this.virtualWidth - barWidth) / 2;
        const barY = 40;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Health
        const healthPercent = Math.max(0, boss.health / boss.maxHealth);
        
        // Lazy-init gradient if needed
        if (!this.bossGradient) this.initGradient();
        
        this.ctx.fillStyle = this.bossGradient;
        this.ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * healthPercent, barHeight - 4);

        // Boss Name Text
        this.ctx.fillStyle = '#ff0000';
        this.ctx.textAlign = 'center';
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.fillText("WARNING: BOSS DETECTED", this.virtualWidth / 2, barY - 10);
        
        // Revert font
        this.ctx.font = this.font;
    }
}

export default HUDManager;
