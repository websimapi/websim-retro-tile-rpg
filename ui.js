export class UIManager {
    constructor(svg) {
        this.svg = svg;
        this.clickMarkerGroup = null;
        this.customCursor = null;
        this.cursorVisible = false;
        this.initializeUI();
    }

    initializeUI() {
        // Create click marker group
        this.clickMarkerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.clickMarkerGroup.id = 'click-markers-group';
        this.svg.appendChild(this.clickMarkerGroup);
        
        // Initialize custom cursor
        this.initializeCustomCursor();
    }

    initializeCustomCursor() {
        this.customCursor = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.customCursor.id = 'custom-cursor';
        
        const cursorCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        cursorCircle.setAttribute('cx', 0);
        cursorCircle.setAttribute('cy', 0);
        cursorCircle.setAttribute('r', 5);
        cursorCircle.setAttribute('class', 'cursor-circle');
        
        const crosshairH = document.createElementNS("http://www.w3.org/2000/svg", "line");
        crosshairH.setAttribute('x1', -7);
        crosshairH.setAttribute('y1', 0);
        crosshairH.setAttribute('x2', 7);
        crosshairH.setAttribute('y2', 0);
        crosshairH.setAttribute('class', 'cursor-line');
        
        const crosshairV = document.createElementNS("http://www.w3.org/2000/svg", "line");
        crosshairV.setAttribute('x1', 0);
        crosshairV.setAttribute('y1', -7);
        crosshairV.setAttribute('x2', 0);
        crosshairV.setAttribute('y2', 7);
        crosshairV.setAttribute('class', 'cursor-line');
        
        this.customCursor.appendChild(cursorCircle);
        this.customCursor.appendChild(crosshairH);
        this.customCursor.appendChild(crosshairV);
        
        this.svg.appendChild(this.customCursor);
    }

    createClickMarker(x, y) {
        const markerSize = 10;
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
        marker.setAttribute('class', 'click-marker');
        marker.setAttribute('transform', `translate(${x}, ${y})`);

        const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line1.setAttribute('x1', -markerSize / 2);
        line1.setAttribute('y1', -markerSize / 2);
        line1.setAttribute('x2', markerSize / 2);
        line1.setAttribute('y2', markerSize / 2);

        const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line2.setAttribute('x1', -markerSize / 2);
        line2.setAttribute('y1', markerSize / 2);
        line2.setAttribute('x2', markerSize / 2);
        line2.setAttribute('y2', -markerSize / 2);

        marker.appendChild(line1);
        marker.appendChild(line2);
        this.clickMarkerGroup.appendChild(marker);

        marker.addEventListener('animationend', () => marker.remove());
        setTimeout(() => marker.remove(), 600);
    }

    showClickMarker(screenX, screenY) {
        this.createClickMarker(screenX, screenY);
    }

    updateCursorPosition(mouseX, mouseY) {
        this.customCursor.setAttribute('transform', `translate(${mouseX}, ${mouseY})`);
    }

    isCursorVisible() {
        return this.cursorVisible;
    }

    setCursorVisibility(visible) {
        this.cursorVisible = visible;
        this.customCursor.classList.toggle('active', visible);
    }
}