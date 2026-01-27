export class InputHandler {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastMoveTime = 0;

        // Touch state
        this.activePointerId = null;

        // Settings
        this.dragSensitivity = 30; // pixels to move one block
        this.swipeThreshold = 5; // velocity factor

        // Bindings
        this.bindEvents();
    }

    bindEvents() {
        // Pointer events handle both mouse and touch consistently
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));

        // We attach move/up to window to handle drags outside canvas
        window.addEventListener('pointermove', this.handlePointerMove.bind(this));
        window.addEventListener('pointerup', this.handlePointerUp.bind(this));
        window.addEventListener('pointercancel', this.handlePointerUp.bind(this));

        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }

    getGridPos(event) {
        const rect = this.canvas.getBoundingClientRect();
        // Scale factor in case canvas display size != logical size
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        return {
            x: Math.floor(x / this.game.renderer.blockSize),
            y: Math.floor(y / this.game.renderer.blockSize),
            pixelX: x,
            pixelY: y
        };
    }

    handlePointerDown(e) {
        if (this.game.gameOver || this.game.isPaused) return;

        // Prevent multi-touch chaos - only track one pointer
        if (this.activePointerId !== null) return;

        this.activePointerId = e.pointerId;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
        this.startTime = Date.now();

        // Check if we touched the active piece
        const pos = this.getGridPos(e);
        if (this.game.isPointInsideActivePiece(pos.x, pos.y)) {
            this.isDragging = true;
            this.game.audio.playGrab();
            this.game.setUseInternalTimer(false); // Stop auto-drop while holding
        } else {
            // Tap outside: simply rotate? Or maybe ignore?
            // User requested: "touch to grab, rotate with mouse/finger"
            // If we touch empty space, maybe we just want to watch?
            // Let's implement: Tap = Rotate. Hold/Drag = Move.
            // But we need to distinguish Tap from Drag start.
            // For now, let's say ANY touch initiates potential control.

            // Refined interaction map:
            // 1. Touch piece -> Grab mode
            // 2. Touch anywhere else -> Maybe just Rotate?

            // Let's try: If you touch the piece, you grab it.
            // If you touch elsewhere, it's a "Tap to rotate" intent, unless you drag.
        }
    }

    handlePointerMove(e) {
        if (this.activePointerId !== e.pointerId) return;
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastDragX;
        const deltaY = e.clientY - this.lastDragY;

        // Horizontal Movement
        if (Math.abs(deltaX) > this.dragSensitivity) {
            const steps = Math.round(deltaX / this.dragSensitivity);
            if (steps !== 0) {
                this.game.movePiece(steps, 0);
                this.lastDragX = e.clientX; // Reset reference
            }
        }

        // Vertical Movement (Soft drop / Drag down)
        // We only allow dragging DOWN
        if (deltaY > this.dragSensitivity) {
            const steps = Math.round(deltaY / this.dragSensitivity);
            if (steps > 0) {
                this.game.movePiece(0, steps);
                this.lastDragY = e.clientY;
            }
        }
    }

    handlePointerUp(e) {
        if (this.activePointerId !== e.pointerId) return;

        const endTime = Date.now();
        const duration = endTime - this.startTime;
        const totalDeltaY = e.clientY - this.dragStartY;
        const totalDeltaX = e.clientX - this.dragStartX;

        // Detect "Throw" / Swipe Down
        // Short duration, significant downward movement
        if (this.isDragging && duration < 300 && totalDeltaY > 50 && Math.abs(totalDeltaY) > Math.abs(totalDeltaX)) {
            // It was a flick/swipe down
            this.game.hardDrop();
        }
        // Detect Tap (Short duration, little movement)
        else if (duration < 200 && Math.abs(totalDeltaX) < 10 && Math.abs(totalDeltaY) < 10) {
            this.game.rotatePiece();
        }
        else {
            // Just a release
        }

        // Reset
        this.isDragging = false;
        this.activePointerId = null;
        this.game.setUseInternalTimer(true); // Resume auto-drop
    }
}
