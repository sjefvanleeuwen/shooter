export default class VideoPlayer {
    constructor(audioManager = null) {
        this.video = document.createElement('video');
        this.video.setAttribute('webkit-playsinline', 'true');
        this.video.setAttribute('playsinline', 'true');
        this.video.style.position = 'fixed';
        this.video.style.top = '0';
        this.video.style.left = '0';
        this.video.style.width = '160px'; // Larger than 2px to ensure browser keeps it active
        this.video.style.height = '90px';
        this.video.style.opacity = '0.01'; 
        this.video.style.pointerEvents = 'none';
        this.video.style.zIndex = '-999'; 
        this.video.muted = false;
        this.video.volume = 1.0;
        this.video.autoplay = false; 
        this.video.preload = 'auto';
        this.video.crossOrigin = 'anonymous';

        document.body.appendChild(this.video);

        // Route audio through Web Audio API if manager provided
        if (audioManager && audioManager.context) {
            try {
                this.audioSource = audioManager.context.createMediaElementSource(this.video);
                // Connect to fxGain so it's controlled by FX volume and recorded by VideoRecorder
                this.audioSource.connect(audioManager.fxGain || audioManager.masterGain);
                console.log('Video Player: Audio routed through AudioManager');
            } catch (err) {
                console.warn('Video Player: Could not route audio (already connected?)', err);
            }
        }

        this.onEnded = null;
        this.video.onended = () => {
            console.log('Video Player: Ended');
            if (this.onEnded) this.onEnded();
        };

        this.video.onerror = (e) => {
            console.error('Video Player DOM Error:', this.video.error);
        };
        
        this._playPromise = null;
    }

    load(src) {
        return new Promise((resolve, reject) => {
            console.log('Video Player: Loading', src);
            this.video.src = src;
            
            const onCanPlay = () => {
                console.log('Video Player: CanPlay. Dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
                this.video.removeEventListener('canplay', onCanPlay);
                resolve();
            };
            this.video.addEventListener('canplay', onCanPlay);

            const onLoadError = (e) => {
                this.video.removeEventListener('error', onLoadError);
                console.error('Video Player: Load Error', src);
                reject(e);
            };
            this.video.addEventListener('error', onLoadError);
            
            this.video.load();
        });
    }

    async play() {
        console.log('Video Player: Play()');
        this.video.currentTime = 0;
        try {
            this._playPromise = this.video.play();
            await this._playPromise;
            console.log('Video Player: Playing');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Video Player: Play failed', err);
            }
        } finally {
            this._playPromise = null;
        }
    }

    async pause() {
        if (this._playPromise) {
            try { await this._playPromise; } catch (e) {}
        }
        this.video.pause();
    }

    draw(ctx, width, height) {
        // If readyState is 0 (HAVE_NOTHING) or 1 (HAVE_METADATA), we can't draw
        if (this.video.readyState < 2) return false;

        const vW = this.video.videoWidth;
        const vH = this.video.videoHeight;
        if (vW === 0 || vH === 0) return false;

        const screenAspect = width / height;
        const videoAspect = vW / vH;

        let dW, dH;
        if (videoAspect > screenAspect) {
            dW = width;
            dH = width / videoAspect;
        } else {
            dH = height;
            dW = height * videoAspect;
        }

        const dX = (width - dW) / 2;
        const dY = (height - dH) / 2;

        ctx.drawImage(this.video, dX, dY, dW, dH);
        return true;
    }

    dispose() {
        if (this.video && this.video.parentNode) {
            this.video.parentNode.removeChild(this.video);
        }
    }
}
