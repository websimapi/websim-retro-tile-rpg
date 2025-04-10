// A* pathfinding implementation for tile-based movement
export class TilePathfinder {
    constructor(worldTiles, gridSizeX, gridSizeY) {
        this.worldTiles = worldTiles;
        this.gridSizeX = gridSizeX;
        this.gridSizeY = gridSizeY;
    }

    findPath(startX, startY, endX, endY) {
        const start = { x: startX, y: startY };
        const end = { x: endX, y: endY };
        
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(this.pointToKey(start), 0);
        fScore.set(this.pointToKey(start), this.heuristic(start, end));
        
        while (openSet.length > 0) {
            const current = this.getLowestFScore(openSet, fScore);
            
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(this.pointToKey(current));
            
            for (const neighbor of this.getNeighbors(current)) {
                if (closedSet.has(this.pointToKey(neighbor))) continue;
                
                const tentativeGScore = gScore.get(this.pointToKey(current)) + 1;
                
                if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(this.pointToKey(neighbor))) {
                    continue;
                }
                
                cameFrom.set(this.pointToKey(neighbor), current);
                gScore.set(this.pointToKey(neighbor), tentativeGScore);
                fScore.set(this.pointToKey(neighbor), tentativeGScore + this.heuristic(neighbor, end));
            }
        }
        
        return null; // No path found
    }
    
    pointToKey(point) {
        return `${point.x},${point.y}`;
    }
    
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    getLowestFScore(points, fScore) {
        return points.reduce((min, p) => 
            (fScore.get(this.pointToKey(p)) < fScore.get(this.pointToKey(min))) ? p : min
        );
    }
    
    getNeighbors(point) {
        const neighbors = [];
        const directions = [
            {x: 0, y: 1}, {x: 1, y: 0},
            {x: 0, y: -1}, {x: -1, y: 0}
        ];
        
        for (const dir of directions) {
            const newX = point.x + dir.x;
            const newY = point.y + dir.y;
            
            if (newX >= 0 && newX < this.gridSizeX &&
                newY >= 0 && newY < this.gridSizeY) {
                
                const tileKey = `${newX},${newY}`;
                if (this.worldTiles[tileKey] !== 'water') {
                    neighbors.push({x: newX, y: newY});
                }
            }
        }
        
        return neighbors;
    }
    
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = this.pointToKey(current);
        
        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            currentKey = this.pointToKey(current);
            path.unshift(current);
        }
        
        return path;
    }
}

export class MovementManager {
    constructor(room) {
        this.room = room;
        this.currentPath = null;
        this.isMoving = false;
        this.moveInterval = null;
        this.MOVE_DELAY = 300; // Time between moves in ms
    }

    startMoving(path) {
        if (this.isMoving) {
            this.stopMoving();
        }
        
        this.currentPath = path;
        this.isMoving = true;
        this.processNextMove();
    }

    stopMoving() {
        this.isMoving = false;
        this.currentPath = null;
        if (this.moveInterval) {
            clearTimeout(this.moveInterval);
            this.moveInterval = null;
        }
    }

    processNextMove() {
        if (!this.isMoving || !this.currentPath || this.currentPath.length === 0) {
            this.stopMoving();
            return;
        }

        const nextPosition = this.currentPath.shift();
        this.room.updatePresence({ x: nextPosition.x, y: nextPosition.y });

        if (this.currentPath.length > 0) {
            this.moveInterval = setTimeout(() => this.processNextMove(), this.MOVE_DELAY);
        } else {
            this.stopMoving();
        }
    }
}