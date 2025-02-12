class MusicPlayer {
    constructor() {
        this.tracks = [
            './audio/music/XENOWAR - Dark Matter Protocol.mp3',
            './audio/music/XENOWAR - Galactic Outlaws.mp3'
        ];
        
        // Add playlist management
        this.playlist = [...this.tracks]; // Copy tracks for shuffling
        this.currentTrack = 0;
        this.audioElement = new Audio();
        this.audioElement.volume = 0.4;
        this.isPlaying = false;

        // Shuffle initial playlist
        this.shufflePlaylist();

        // Setup track ending handler
        this.audioElement.addEventListener('ended', () => {
            this.playNext();
        });
    }

    shufflePlaylist() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
        }
        this.currentTrack = 0;
    }

    async start() {
        try {
            await this.playTrack(this.currentTrack);
        } catch (error) {
            console.error('Error starting music:', error);
        }
    }

    async playTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            const trackPath = this.playlist[index];
            this.audioElement.src = trackPath;
            try {
                await this.audioElement.play();
                this.isPlaying = true;
                console.log('Now playing:', trackPath.split('/').pop());
            } catch (error) {
                console.error('Error playing track:', error);
            }
        }
    }

    async playNext() {
        this.currentTrack++;
        // If we've reached the end, shuffle and start over
        if (this.currentTrack >= this.playlist.length) {
            this.shufflePlaylist();
        }
        await this.playTrack(this.currentTrack);
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
