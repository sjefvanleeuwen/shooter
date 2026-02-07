/**
 * Central asset manifest — single source of truth for every loadable asset.
 * The AssetPreloader walks this manifest and verifies every entry is reachable.
 */

export const assets = {

    /* ── Sprites / Images ─────────────────────────────────── */
    sprites: [
        './sprites/player.png',
        './sprites/alien1.png',
        './sprites/xenowar.png',
        './sprites/ui/button-blue.png',
        './sprites/ui/button-red.png',
    ],

    /* ── Backgrounds (level 0, images 1–21) ───────────────── */
    backgrounds: Array.from({ length: 21 }, (_, i) => `./backgrounds/level0/${i + 1}.png`),

    /* ── 3-D models (GLB) ─────────────────────────────────── */
    models: [
        './3d/shield_s.glb',
        './3d/meteor1.glb',
    ],

    /* ── Sound-effects (loaded by AudioManager) ───────────── */
    sfx: [
        './audio/explosion.mp3',
        './audio/player-shoot.mp3',
        './audio/alien-shoot.mp3',
        './audio/alien-forcefield.flac',
        './audio/player-forcefield.wav',
        './audio/shield-gone.mp3',
        './audio/player - energize shields.mp3',
        './audio/xeno-war.mp3',
        // Boss voices
        './audio/boss/boss - hope is a lie.mp3',
        './audio/boss/boss - i am your final mistake.mp3',
        './audio/boss/boss - i divour heros like you.mp3',
        './audio/boss/boss - i will erase you from existence.mp3',
        './audio/boss/boss - run while you still can.mp3',
        './audio/boss/boss - this galaxy will be your grave.mp3',
        './audio/boss/boss - you are already dead.mp3',
        './audio/boss/boss - your end is innevitable.mp3',
        './audio/boss/boss - your prepare for total anihilation.mp3',
    ],

    /* ── Music tracks (loaded on-demand by MusicPlayer) ───── */
    music: [
        './audio/music/XENOWAR - Cyberdyne Systems.m4a',
        './audio/music/XENOWAR - Cyberwave.m4a',
        './audio/music/XENOWAR - Midnight Pursuit.m4a',
        './audio/music/XENOWAR - Power Surge.m4a',
        './audio/music/XENOWAR - Surge Protocol.m4a',
        './audio/music/XENOWAR - Overclocked Fury.mp3',
        './audio/music/XENOWAR - Dark Matter Protocol.mp3',
        './audio/music/XENOWAR - Plasma Rain.mp3',
        './audio/music/XENOWAR - Galactic Outlaws.mp3',
    ],
};

export default assets;
