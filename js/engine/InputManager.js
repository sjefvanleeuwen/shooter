class InputManager {
    constructor() {
        this.handlers = new Map();
        this.currentScreen = null;
        this.debugHandler = null;
        this.recordingHandler = null;
        
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    setCurrentScreen(screenName) {
        this.currentScreen = screenName;
    }

    registerScreen(screenName, handler) {
        this.handlers.set(screenName, handler);
    }

    setDebugHandler(callback) {
        this.debugHandler = callback;
    }

    setRecordingHandler(callback) {
        this.recordingHandler = callback;
    }

    handleKeyDown(e) {
        // Handle debug toggle
        if (e.key === 'f' || e.key === 'F') {
            if (this.debugHandler) {
                this.debugHandler();
            }
            return;
        }

        // Handle recording toggle
        if (e.key === 'r' || e.key === 'R') {
            if (this.recordingHandler) {
                this.recordingHandler();
            }
            return;
        }

        // Handle screen-specific input
        if (this.currentScreen && this.handlers.has(this.currentScreen)) {
            const handler = this.handlers.get(this.currentScreen);
            const nextScreen = handler(e.key);
            if (nextScreen) {
                return nextScreen;
            }
        }
    }
}

export default InputManager;
