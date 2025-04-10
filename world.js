export class WorldChunkManager {
    constructor(tileWidth, tileHeight) {
        this.CHUNK_SIZE = 16; // Size of each chunk
        this.TILE_WIDTH = tileWidth;
        this.TILE_HEIGHT = tileHeight;
        this.chunks = new Map(); // Map of chunk keys to tile data
        this.loadedChunks = new Set(); // Set of currently loaded chunk keys
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    getTileKey(x, y) {
        return `${x},${y}`;
    }

    getChunkCoords(tileX, tileY) {
        return {
            chunkX: Math.floor(tileX / this.CHUNK_SIZE),
            chunkY: Math.floor(tileY / this.CHUNK_SIZE)
        };
    }

    generateChunk(chunkX, chunkY) {
        const chunk = {};
        const baseX = chunkX * this.CHUNK_SIZE;
        const baseY = chunkY * this.CHUNK_SIZE;

        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let y = 0; y < this.CHUNK_SIZE; y++) {
                const worldX = baseX + x;
                const worldY = baseY + y;
                const noise = Math.random();
                
                // Use deterministic noise based on position for consistent generation
                const tileNoise = Math.sin(worldX * 12.9898 + worldY * 78.233) * 43758.5453 % 1;
                
                const tileKey = this.getTileKey(worldX, worldY);
                if (tileNoise < 0.1) {
                    chunk[tileKey] = 'water';
                } else if (tileNoise < 0.2) {
                    chunk[tileKey] = 'stone';
                } else {
                    chunk[tileKey] = 'grass';
                }
            }
        }
        
        return chunk;
    }

    loadChunk(chunkX, chunkY) {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        if (!this.chunks.has(chunkKey)) {
            this.chunks.set(chunkKey, this.generateChunk(chunkX, chunkY));
        }
        this.loadedChunks.add(chunkKey);
        return this.chunks.get(chunkKey);
    }

    unloadChunk(chunkX, chunkY) {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        this.loadedChunks.delete(chunkKey);
    }

    getTileType(x, y) {
        const { chunkX, chunkY } = this.getChunkCoords(x, y);
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return null;
        return chunk[this.getTileKey(x, y)];
    }

    updateVisibleChunks(centerX, centerY, viewDistance) {
        const { chunkX: centerChunkX, chunkY: centerChunkY } = this.getChunkCoords(centerX, centerY);
        const newLoadedChunks = new Set();
        
        // Load chunks in view distance
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dy = -viewDistance; dy <= viewDistance; dy++) {
                const chunkX = centerChunkX + dx;
                const chunkY = centerChunkY + dy;
                const chunkKey = this.getChunkKey(chunkX, chunkY);
                
                newLoadedChunks.add(chunkKey);
                if (!this.loadedChunks.has(chunkKey)) {
                    this.loadChunk(chunkX, chunkY);
                }
            }
        }
        
        // Unload chunks outside view distance
        for (const chunkKey of this.loadedChunks) {
            if (!newLoadedChunks.has(chunkKey)) {
                const [chunkX, chunkY] = chunkKey.split(',').map(Number);
                this.unloadChunk(chunkX, chunkY);
            }
        }
    }
}