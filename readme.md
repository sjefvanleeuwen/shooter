<img src="sprites/xenowar.png" alt="XENOWAR Logo" width="600" style="display: block; margin: 20px auto;">

# Xenowar: The Battle for Earth
In the year 2150, Earth faced an unprecedented threat. Alien invaders from the distant galaxy of Xenos had launched a full-scale assault on our planet. These extraterrestrial beings, known as the Xenons, were relentless and technologically superior, leaving humanity on the brink of extinction.

As cities fell and hope dwindled, a group of elite pilots emerged from the shadows. These brave warriors, equipped with advanced fighter jets and cutting-edge weaponry, formed the last line of defense against the Xenon invasion. They called themselves the Guardians.

Among the Guardians was a young pilot named Alex, who had lost everything to the Xenons. Fueled by a desire for revenge and a determination to protect what remained of humanity, Alex took to the skies, ready to face the alien menace head-on.

The battle for Earth had begun, and the fate of humanity rested in the hands of the Guardians. This is the story of Xenowar.

## Overview
XENOWAR is a high-performance space shooter game engine built with vanilla JavaScript and a custom **WebGL 2.0** rendering pipeline. It features a component-based architecture, advanced GPU-accelerated particle systems, complex formation patterns, and dynamic audio management.

# XENOWAR Engine Documentation

## Build Pipeline and Development Flow

```mermaid
graph TD
    A[Source Code] --> B[Vite Dev Server]
    B --> C[Hot Module Replacement]
    A --> D[Build Process]
    D --> E[JavaScript Minification]
    D --> F[Asset Optimization]
    D --> G[Shader Compilation]
    E & F & G --> H[Production Bundle]
    H --> I[GitHub Pages Deploy]
```

## Development Setup

### Prerequisites
```bash
# Required software
- Node.js 18+
- npm 9+
- Modern web browser with WebGL2 support

# Installation
npm install    # Install dependencies
npm run dev    # Start development server
npm run build  # Create production build
```

### Build Configuration

The build process includes an asset optimization step that can be configured for different visual styles using the `BUILD_MODE` environment variable.

| Mode | Description |
|------|-------------|
| `modern` | **(Default)** High-resolution assets, 256+ colors, smooth gradients, and reduced banding. Ideal for modern HD displays. |
| `retro` | Classic 16-color palette, lower resolution, and dithering for an authentic retro feel. |

**Usage:**

**Windows (PowerShell):**
```powershell
# Build with default modern settings
npm run build

# Build with retro settings
$env:BUILD_MODE="retro"; npm run build
```

**Linux / macOS / Bash:**
```bash
# Build with default modern settings
npm run build

# Build with retro settings
BUILD_MODE=retro npm run build
```

This configuration is also used in the GitHub Actions deployment pipeline (defaulting to `modern`).

## Core Systems Architecture

### Rendering Pipeline
```mermaid
graph LR
    A[Game State] --> B[Custom WebGL Renderer]
    B --> C[GPU Particle Engine]
    C --> D[Post-Processing Layer]
    D --> E[CRT Logic & Shaders]
    E --> F[Display Output]
```

### CRT Shader System
```javascript
// Configurable shader parameters
{
  "scanline": {
    "intensity": 0.28,    // Scanline strength
    "count": 1024.0,      // Number of scanlines
    "rollingSpeed": 10.3  // Rolling speed
  },
  "screenEffects": {
    "vignetteStrength": 0.22,
    "brightness": 1.1,
    "curvature": 0.1
  }
}
```

## Asset Pipeline

### Image Processing
- Automatic sprite optimization
- Background texture processing
- Dimension verification
- Palette optimization
- Compression profiles

### Audio System
- Web Audio API integration
- Spatial audio support
- Dynamic music system
- Sound effect manager
- Audio pooling

## Performance Optimizations

### Memory Management
- Object pooling for particles
- Texture atlasing
- Asset preloading
- Garbage collection optimization
- Memory monitoring

### Rendering Optimizations
- **Custom WebGL 2.0 Core**: Low-level GPU-accelerated graphics pipeline.
- **GLSL Shaders**: High-performance fragment and vertex shaders for all entities.
- **Hardware-Accelerated Effects**: Texture filtering, mipmapping, and alpha blending.
- **Batch-Style Rendering**: Efficient draw calls for sprites and shape primitives.
- **Matrix Stack**: Manual GPU-friendly transformation system for complex entity movement.

## Technical Architecture

### Core Components
```mermaid
graph TD
    A[Game Core] --> B[Renderer]
    A --> C[Audio System]
    A --> D[Input Manager]
    B --> E[Particle Engine]
    B --> F[Post-Processing]
    C --> G[Music Player]
    C --> H[SFX Manager]
```

### Component Communication
- Event-based messaging
- Component lifecycle management
- State synchronization
- Update hierarchy
- Resource sharing

## Debug Features

### Performance Monitoring
```javascript
// Enable debug mode
engine.debug.enableProfiling();
engine.debug.showStats();
```

### Debug Commands
- `debug.showColliders()` - Show collision bounds
- `debug.showFPS()` - Display FPS counter
- `debug.profile()` - Start performance profiling
- `debug.showPoolStats()` - Display object pool stats

## Asset Requirements

### Sprites
- Format: PNG with transparency
- Dimensions: Power of 2 recommended
- Maximum size: 2048x2048
- Color depth: 32-bit RGBA

### Audio
- Format: MP3/M4A
- Sample rate: 44.1kHz
- Bit depth: 16-bit
- Channels: Stereo

## Build Configuration

### Development Build
```bash
npm run dev
# Starts development server with:
# - Hot module replacement
# - Source maps
# - Debug tools
# - Uncompressed assets
```

### Production Build
```bash
npm run build
# Creates optimized build with:
# - Minified JavaScript
# - Compressed assets
# - Dead code elimination
# - Bundled modules
```

## Performance Guidelines

### Best Practices
1. Use object pooling for frequent allocations
2. Batch WebGL draw calls
3. Minimize garbage collection
4. Pre-render static elements
5. Implement efficient collision detection

### Memory Management
- Monitor heap usage
- Implement dispose patterns
- Cache frequently used objects
- Clear unused resources
- Manage texture memory

## Contributing Guidelines

### Code Style
```javascript
// Use ES6+ features for modern JavaScript
class Component {
    constructor() {
        this.pool = new Pool();
    }
    
    update(deltaTime) {
        // Use object pooling
        this.pool.forEach(entity => {
            // Entity updates
        });
    }
}
```

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Follow code style guide
4. Update documentation
5. Submit pull request
