export class CharacterAnimator {
    constructor(playerElement) {
        this.playerElement = playerElement;
        this.currentFrame = 0;
        this.frames = [
            { y: 0 }, // Standing
            { y: -2 }, // Up slightly
            { y: 0 }, // Back to center
            { y: 2 }, // Down slightly
        ];
        this.animationInterval = null;
    }

    startWalkAnimation() {
        if (this.animationInterval) this.stopWalkAnimation();
        
        // 600ms per tile, 4 frames per walk cycle
        // So each frame should last 150ms
        const frameTime = 150;
        
        this.animationInterval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            const frame = this.frames[this.currentFrame];
            
            // Apply the frame's transformation
            const body = this.playerElement.querySelector('.player-body');
            const head = this.playerElement.querySelector('.player-head');
            if (body && head) {
                body.style.transform = `translateY(${frame.y}px)`;
                head.style.transform = `translateY(${frame.y}px)`;
            }
        }, frameTime);
    }

    stopWalkAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
            
            // Reset to standing position
            const body = this.playerElement.querySelector('.player-body');
            const head = this.playerElement.querySelector('.player-head');
            if (body && head) {
                body.style.transform = '';
                head.style.transform = '';
            }
        }
    }
}