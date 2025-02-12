class MusicPlayer {
    constructor() {
        this.tracks = [
            './audio/music/XENOWAR - Dark Matter Protocol.mp3'
        ];
        this.currentTrack = 0;
        this.audioElement = new Audio();
        this.audioElement.volume = 0.4; // Start at 40% volume
        this.isPlaying = false;

        // Setup track ending handler
        this.audioElement.addEventListener('ended', () => {
            this.playNext();
        });
    }

    async start() {
        try {
            await this.playTrack(this.currentTrack);
        } catch (error) {
            console.error('Error starting music:', error);
        }
    }

    async playTrack(index) {
        if (index >= 0 && index < this.tracks.length) {
            this.currentTrack = index;
            this.audioElement.src = this.tracks[index];
            try {
                await this.audioElement.play();
                this.isPlaying = true;
            } catch (error) {
                console.error('Error playing track:', error);
            }
        }
    }

    playNext() {
        this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
        this.playTrack(this.currentTrack);
    }

    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
    }

    resume() {
        this.audioElement.play();
        this.isPlaying = true;
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
    }

    setVolume(value) {
        // Clamp volume between 0 and 1
        this.audioElement.volume = Math.max(0, Math.min(1, value));
    }

    fadeOut(duration = 2) {
        const steps = 60;
        const initialVolume = this.audioElement.volume;
        const volumeStep = initialVolume / steps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.pause();
                this.audioElement.volume = initialVolume;
            } else {
                this.audioElement.volume = initialVolume - (volumeStep * currentStep);
            }
        }, (duration * 1000) / steps);
    }

    fadeIn(duration = 2) {
        const steps = 60;
        const targetVolume = 0.4; // Default volume
        const volumeStep = targetVolume / steps;
        let currentStep = 0;

        this.audioElement.volume = 0;
        this.resume();

        const fadeInterval = setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
            }
            this.audioElement.volume = volumeStep * currentStep;
        }, (duration * 1000) / steps);
    }
}

export default MusicPlayer;
