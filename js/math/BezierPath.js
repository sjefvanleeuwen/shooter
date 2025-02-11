class BezierPath {
    constructor(centerX, centerY, radius, points = 8) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.baseRadius = radius;
        this.radius = radius;
        this.numPoints = points;
        this.tension = 0.3;
        this.lastPoint = null;
        this.lastTangent = null;
        this.smoothingFactor = 0.95; // Higher = smoother but slower to react
        this.speed = 1.0;
        this.generatePath();
    }

    generatePath() {
        // Generate control points in a pleasing curve
        this.points = [];
        const angleStep = (Math.PI * 2) / this.numPoints;
        
        // First, create base points in a modified figure-8
        for (let i = 0; i <= this.numPoints; i++) {
            const angle = i * angleStep;
            const x = this.centerX + Math.sin(angle * 2) * (this.radius * 0.7);
            const y = this.centerY + Math.sin(angle) * (this.radius * 0.4);
            this.points.push({ x, y });
        }

        // Add control points for smooth curves
        this.controlPoints = [];
        for (let i = 0; i < this.points.length - 1; i++) {
            const p0 = this.points[i];
            const p1 = this.points[(i + 1) % this.points.length];
            
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const len = Math.sqrt(dx * dx + dy * dy) * this.tension;
            
            this.controlPoints.push({
                c1: {
                    x: p0.x + dx * 0.25,
                    y: p0.y + dy * 0.25
                },
                c2: {
                    x: p1.x - dx * 0.25,
                    y: p1.y - dy * 0.25
                }
            });
        }
    }

    setRadius(newRadius) {
        this.radius = newRadius;
        this.generatePath();
    }

    setSpeed(newSpeed) {
        this.speed = newSpeed;
    }

    getPoint(t) {
        // Get raw point from bezier curve
        const rawPoint = this.getRawPoint(t);
        
        // Initialize last point if needed
        if (!this.lastPoint) {
            this.lastPoint = { ...rawPoint };
            return rawPoint;
        }

        // Smoothly interpolate to new position
        this.lastPoint.x += (rawPoint.x - this.lastPoint.x) * (1 - this.smoothingFactor);
        this.lastPoint.y += (rawPoint.y - this.lastPoint.y) * (1 - this.smoothingFactor);

        return { ...this.lastPoint };
    }

    getRawPoint(t) {
        // Original getPoint logic moved here
        t = t % 1;
        if (t < 0) t += 1;

        const numSegments = this.points.length - 1;
        const segment = Math.floor(t * numSegments);
        const segmentT = (t * numSegments) % 1;

        const p0 = this.points[segment];
        const p1 = this.points[(segment + 1) % this.points.length];
        const cp = this.controlPoints[segment];

        return this.cubicBezier(p0, cp.c1, cp.c2, p1, segmentT);
    }

    cubicBezier(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        return {
            x: p0.x * mt3 + 3 * p1.x * mt2 * t + 3 * p2.x * mt * t2 + p3.x * t3,
            y: p0.y * mt3 + 3 * p1.y * mt2 * t + 3 * p2.y * mt * t2 + p3.y * t3
        };
    }

    getTangent(t) {
        // Get raw tangent
        const rawTangent = this.getRawTangent(t);
        
        // Initialize last tangent if needed
        if (!this.lastTangent) {
            this.lastTangent = { ...rawTangent };
            return rawTangent;
        }

        // Smoothly interpolate tangent
        this.lastTangent.x += (rawTangent.x - this.lastTangent.x) * (1 - this.smoothingFactor);
        this.lastTangent.y += (rawTangent.y - this.lastTangent.y) * (1 - this.smoothingFactor);

        // Normalize the interpolated tangent
        const length = Math.sqrt(
            this.lastTangent.x * this.lastTangent.x + 
            this.lastTangent.y * this.lastTangent.y
        );
        
        return {
            x: this.lastTangent.x / length,
            y: this.lastTangent.y / length
        };
    }

    getRawTangent(t) {
        const delta = 0.001;
        const p1 = this.getRawPoint(t - delta);
        const p2 = this.getRawPoint(t + delta);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return {
            x: dx / length,
            y: dy / length
        };
    }

    drawDebug(ctx) {
        ctx.save();

        // Draw the curve with higher resolution
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 2;

        // Increase steps for smoother curve
        const steps = 200;
        
        // Draw main curve
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pos = this.getRawPoint(t); // Use raw points for true path
            if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        }
        
        // Close the path explicitly
        const start = this.getRawPoint(0);
        ctx.lineTo(start.x, start.y);
        ctx.stroke();

        // Draw control points and handles
        this.points.forEach((p, i) => {
            // Draw point
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw lines between control points
            if (i < this.points.length - 1) {
                const nextPoint = this.points[i + 1];
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                ctx.stroke();
            }

            // Draw bezier control handles if they exist
            if (this.controlPoints[i]) {
                const cp = this.controlPoints[i];
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(cp.c1.x, cp.c1.y);
                if (i < this.points.length - 1) {
                    ctx.moveTo(this.points[i + 1].x, this.points[i + 1].y);
                    ctx.lineTo(cp.c2.x, cp.c2.y);
                }
                ctx.stroke();
            }
        });

        ctx.restore();
    }
}

export default BezierPath;
