class SplineCurve {
    constructor(points, closed = true) {
        this.originalPoints = points;
        this.closed = closed;
        
        // For closed curves, add extra points to ensure smooth wrapping
        if (closed) {
            this.points = [
                points[points.length - 2], // Second to last point
                ...points,                 // All original points
                points[1],                 // Second point
                points[2]                  // Third point
            ];
        } else {
            this.points = points;
        }
        
        this.segments = this.originalPoints.length - 1;
    }

    getPoint(t) {
        // Ensure perfect looping by clamping t
        t = t % 1;
        if (t < 0) t += 1;
        
        // Calculate segment and local t
        const segment = Math.min(Math.floor(t * this.segments), this.segments - 1);
        const segmentT = (t * this.segments) % 1;

        // Get four points for interpolation
        const p0 = this.points[segment];
        const p1 = this.points[segment + 1];
        const p2 = this.points[segment + 2];
        const p3 = this.points[segment + 3];

        // Catmull-Rom calculation with tension parameter
        const tension = 0.5;
        const t2 = segmentT * segmentT;
        const t3 = t2 * segmentT;

        return {
            x: this.interpolate(p0.x, p1.x, p2.x, p3.x, segmentT, tension),
            y: this.interpolate(p0.y, p1.y, p2.y, p3.y, segmentT, tension)
        };
    }

    interpolate(p0, p1, p2, p3, t, tension) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        return (2 * p1 +
            (-p0 + p2) * tension * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * tension * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * tension * t3);
    }

    getTangent(t) {
        const delta = 0.001;
        const p1 = this.getPoint(t - delta);
        const p2 = this.getPoint(t + delta);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return {
            x: dx / length,
            y: dy / length
        };
    }
}

export default SplineCurve;
