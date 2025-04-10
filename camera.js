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
        
        // Convert target tile position to screen position based on current angle
        const screenPos = this.tileToScreen(this.target.x, this.target.y);
        
        // Calculate translation to center the target
        const translateX = centerX - screenPos.x;
        const translateY = centerY - screenPos.y;
        
        // Apply the transformation
        this.worldGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) rotate(${this.angle}, ${screenPos.x}, ${screenPos.y})`);
    }
    
    tileToScreen(x, y) {
        // Standard isometric projection
        const screenX = (x - y) * (this.tileWidth / 2);
        const screenY = (x + y) * (this.tileHeight / 2);
        return { x: screenX, y: screenY };
    }
    
    screenToTile(screenX, screenY) {
        if (!this.worldGroup) return { x: 0, y: 0 };
        
        // Get the current transform
        const transform = this.worldGroup.transform.baseVal.consolidate().matrix;
        
        // Adjust for world transform and rotation
        let adjustedX = screenX;
        let adjustedY = screenY;
        
        // Reverse the transform to get the coordinates in the world space
        const point = this.svg.createSVGPoint();
        point.x = screenX;
        point.y = screenY;
        
        // Get the inverse of the current transform
        const inverseTransform = transform.inverse();
        const transformedPoint = point.matrixTransform(inverseTransform);
        
        adjustedX = transformedPoint.x;
        adjustedY = transformedPoint.y;
        
        // Convert to tile coordinates using inverse isometric formula
        const tileX = Math.floor((adjustedX / (this.tileWidth / 2) + adjustedY / (this.tileHeight / 2)) / 2);
        const tileY = Math.floor((adjustedY / (this.tileHeight / 2) - adjustedX / (this.tileWidth / 2)) / 2);
        
        return { x: tileX, y: tileY };
    }
}