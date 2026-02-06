export const patterns = {
    infinity: {
        type: 'spline',
        closed: true,
        points: [
            { x: 0.5, y: 0.3 }, { x: 0.7, y: 0.3 }, { x: 0.8, y: 0.4 },
            { x: 0.7, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.3, y: 0.5 },
            { x: 0.2, y: 0.4 }, { x: 0.3, y: 0.3 }, { x: 0.5, y: 0.3 }
        ],
        speed: 0.3, spacing: { radius: 200, count: 8 } // Reduced count from 10 to 8, increased radius
    },
    sinusoidal: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.sin(t * Math.PI * 2) * 0.25, // Reduced x-sway for safety
            y: 0.2 + Math.cos(t * Math.PI * 4) * 0.05
        }),
        speed: 0.2,
        spacing: { radius: 250, count: 12 } // Reduced count from 14 to 12, increased radius
    },
    vortex: {
        type: 'functional',
        func: (t) => {
            const r = 0.1 + Math.sin(t * Math.PI * 2) * 0.12; // Reduced range
            return {
                x: 0.5 + Math.cos(t * Math.PI * 6) * r,
                y: 0.3 + Math.sin(t * Math.PI * 6) * r
            };
        },
        speed: 0.15,
        spacing: { radius: 220, count: 10 } // Reduced count 12 -> 10
    },
    diamond_weave: {
        type: 'functional',
        func: (t) => {
            const phase = t * Math.PI * 2;
            return {
                x: 0.5 + (Math.abs(Math.cos(phase)) * Math.cos(phase)) * 0.3, // Reduced width
                y: 0.3 + (Math.abs(Math.sin(phase)) * Math.sin(phase)) * 0.15
            };
        },
        speed: 0.25,
        spacing: { radius: 200, count: 10 } // Reduced count 12 -> 10, increased radius
    },
    clover: {
        type: 'functional',
        func: (t) => {
            const r = 0.25 * Math.sin(2 * t * Math.PI * 2); // Reduced range
            return {
                x: 0.5 + Math.cos(t * Math.PI * 2) * r,
                y: 0.3 + Math.sin(t * Math.PI * 2) * r
            };
        },
        speed: 0.2,
        spacing: { radius: 260, count: 12, type: 'circular' } // Reduced count 16 -> 12, increased radius
    },
    grid_strike: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.sin(t * Math.PI * 2) * 0.15, // Reduced sweep
            y: 0.2 + Math.abs(Math.cos(t * Math.PI)) * 0.1
        }),
        speed: 0.2,
        spacing: { type: 'grid', cols: 4, spacing: 130, count: 12 } // Increased spacing 100 -> 130
    },
    arrowhead: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.cos(t * Math.PI * 2) * 0.25, // Reduced sweep
            y: 0.3 + Math.sin(t * Math.PI * 4) * 0.1
        }),
        speed: 0.2,
        spacing: { type: 'v_shape', count: 7, spacing: 110 } // Reduced count 9 -> 7, increased spacing
    },
    x_formation: {
        type: 'functional',
        func: (t) => ({
            x: 0.5,
            y: 0.3 + Math.sin(t * Math.PI * 2) * 0.1
        }),
        speed: 0.1,
        spacing: { type: 'cross', count: 9, spacing: 90 } // Reduced count 13 -> 9, increased spacing
    },
    boss_wave: {
        type: 'functional',
        isBoss: true,
        func: (t) => ({
            x: 0.5 + Math.sin(t * Math.PI) * 0.2,
            y: 0.15 + Math.cos(t * Math.PI * 2) * 0.05
        }),
        speed: 0.05,
        spacing: { type: 'circular', count: 7, radius: 300 } // 1 boss + 6 small escorts
    }
};
