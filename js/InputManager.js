class InputManager {
    constructor() {
        this.handlers = new Map();
        this.currentScreen = null;
        this.debugHandler = null;
        
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

    handleKeyDown(e) {
        // Handle debug toggle
        if (e.key === 'd' || e.key === 'D') {
            if (this.debugHandler) {
                this.debugHandler();
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
