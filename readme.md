<img src="sprites/xenowar.png" alt="XENOWAR Logo" width="600" style="display: block; margin: 20px auto;">

# Xenowar: The Battle for Earth
In the year 2150, Earth faced an unprecedented threat. Alien invaders from the distant galaxy of Xenos had launched a full-scale assault on our planet. These extraterrestrial beings, known as the Xenons, were relentless and technologically superior, leaving humanity on the brink of extinction.

As cities fell and hope dwindled, a group of elite pilots emerged from the shadows. These brave warriors, equipped with advanced fighter jets and cutting-edge weaponry, formed the last line of defense against the Xenon invasion. They called themselves the Guardians.

Among the Guardians was a young pilot named Alex, who had lost everything to the Xenons. Fueled by a desire for revenge and a determination to protect what remained of humanity, Alex took to the skies, ready to face the alien menace head-on.

The battle for Earth had begun, and the fate of humanity rested in the hands of the Guardians. This is the story of Xenowar.

## Overview
XENOWAR is a modern HTML5 Canvas-based space shooter game engine built with vanilla JavaScript, featuring a component-based architecture, particle systems, formation patterns, and dynamic audio management.

## Architecture

### Core Systems
- **Game Loop**: Implements a request animation frame-based game loop with delta time
- **Virtual Resolution**: Uses a 1080x1080 virtual resolution with dynamic scaling
- **State Management**: Screen-based state system (Startup, Intro, Game)
- **Event System**: DOM-based event handling for input
- **Asset Management**: Dynamic loading of images and audio

### Key Components

#### Rendering System
- Canvas-based rendering with hardware acceleration
- Multiple render layers (Background, Entities, Particles, HUD)
- Screen space transformation and scaling
- Offscreen canvas for performance optimization
- Particle pre-rendering

#### Audio System
- Dynamic audio loading and playback
- Web Audio API integration
- Spatial audio with panning
- Music playlist management with shuffling
- Sound effects with pitch variation

#### Particle Systems
- Pooled particle management
- Multiple particle types (Engine, Laser, Explosion)
- Hardware-accelerated rendering
- Performance-optimized with pre-rendering
- Screen-space culling

#### Formation System
- Dynamic pattern-based formations
- Spline-based movement paths
- Bezier curve interpolation
- Pattern switching with smooth transitions
- Difficulty-based scaling

### Technical Features

#### Performance Optimizations
- Object pooling for particles
- Pre-rendered particle effects
- Offscreen canvas usage
- Efficient collision detection
- Memory management for disposable objects

#### Visual Effects
- Dynamic lighting and glow effects
- Screen-space composition
- Particle trails and explosions
- Background parallax scrolling
- Screen shake and flash effects

#### Audio Features
- Dynamic music system
- Positional audio effects
- Volume fading and transitions
- Multiple audio channels
- Pitch shifting for variety

#### Input Handling
- Keyboard input management
- Event debouncing
- Screen-specific input handlers
- Input state tracking

### File Structure
```
/shooter
├── index.html           # Main entry point
├── js/
│   ├── game.js         # Core game engine
│   ├── player.js       # Player entity
│   ├── alien.js        # Enemy entities
│   ├── patterns/       # Formation patterns
│   ├── screens/        # Game screens
│   ├── effects/        # Visual effects
│   ├── audio/         # Audio management
│   └── math/          # Math utilities
├── audio/             # Audio assets
├── sprites/           # Image assets
└── backgrounds/       # Background images
```

### Core Classes

#### Game Class
- Main game loop management
- State management
- Resource management
- Input handling
- Screen management

#### ParticleEngine
- Particle pool management
- Particle updating
- Efficient rendering
- Performance optimization

#### Formation System
- Pattern-based movement
- Enemy formation management
- Difficulty scaling
- Collision detection

#### AudioManager
- Music playlist management
- Sound effect handling
- Spatial audio
- Volume control

### Building and Running

1. Clone the repository
2. Serve with any HTTP server (e.g., `python -m http.server`)
3. Open in a modern browser

### Performance Considerations
- Uses requestAnimationFrame for smooth animation
- Implements object pooling for particles
- Pre-renders common visual effects
- Optimizes canvas state changes
- Implements efficient collision detection

### Future Improvements
- WebGL rendering pipeline
- Additional formation patterns
- Enhanced particle effects
- More audio features
- Mobile support

## License
MIT License
