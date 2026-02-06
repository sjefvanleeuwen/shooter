import AudioManager from './AudioManager.js';

class MusicPlayer {
    constructor() {
        this.tracks = [
            './audio/music/XENOWAR - Cyberdyne Systems.m4a',
            './audio/music/XENOWAR - Cyberwave.m4a',
            './audio/music/XENOWAR - Midnight Pursuit.m4a',
            './audio/music/XENOWAR - Power Surge.m4a',
            './audio/music/XENOWAR - Surge Protocol.m4a',
            './audio/music/XENOWAR - Overclocked Fury.mp3',
            './audio/music/XENOWAR - Dark Matter Protocol.mp3',
            './audio/music/XENOWAR - Plasma Rain.mp3',
            './audio/music/XENOWAR - Galactic Outlaws.mp3'
        ];
        
        // Add playlist management
        this.playlist = [...this.tracks]; // Copy tracks for shuffling
        this.currentTrack = 0;

        // Replace Audio element with Web Audio nodes
        this.audioManager = AudioManager.getInstance();
        this.audioContext = this.audioManager.context;
        this.currentSource = null;
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioManager.musicGain);
        this.gainNode.gain.value = 0.8;
        
        this.loadedBuffers = new Map(); // Cache for loaded audio buffers
        this.isPlaying = false;

        // Shuffle initial playlist
        this.shufflePlaylist();
    }

    getTracks() {
        return this.tracks;
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
            await this.audioManager.resumeContext();
            await this.playTrack(this.currentTrack);
        } catch (error) {
            console.error('Error starting music:', error);
        }
    }

    async loadAudioFile(url) {
        // Check cache first
        if (this.loadedBuffers.has(url)) {
            return this.loadedBuffers.get(url);
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.loadedBuffers.set(url, audioBuffer); // Cache the buffer
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load audio file ${url}:`, error);
            throw error;
        }
    }

    async playTrack(index) {
        await this.audioManager.resumeContext();
        if (index >= 0 && index < this.playlist.length) {
            const trackPath = this.playlist[index];
            try {
                // Stop current track if playing
                if (this.currentSource) {
                    this.currentSource.stop();
                }

                const audioBuffer = await this.loadAudioFile(trackPath);
                this.currentSource = this.audioContext.createBufferSource();
                this.currentSource.buffer = audioBuffer;
                this.currentSource.connect(this.gainNode);
                
                this.currentSource.onended = () => {
                    if (this.isPlaying) {
                        this.playNext();
                    }
                };

                this.currentSource.start();
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
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
        this.isPlaying = false;
    }

    resume() {
        if (!this.isPlaying) {
            return this.playTrack(this.currentTrack);
        }
        return Promise.resolve();
    }

    stop() {
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
        this.isPlaying = false;
    }

    setVolume(value) {
        this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    fadeOut(duration = 2) {
        const currentTime = this.audioContext.currentTime;
        this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
        setTimeout(() => {
            this.pause();
            this.gainNode.gain.value = 0.4;
        }, duration * 1000);
    }

    async fadeIn(duration = 2) {
        this.gainNode.gain.value = 0;
        await this.resume();
        const currentTime = this.audioContext.currentTime;
        this.gainNode.gain.linearRampToValueAtTime(0.4, currentTime + duration);
    }
}

export default MusicPlayer;
