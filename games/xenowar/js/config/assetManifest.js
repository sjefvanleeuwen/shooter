/**
 * Central asset manifest — single source of truth for every loadable asset.
 * The AssetPreloader walks this manifest and verifies every entry is reachable.
 */

export const assets = {

    /* ── Sprites / Images ─────────────────────────────────── */
    sprites: [
        'games/xenowar/sprites/player.png',
        'games/xenowar/sprites/alien1.png',
        'games/xenowar/sprites/xenowar.png',
        'games/xenowar/sprites/ui/button-blue.png',
        'games/xenowar/sprites/ui/button-red.png',
    ],

    /* ── Backgrounds (level 0, images 1–21) ───────────────── */
    backgrounds: Array.from({ length: 21 }, (_, i) => `games/xenowar/backgrounds/level0/${i + 1}.png`),

    /* ── 3-D models (GLB) ─────────────────────────────────── */
    models: [
        'games/xenowar/3d/shield_s.glb',
    ],

    /* ── Sound-effects (loaded by AudioManager) ───────────── */
    sfx: {
        'explosion': 'games/xenowar/audio/explosion.mp3',
        'laser': 'games/xenowar/audio/player-shoot.mp3',
        'alien-laser': 'games/xenowar/audio/alien-shoot.mp3',
        'forcefield': 'games/xenowar/audio/alien-forcefield.flac',
        'player-forcefield': 'games/xenowar/audio/player-forcefield.wav',
        'shield-gone': 'games/xenowar/audio/shield-gone.mp3',
        'energize-shields': 'games/xenowar/audio/player - energize shields.mp3',
        'xeno-war': 'games/xenowar/audio/xeno-war.mp3',
        
        // Boss voices
        'boss_hope': 'games/xenowar/audio/boss/boss - hope is a lie.mp3',
        'boss_mistake': 'games/xenowar/audio/boss/boss - i am your final mistake.mp3',
        'boss_devour': 'games/xenowar/audio/boss/boss - i divour heros like you.mp3',
        'boss_erase': 'games/xenowar/audio/boss/boss - i will erase you from existence.mp3',
        'boss_run': 'games/xenowar/audio/boss/boss - run while you still can.mp3',
        'boss_galaxy': 'games/xenowar/audio/boss/boss - this galaxy will be your grave.mp3',
        'boss_dead': 'games/xenowar/audio/boss/boss - you are already dead.mp3',
        'boss_inevitable': 'games/xenowar/audio/boss/boss - your end is innevitable.mp3',
        'boss_annihilation': 'games/xenowar/audio/boss/boss - your prepare for total anihilation.mp3',
    },

    /* ── Music tracks (loaded on-demand by MusicPlayer) ───── */
    music: [
        'games/xenowar/audio/music/XENOWAR - Cyberdyne Systems.m4a',
        'games/xenowar/audio/music/XENOWAR - Cyberwave.m4a',
        'games/xenowar/audio/music/XENOWAR - Midnight Pursuit.m4a',
        'games/xenowar/audio/music/XENOWAR - Power Surge.m4a',
        'games/xenowar/audio/music/XENOWAR - Surge Protocol.m4a',
        'games/xenowar/audio/music/XENOWAR - Overclocked Fury.mp3',
        'games/xenowar/audio/music/XENOWAR - Dark Matter Protocol.mp3',
        'games/xenowar/audio/music/XENOWAR - Plasma Rain.mp3',
        'games/xenowar/audio/music/XENOWAR - Galactic Outlaws.mp3',
    ],
};

export default assets;
