import { TETROMINOES, getRandomTetromino } from './tetrominoes.js';

export class Game {
    constructor(renderer, audio) {
        this.renderer = renderer;
        this.audio = audio;

        this.grid = this.createGrid();
        this.activePiece = null;
        this.score = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.dropInterval = 1000;
        this.lastDropTime = 0;
        this.useInternalTimer = true; // Disabled when dragging

        // UI Elements
        this.scoreElement = document.getElementById('score-display');
        this.finalScoreElement = document.getElementById('final-score');
        this.gameOverScreen = document.getElementById('game-over-screen');

        // Start loop
        this.update = this.update.bind(this);
    }

    start() {
        this.grid = this.createGrid();
        this.score = 0;
        this.gameOver = false;
        this.audio.init(); // Initialize audio context on first user interaction (start button)
        this.spawnPiece();
        this.updateScore(0);
        this.gameOverScreen.classList.add('hidden');

        requestAnimationFrame(this.update);
    }

    createGrid() {
        return Array.from({ length: this.renderer.rows }, () =>
            Array(this.renderer.cols).fill(null)
        );
    }

    spawnPiece() {
        this.activePiece = getRandomTetromino();
        // Check immediate collision (Game Over)
        if (this.checkCollision(0, 0, this.activePiece.shape)) {
            this.gameOver = true;
            this.audio.playGameOver();
            this.finalScoreElement.innerText = this.score;
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    // Coordinates are offsets from current piece position
    checkCollision(offsetX, offsetY, shape) {
        if (!this.activePiece) return false;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = this.activePiece.x + x + offsetX;
                    const newY = this.activePiece.y + y + offsetY;

                    // Bounds check
                    if (newX < 0 || newX >= this.renderer.cols || newY >= this.renderer.rows) {
                        return true;
                    }

                    // Grid occupied check
                    // Ignore negative Y (above board)
                    if (newY >= 0 && this.grid[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    movePiece(dx, dy) {
        if (!this.activePiece || this.gameOver) return;

        if (!this.checkCollision(dx, dy, this.activePiece.shape)) {
            this.activePiece.x += dx;
            this.activePiece.y += dy;
            this.audio.playMove();
            return true;
        }
        return false;
    }

    rotatePiece() {
        if (!this.activePiece || this.gameOver) return;

        const originalShape = this.activePiece.shape;
        // Transpose + Reverse = Rotate 90 deg clockwise
        const newShape = originalShape[0].map((_, index) =>
            originalShape.map(row => row[index]).reverse()
        );

        // Wall kick logic (basic)
        // Try normal, then shift left, then shift right, then fail
        const kicks = [0, -1, 1, -2, 2];

        for (let offset of kicks) {
            if (!this.checkCollision(offset, 0, newShape)) {
                this.activePiece.x += offset;
                this.activePiece.shape = newShape;
                this.audio.playRotate();
                return;
            }
        }
    }

    hardDrop() {
        if (!this.activePiece || this.gameOver) return;

        let drops = 0;
        while (!this.checkCollision(0, 1, this.activePiece.shape)) {
            this.activePiece.y++;
            drops++;
        }
        this.lockPiece();
        this.audio.playDrop();
    }

    lockPiece() {
        if (!this.activePiece) return;

        // Lock into grid
        this.activePiece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) {
                    const gridY = this.activePiece.y + y;
                    const gridX = this.activePiece.x + x;
                    // Only lock if on board
                    if (gridY >= 0) {
                        this.grid[gridY][gridX] = this.activePiece.color;
                    }
                }
            });
        });

        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;

        for (let y = this.renderer.rows - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== null)) {
                // Remove line
                this.grid.splice(y, 1);
                // Add new empty line at top
                this.grid.unshift(Array(this.renderer.cols).fill(null));
                linesCleared++;
                y++; // Re-check this index as everything shifted down
            }
        }

        if (linesCleared > 0) {
            this.updateScore(linesCleared * 100 * linesCleared); // Exponential points
            this.audio.playClear();
        }
    }

    updateScore(points) {
        this.score += points;
        if (this.scoreElement) {
            this.scoreElement.innerText = this.score;
        }
    }

    setUseInternalTimer(enabled) {
        this.useInternalTimer = enabled;
        if (enabled) {
            // Reset timer to avoid immediate drop
            this.lastDropTime = Date.now();
        }
    }

    isPointInsideActivePiece(gridX, gridY) {
        if (!this.activePiece) return false;

        // Check bounding box first
        const p = this.activePiece;
        if (gridX < p.x || gridX >= p.x + p.shape[0].length ||
            gridY < p.y || gridY >= p.y + p.shape.length) {
            return false;
        }

        // Exact block check
        const localX = gridX - p.x;
        const localY = gridY - p.y;

        if (localY >= 0 && localY < p.shape.length &&
            localX >= 0 && localX < p.shape[0].length) {
            return p.shape[localY][localX] === 1; // Assuming 1 means filled
        }

        return false;
    }

    update(time = 0) {
        if (this.gameOver) return;

        // Auto drop
        if (this.useInternalTimer && time - this.lastDropTime > this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                // If cannot move down, lock
                this.lockPiece();
            }
            this.lastDropTime = time;
        }

        // Render
        this.renderer.drawGrid(this.grid);
        this.renderer.drawGhostPiece(this.activePiece, this.grid);
        this.renderer.drawActivePiece(this.activePiece);

        requestAnimationFrame(this.update);
    }
}
