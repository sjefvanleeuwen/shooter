export const patterns = {
    infinity: {
        type: 'spline',
        closed: true,
        points: [
            { x: 0.5, y: 0.3 }, { x: 0.7, y: 0.3 }, { x: 0.8, y: 0.4 },
            { x: 0.7, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.3, y: 0.5 },
            { x: 0.2, y: 0.4 }, { x: 0.3, y: 0.3 }, { x: 0.5, y: 0.3 }
        ],
        speed: 0.3, spacing: { radius: 180, count: 10 }
    },
    sinusoidal: {
        type: 'functional',
        func: (t) => ({
            x: 0.5 + Math.sin(t * Math.PI * 2) * 0.3,
            y: 0.2 + Math.cos(t * Math.PI * 4) * 0.05
        }),
        speed: 0.2,
        spacing: { radius: 220, count: 14 }
    },
    vortex: {
        type: 'functional',
        func: (t) => {
            const r = 0.1 + Math.sin(t * Math.PI * 2) * 0.15;
            return {
                x: 0.5 + Math.cos(t * Math.PI * 6) * r,
                y: 0.3 + Math.sin(t * Math.PI * 6) * r
            };
        },
        speed: 0.15,
        spacing: { radius: 200, count: 12 }
    },
    diamond_weave: {
        type: 'functional',
        func: (t) => {
            const phase = t * Math.PI * 2;
            return {
                x: 0.5 + (Math.abs(Math.cos(phase)) * Math.cos(phase)) * 0.35,
                y: 0.3 + (Math.abs(Math.sin(phase)) * Math.sin(phase)) * 0.15
            };
        },
        speed: 0.25,
        spacing: { radius: 180, count: 12 }
    },
    clover: {
        type: 'functional',
        func: (t) => {
            const r = 0.3 * Math.sin(2 * t * Math.PI * 2);
            return {
                x: 0.5 + Math.cos(t * Math.PI * 2) * r,
                y: 0.3 + Math.sin(t * Math.PI * 2) * r
            };
        },
        speed: 0.2,
        spacing: { radius: 240, count: 16 }
    }
};
