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
    sfx: {
        'explosion': './audio/explosion.mp3',
        'laser': './audio/player-shoot.mp3',
        'alien-laser': './audio/alien-shoot.mp3',
        'forcefield': './audio/alien-forcefield.flac',
        'player-forcefield': './audio/player-forcefield.wav',
        'shield-gone': './audio/shield-gone.mp3',
        'energize-shields': './audio/player - energize shields.mp3',
        'xeno-war': './audio/xeno-war.mp3',
        
        // Boss voices
        'boss_hope': './audio/boss/boss - hope is a lie.mp3',
        'boss_mistake': './audio/boss/boss - i am your final mistake.mp3',
        'boss_devour': './audio/boss/boss - i divour heros like you.mp3',
        'boss_erase': './audio/boss/boss - i will erase you from existence.mp3',
        'boss_run': './audio/boss/boss - run while you still can.mp3',
        'boss_galaxy': './audio/boss/boss - this galaxy will be your grave.mp3',
        'boss_dead': './audio/boss/boss - you are already dead.mp3',
        'boss_inevitable': './audio/boss/boss - your end is innevitable.mp3',
        'boss_annihilation': './audio/boss/boss - your prepare for total anihilation.mp3',
    },

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
