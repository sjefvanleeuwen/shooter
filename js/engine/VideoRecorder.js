class VideoRecorder {
    constructor(canvas, audioManager) {
        this.canvas = canvas;
        this.audioManager = audioManager;
        this.chunks = [];
        this.recording = false;
        this.mediaRecorder = null;
    }

    async startRecording() {
        this.chunks = [];
        const videoStream = this.canvas.captureStream(60);
        
        // Create audio stream destination
        const dest = this.audioManager.context.createMediaStreamDestination();
        this.audioManager.masterGain.connect(dest);
        this.audioStreamDestination = dest;
        
        // Combine video and audio tracks
        const tracks = [
            ...videoStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
        ];
        
        const finalStream = new MediaStream(tracks);

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
            ? 'video/webm;codecs=vp9' 
            : 'video/webm';

        this.mediaRecorder = new MediaRecorder(finalStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 8000000, // Reduced from 8Mbps to 5Mbps for better perf
            audioBitsPerSecond: 128000
        });

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.chunks.push(e.data);
            }
        };

        this.mediaRecorder.start();
        this.recording = true;
        console.log('Recording started (video + audio)');
    }

    stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Clean up audio connection
                if (this.audioStreamDestination) {
                    this.audioManager.masterGain.disconnect(this.audioStreamDestination);
                    this.audioStreamDestination = null;
                }

                const blob = new Blob(this.chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const prefix = window.engine?.gameId || 'game';
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                a.download = `${prefix}-replay-${timestamp}.webm`;
                a.click();
                URL.revokeObjectURL(url);
                this.recording = false;
                resolve();
            };
            this.mediaRecorder.stop();
        });
    }

    isRecording() {
        return this.recording;
    }
}

export default VideoRecorder;
