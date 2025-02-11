export const patterns = {
    infinity: {
        type: 'spline',
        closed: true,
        points: [
            { x: 0.5, y: 0.3 },  // Starting/ending point
            { x: 0.7, y: 0.3 },
            { x: 0.8, y: 0.4 },
            { x: 0.7, y: 0.5 },
            { x: 0.5, y: 0.5 },
            { x: 0.3, y: 0.5 },
            { x: 0.2, y: 0.4 },
            { x: 0.3, y: 0.3 },
            { x: 0.5, y: 0.3 }   // Repeat first point to ensure closure
        ],
        speed: 0.3,
        spacing: {
            radius: 80,
            count: 5
        }
    }
};
