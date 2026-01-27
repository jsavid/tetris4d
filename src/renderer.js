export class Renderer {
    constructor(canvas, mobile = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 30; // Will be calculated dynamically
        this.width = 0;
        this.height = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        // Calculate max available space ensuring aspect ratio (10/20 = 0.5)
        const availableWidth = parent.clientWidth;
        const availableHeight = parent.clientHeight;

        const aspectRatio = this.cols / this.rows;

        let newWidth = availableWidth;
        let newHeight = availableWidth / aspectRatio;

        if (newHeight > availableHeight) {
            newHeight = availableHeight;
            newWidth = newHeight * aspectRatio;
        }

        this.width = newWidth;
        this.height = newHeight;
        this.blockSize = Math.floor(newHeight / this.rows);

        // Adjust canvas real size
        this.canvas.width = this.blockSize * this.cols;
        this.canvas.height = this.blockSize * this.rows;

        // Scale for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        // Actually, for a pixel-art style grid, simple scaling is often better, 
        // but for smooth vector rendering we might want to handle DPI. 
        // For now, let's stick to 1:1 mapping with CSS scaling handling the visual size if needed,
        // but here we are setting the *internal* resolution to match the screen space allocated.
    }

    clear() {
        this.ctx.fillStyle = '#111'; // Dark background for the board
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid(grid) {
        this.clear();

        // Draw grid lines (subtle)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize, 0);
            this.ctx.lineTo(x * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.blockSize);
            this.ctx.lineTo(this.canvas.width, y * this.blockSize);
            this.ctx.stroke();
        }

        // Draw locked blocks
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (grid[y][x]) {
                    this.drawBlock(x, y, grid[y][x]);
                }
            }
        }
    }

    drawBlock(x, y, color, isGhost = false) {
        const size = this.blockSize;
        const pad = isGhost ? 1 : 2;
        const fillSize = size - (pad * 2);

        const px = x * size + pad;
        const py = y * size + pad;

        if (isGhost) {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px, py, fillSize, fillSize);
            this.ctx.fillStyle = color + '20'; // Very transparent
            this.ctx.fillRect(px, py, fillSize, fillSize);
        } else {
            // Main block body
            this.ctx.fillStyle = color;

            // "Glow" effect simulated with shadow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillRect(px, py, fillSize, fillSize);
            this.ctx.shadowBlur = 0; // Reset

            // Inner highlight (bevel effect)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.fillRect(px, py, fillSize, size * 0.2); // Top highlight
        }
    }

    drawActivePiece(piece) {
        if (!piece) return;

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.drawBlock(piece.x + x, piece.y + y, piece.color);
                }
            });
        });
    }

    drawGhostPiece(piece, grid) {
        if (!piece) return;

        // Calculate ghost position (lowest possible valid position)
        let ghostY = piece.y;
        while (!this.checkCollision({ ...piece, y: ghostY + 1 }, grid)) {
            ghostY++;
        }

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.drawBlock(piece.x + x, ghostY + y, piece.color, true);
                }
            });
        });
    }

    // Helper for ghost piece collision (duplicate logic from game.js, but minimal)
    // Actually, it's better if Game passes the Ghost Piece object fully calculated,
    // OR Grid is available. I'll pass the grid to drawGhostPiece.
    checkCollision(piece, grid) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x;
                    const newY = piece.y + y;

                    if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
                    if (newY >= 0 && grid[newY][newX]) return true;
                }
            }
        }
        return false;
    }
}
