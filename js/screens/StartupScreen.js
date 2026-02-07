import AssetPreloader from '../utils/AssetPreloader.js';

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

        // Asset preload state
        this.preloadStarted = false;
        this.preloadDone = false;
        this.preloadProgress = 0;   // 0–1
        this.preloadTotal = 0;
        this.preloadLoaded = 0;
        this.preloadMissing = [];
        this.preloadCurrentFile = '';
    }

    /** Kick off the asset check (called once after fade-in). */
    _startPreload() {
        if (this.preloadStarted) return;
        this.preloadStarted = true;

        const preloader = new AssetPreloader();
        preloader.onProgress = (loaded, total, url) => {
            this.preloadLoaded = loaded;
            this.preloadTotal = total;
            this.preloadProgress = total > 0 ? loaded / total : 0;
            this.preloadCurrentFile = url.split('/').pop();
        };

        preloader.checkAll().then(result => {
            this.preloadDone = true;
            this.preloadMissing = result.missing;

            if (result.missing.length > 0) {
                console.warn('⚠ Missing assets:', result.missing);
            } else {
                console.log(`✓ All ${result.total} assets verified`);
            }

            // Allow user to proceed even with missing assets (game may
            // still work, just with gaps).  The prompt will change.
            this.showPressEnter = true;
            this.readyForInput = true;
        });
    }

    update(delta) {
        if (this.fadeIn) {
            this.alpha = Math.min(1, this.alpha + delta * this.fadeSpeed);
            if (this.alpha >= 1) {
                this.fadeIn = false;
                this._startPreload();
            }
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
        
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '32px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // CRT glow
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 20;
        
        // Main title
        this.ctx.fillText('SWITCHING ON ARCADE...', 
            this.virtualWidth / 2, 
            this.virtualHeight / 2 - 40);

        // ── Loading progress ──
        if (this.preloadStarted && !this.preloadDone) {
            // Progress bar
            const barW = 400;
            const barH = 16;
            const barX = (this.virtualWidth - barW) / 2;
            const barY = this.virtualHeight / 2 + 30;

            // Track outline
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(barX, barY, barW, barH);

            // Fill
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(barX + 2, barY + 2,
                (barW - 4) * this.preloadProgress, barH - 4);

            // Counter text
            this.ctx.font = '14px "Press Start 2P"';
            this.ctx.fillStyle = '#00ff00';
            this.ctx.globalAlpha = this.alpha * 0.7;
            this.ctx.fillText(
                `CHECKING ASSETS ${this.preloadLoaded}/${this.preloadTotal}`,
                this.virtualWidth / 2,
                barY + barH + 28
            );

            // Current file
            if (this.preloadCurrentFile) {
                this.ctx.font = '10px "Press Start 2P"';
                this.ctx.globalAlpha = this.alpha * 0.4;
                this.ctx.fillText(
                    this.preloadCurrentFile,
                    this.virtualWidth / 2,
                    barY + barH + 52
                );
            }
        }

        // ── Missing-assets warning ──
        if (this.preloadDone && this.preloadMissing.length > 0) {
            this.ctx.font = '12px "Press Start 2P"';
            this.ctx.fillStyle = '#ff4444';
            this.ctx.globalAlpha = this.alpha;
            this.ctx.fillText(
                `WARNING: ${this.preloadMissing.length} ASSET(S) MISSING`,
                this.virtualWidth / 2,
                this.virtualHeight / 2 + 30
            );
        }

        // ── "Press Enter" prompt ──
        if (this.showPressEnter) {
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.fillStyle = '#00ff00';
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
            
            const isMobile = window.game?.mobileControls?.isMobile;
            const text = isMobile ? 'PRESS FIRE TO CONTINUE' : 'PRESS ENTER TO CONTINUE';
            
            this.ctx.fillText(text, 
                this.virtualWidth / 2, 
                this.virtualHeight * 0.7);
        }
        
        this.ctx.restore();
    }

    handleInput(key) {
        if (this.readyForInput && (key === 'Enter' || key === ' ')) {
            const audioManager = window.game.audioManager;
            if (audioManager) {
                audioManager.resumeContext();
            }
            return 'intro';
        }
        return null;
    }
}

export default StartupScreen;
