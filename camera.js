export class Camera {
    constructor(svg, tileWidth, tileHeight) {
        this.svg = svg;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.angle = 0; // 0, 90, 180, 270 degrees
        this.target = { x: 0, y: 0 }; // Target position (player position in tile coordinates)
        this.worldGroup = null;
    }

    initialize(worldGroup) {
        this.worldGroup = worldGroup;
    }

    setTarget(x, y) {
        this.target.x = x;
        this.target.y = y;
        this.update();
    }

    rotate(clockwise = true) {
        // Rotate 90 degrees at a time
        this.angle = (this.angle + (clockwise ? 90 : 270)) % 360;
        this.update();
        return this.angle;
    }

    update() {
        if (!this.worldGroup) return;
        
        // Calculate screen center
        const svgWidth = parseInt(this.svg.getAttribute('width'));
        const svgHeight = parseInt(this.svg.getAttribute('height'));
        const centerX = svgWidth / 2;
        const centerY = svgHeight / 2;
        
        // Convert target tile position to screen position
        const screenPos = this.tileToScreen(this.target.x, this.target.y);
        
        // Calculate translation to center the target
        const translateX = centerX - screenPos.x;
        const translateY = centerY - screenPos.y;
        
        // First translate to center, then rotate around center
        // This ensures the rotation happens around the player position
        this.worldGroup.setAttribute('transform', 
            `translate(${centerX}, ${centerY}) ` +
            `rotate(${this.angle}) ` +
            `translate(${-screenPos.x}, ${-screenPos.y})`
        );
    }
    
    tileToScreen(x, y) {
        // Standard isometric projection
        const screenX = (x - y) * (this.tileWidth / 2);
        const screenY = (x + y) * (this.tileHeight / 2);
        return { x: screenX, y: screenY };
    }
    
    screenToTile(screenX, screenY) {
        if (!this.worldGroup) return { x: 0, y: 0 };
        
        // Get the current transform matrix
        const transform = this.worldGroup.transform.baseVal.consolidate().matrix;
        
        // Create a point for transformation
        const point = this.svg.createSVGPoint();
        point.x = screenX;
        point.y = screenY;
        
        // Transform the point back to world space
        const transformedPoint = point.matrixTransform(transform.inverse());
        
        // Convert to tile coordinates using inverse isometric formula
        const tileX = Math.floor((transformedPoint.x / (this.tileWidth / 2) + transformedPoint.y / (this.tileHeight / 2)) / 2);
        const tileY = Math.floor((transformedPoint.y / (this.tileHeight / 2) - transformedPoint.x / (this.tileWidth / 2)) / 2);
        
        return { x: tileX, y: tileY };
    }
}