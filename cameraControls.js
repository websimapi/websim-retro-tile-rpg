export class CameraControls {
    constructor(camera, game) {
        this.camera = camera;
        this.game = game;
        this.controls = null;
    }
    
    initialize() {
        // Create the controls container
        this.controls = document.createElement('div');
        this.controls.id = 'camera-controls';
        this.controls.className = 'camera-controls';
        
        // Create rotation buttons
        const rotateLeftBtn = document.createElement('button');
        rotateLeftBtn.className = 'camera-btn rotate-left';
        rotateLeftBtn.innerHTML = '↶';
        rotateLeftBtn.title = 'Rotate Camera Left (Q)';
        rotateLeftBtn.addEventListener('click', () => this.rotateCamera(false));
        
        const rotateRightBtn = document.createElement('button');
        rotateRightBtn.className = 'camera-btn rotate-right';
        rotateRightBtn.innerHTML = '↷';
        rotateRightBtn.title = 'Rotate Camera Right (E)';
        rotateRightBtn.addEventListener('click', () => this.rotateCamera(true));
        
        // Add buttons to controls
        this.controls.appendChild(rotateLeftBtn);
        this.controls.appendChild(rotateRightBtn);
        
        // Add controls to game container
        document.getElementById('game-container').appendChild(this.controls);
        
        // Add keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    rotateCamera(clockwise) {
        const newAngle = this.camera.rotate(clockwise);
        console.log(`Camera rotated to ${newAngle} degrees`);
    }
    
    handleKeyDown(event) {
        // Q and E keys for camera rotation
        if (event.key === 'q') {
            this.rotateCamera(false); // Rotate counter-clockwise
        } else if (event.key === 'e') {
            this.rotateCamera(true); // Rotate clockwise
        }
    }
}