export const patterns = {
    infinity: {
        type: 'spline',
        closed: true,
        points: [
            { x: 0.5, y: 0.3 }, { x: 0.6, y: 0.3 }, { x: 0.7, y: 0.4 },
            { x: 0.6, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.4, y: 0.5 },
            { x: 0.3, y: 0.4 }, { x: 0.4, y: 0.3 }, { x: 0.5, y: 0.3 }
        ],
        speed: 0.3, spacing: { radius: 120, count: 8 }
    },
    sinusoidal: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.sin(t * Math.PI * 2) * 0.15, // Reduced x-sway 0.2->0.15
            y: 0.2 + Math.cos(t * Math.PI * 4) * 0.05
        }),
        speed: 0.2,
        spacing: { radius: 140, count: 12 } // Reduced radius 160->140
    },
    vortex: {
        type: 'functional',
        func: (t) => {
            const r = 0.1 + Math.sin(t * Math.PI * 2) * 0.1; // Reduced range
            return {
                x: 0.5 + Math.cos(t * Math.PI * 6) * r,
                y: 0.3 + Math.sin(t * Math.PI * 6) * r
            };
        },
        speed: 0.15,
        spacing: { radius: 140, count: 10 }
    },
    diamond_weave: {
        type: 'functional',
        func: (t) => {
            const phase = t * Math.PI * 2;
            return {
                x: 0.5 + (Math.abs(Math.cos(phase)) * Math.cos(phase)) * 0.2, // Reduced width 0.25->0.2
                y: 0.3 + (Math.abs(Math.sin(phase)) * Math.sin(phase)) * 0.15
            };
        },
        speed: 0.25,
        spacing: { radius: 140, count: 10 }
    },
    clover: {
        type: 'functional',
        func: (t) => {
            const r = 0.15 * Math.sin(2 * t * Math.PI * 2); // Reduced range 0.2->0.15
            return {
                x: 0.5 + Math.cos(t * Math.PI * 2) * r,
                y: 0.3 + Math.sin(t * Math.PI * 2) * r
            };
        },
        speed: 0.2,
        spacing: { radius: 150, count: 12, type: 'circular' }
    },
    grid_strike: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.sin(t * Math.PI * 2) * 0.1, // Reduced sweep 0.15->0.1
            y: 0.2 + (1 - Math.cos(t * Math.PI * 2)) * 0.05
        }),
        speed: 0.2,
        spacing: { type: 'grid', cols: 4, spacing: 100, count: 12 } // Reduced spacing 130->100
    },
    arrowhead: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.cos(t * Math.PI * 2) * 0.2, // Reduced sweep 0.25->0.2
            y: 0.3 + Math.sin(t * Math.PI * 4) * 0.1
        }),
        speed: 0.2,
        spacing: { type: 'v_shape', count: 7, spacing: 90 } // Reduced spacing 110->90
    },
    x_formation: {
        type: 'functional',
        func: (t) => ({
            x: 0.5,
            y: 0.3 + Math.sin(t * Math.PI * 2) * 0.1
        }),
        speed: 0.1,
        spacing: { type: 'cross', count: 9, spacing: 75 } // Reduced spacing 90->75
    },
    boss_wave: {
        type: 'functional',
        isBoss: true,
        func: (t) => ({
            // More complex sway: slight evade + primary loop
            x: 0.5 + Math.sin(t * Math.PI * 2) * 0.2 + Math.sin(t * Math.PI * 5) * 0.1, 
            y: 0.15 + Math.cos(t * Math.PI * 2) * 0.05
        }),
        speed: 0.05,
        spacing: { type: 'circular', count: 7, radius: 300 } // 1 boss + 6 small escorts
    }
};
