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
        let combinedStream;

        if (this.audioManager) {
            try {
                const audioDestination = this.audioManager.context.createMediaStreamDestination();
                
                // Create a splitter node to send audio to both destinations
                const splitterNode = this.audioManager.context.createGain();
                this.audioManager.masterGain.connect(splitterNode);
                
                // Route 1: To recording
                splitterNode.connect(audioDestination);
                // Route 2: Keep connected to speakers
                splitterNode.connect(this.audioManager.context.destination);
                
                combinedStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...audioDestination.stream.getAudioTracks()
                ]);
            } catch (e) {
                console.warn('Failed to capture audio, recording video only:', e);
                combinedStream = videoStream;
            }
        } else {
            combinedStream = videoStream;
        }

        this.mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus'
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
                // No need to reconnect to speakers since we never disconnected
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `xenowar-replay-${Date.now()}.webm`;
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
