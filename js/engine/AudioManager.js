class AudioManager {
    static instance = null;

    static getInstance() {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.fxGain = this.context.createGain();
        
        // Connect gains to master
        this.musicGain.connect(this.masterGain);
        this.fxGain.connect(this.masterGain);
        
        // Connect master to speakers by default
        this.masterGain.connect(this.context.destination);
        
        this.sounds = new Map();
        this.music = new Map();

        // Set default volumes
        this.masterGain.gain.value = 1.0;
        this.musicGain.gain.value = 0.8;  // Lower music volume
        this.fxGain.gain.value = 0.7;     // Slightly lower FX volume

        // Add initialization state
        this.isInitialized = false;
        
        this.playlists = new Map();
    }

    async resumeContext() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
            console.log('AudioContext resumed');
        }
    }

    createAudioNodes(source, config = {}) {
        const gainNode = this.context.createGain();
        const panNode = this.context.createStereoPanner();
        
        // Configure nodes with provided values or defaults
        gainNode.gain.value = config.volume ?? 1;
        panNode.pan.value = config.pan ?? 0;

        // Connect nodes
        source.connect(panNode);
        panNode.connect(gainNode);
        gainNode.connect(this.fxGain);

        // Apply pitch if specified
        if (config.pitch !== undefined) {
            source.playbackRate.value = config.pitch;
        }

        // Apply decay if specified
        if (config.decay > 0) {
            const startTime = this.context.currentTime;
            gainNode.gain.setValueAtTime(config.volume ?? 1, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + config.decay);
        }

        return { gainNode, panNode };
    }

    async loadSound(key, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.sounds.set(key, audioBuffer);
    }

    async loadMusic(key, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.music.set(key, audioBuffer);
    }

    async resumeContext() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
            console.log('AudioContext resumed');
        }
    }

    async preloadGameSounds(soundManifest = {}, musicTracks = []) {
        try {
            console.log('Loading game sounds...');
            
            // Load standard game sounds from manifest
            const standardSounds = Object.entries(soundManifest).map(([key, url]) => {
                return this.loadSound(key, url);
            });

            // Load music tracks
            const musicLoading = musicTracks.map((track, index) => {
                return this.loadMusic(`track${index}`, track)
                    .then(() => console.log(`Loaded music track: ${track.split('/').pop()}`));
            });

            await Promise.all([...standardSounds, ...musicLoading]);
            
            this.isInitialized = true;
            console.log('All sounds loaded successfully');
            this.checkAudioState();
            
        } catch (error) {
            console.error('Failed to load sounds:', error);
            throw error;
        }
    }

    playSound(key, config = {}) {
        if (!this.isInitialized) {
            console.warn('Attempted to play sound before initialization:', key);
            return null;
        }

        const buffer = this.sounds.get(key);
        if (!buffer) {
            console.warn(`Sound not found: ${key}`);
            return null;
        }

        try {
            const source = this.context.createBufferSource();
            source.buffer = buffer;

            // Create and connect audio processing nodes
            const nodes = this.createAudioNodes(source, config);
            
            source.start(0);
            
            return { source, ...nodes };
        } catch (error) {
            console.error(`Error playing sound ${key}:`, error);
            return null;
        }
    }

    playMusic(key, loop = true) {
        const buffer = this.music.get(key);
        if (buffer) {
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;
            source.connect(this.musicGain);
            source.start(0);
            return source;
        }
    }

    playPlaylistRandom(playlistName, playlistKeys, config = {}) {
        if (!this.isInitialized) return null;

        let playlist = this.playlists.get(playlistName);
        
        // Reset/Initialize playlist if empty
        if (!playlist || playlist.length === 0) {
            playlist = [...playlistKeys];
            // Shuffle
            for (let i = playlist.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
            }
            this.playlists.set(playlistName, playlist);
        }

        const key = playlist.pop();
        return this.playSound(key, config);
    }

    connectToDestination(destination) {
        // Disconnect from speakers
        this.masterGain.disconnect();
        // Connect to new destination
        this.masterGain.connect(destination);
    }

    reconnectToSpeakers() {
        // Reconnect to speakers
        this.masterGain.disconnect();
        this.masterGain.connect(this.context.destination);
    }

    // Add debug method
    checkAudioState() {
        console.log({
            contextState: this.context.state,
            masterVolume: this.masterGain.gain.value,
            fxVolume: this.fxGain.gain.value,
            musicVolume: this.musicGain.gain.value,
            loadedSounds: Array.from(this.sounds.keys()),
            loadedMusic: Array.from(this.music.keys())
        });
    }
}

export default AudioManager;
