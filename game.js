    updateCustomCursorPosition(event) {
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;

        this.customCursor.setAttribute('transform', `translate(${mouseX}, ${mouseY})`);

        if (this.customCursor.classList.contains('active') && this.camera) {
            const tileUnderCursor = this.camera.screenToTile(mouseX, mouseY);

            const cursorTileX = Math.max(0, Math.min(this.GRID_SIZE_X - 1, tileUnderCursor.x));
            const cursorTileY = Math.max(0, Math.min(this.GRID_SIZE_Y - 1, tileUnderCursor.y));

            const tileType = this.world.getTileType(cursorTileX, cursorTileY);

            this.updateDevInfo(cursorTileX, cursorTileY, tileType);
        }
    }

