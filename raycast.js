// Handles isometric grid tile detection and ray intersections
export class IsometricRaycaster {
    constructor(tileWidth, tileHeight) {
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
    }

    // Calculates the intersection between a screen-space point and the isometric grid
    raycastTile(screenX, screenY, worldTransform = { e: 0, f: 0 }, gridSizeX, gridSizeY) {
        // Adjust for world transform offset
        const adjustedX = screenX - worldTransform.e;
        const adjustedY = screenY - worldTransform.f;

        // Convert screen coordinates to isometric space
        // These formulas account for the isometric perspective
        const isoX = (adjustedX / this.tileWidth) * 2;
        const isoY = (adjustedY / this.tileHeight) * 2;

        // Convert isometric coordinates to tile coordinates
        // This uses the inverse isometric projection matrix
        const tileX = Math.floor((isoX + isoY) / 2);
        const tileY = Math.floor((isoY - isoX) / 2);

        // Clamp to grid bounds
        return {
            x: Math.max(0, Math.min(gridSizeX - 1, tileX)),
            y: Math.max(0, Math.min(gridSizeY - 1, tileY))
        };
    }

    // Converts tile coordinates back to screen space
    tileToScreen(tileX, tileY) {
        return {
            x: (tileX - tileY) * (this.tileWidth / 2),
            y: (tileX + tileY) * (this.tileHeight / 2)
        };
    }
}