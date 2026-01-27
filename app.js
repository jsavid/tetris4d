/**
 * TETROMINOES
 */
const TETROMINOES = {
    I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#00f0f0' },
    J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#0000f0' },
    L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#f0a000' },
    O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
    S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#00f000' },
    T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#a000f0' },
    Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#f00000' }
};

function getRandomTetromino() {
    const keys = Object.keys(TETROMINOES);
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    const tetro = TETROMINOES[randKey];
    // Center of mass offset approximations (roughly center of 4x4 or 3x3 grid)
    const shape = tetro.shape.map(row => [...row]);
    return {
        shape: shape,
        color: tetro.color,
        type: randKey,
        // Physics Properties
        x: 4, // Centerish
        y: -1,
        rotation: 0, // Radians
        vx: 0,
        vy: 0,
        vr: 0, // Angular velocity
        mass: 1,
        // Grab interaction
        isGrabbed: false,
        grabOffsetX: 0,
        grabOffsetY: 0
    };
}

/**
 * AUDIO CONTROLLER
 */
class AudioController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(frequency, type, duration, volume = 0.1) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { }
    }

    playGrab() { this.playTone(300, 'sine', 0.1, 0.1); }

    // Spring Sound Synthesis
    startSpring() {
        if (!this.enabled || !this.ctx) return;
        if (this.springOsc) return; // Already playing

        this.springOsc = this.ctx.createOscillator();
        this.springGain = this.ctx.createGain();
        this.springFilter = this.ctx.createBiquadFilter();

        // Setup Spring Synth (FM-ish)
        // Carrier
        this.springOsc.type = 'sawtooth';
        this.springOsc.frequency.value = 150; // Base freq

        // Filter (Lowpass to dampen the buzz)
        this.springFilter.type = 'lowpass';
        this.springFilter.frequency.value = 200;
        this.springFilter.Q.value = 15;

        // Chain
        this.springOsc.connect(this.springFilter);
        this.springFilter.connect(this.springGain);
        this.springGain.connect(this.ctx.destination);

        // Start muted
        this.springGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.springGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);

        this.springOsc.start();
    }

    updateSpring(tension) {
        if (!this.springOsc) return;
        const now = this.ctx.currentTime;

        // Pitch bend (Elasticity)
        const targetPitch = 80 + (tension * 5);
        this.springOsc.frequency.setTargetAtTime(targetPitch, now, 0.1);

        // Filter Sweep (The "Toing") - Opens up with tension
        const targetFilter = 200 + (tension * 150);
        this.springFilter.frequency.setTargetAtTime(targetFilter, now, 0.1);

        const vol = Math.min(0.25, 0.05 + (tension * 0.02));
        this.springGain.gain.setTargetAtTime(vol, now, 0.1);
    }

    stopSpring() {
        if (this.springOsc) {
            try {
                const now = this.ctx.currentTime;
                this.springGain.gain.cancelScheduledValues(now);
                this.springGain.gain.setTargetAtTime(0, now, 0.15);

                const oldOsc = this.springOsc;
                setTimeout(() => {
                    oldOsc.stop();
                    oldOsc.disconnect();
                }, 200);
            } catch (e) { }
            this.springOsc = null;
            this.springGain = null;
            this.springFilter = null;
        }
    }
    playMove() { /* Too frequent for physics */ }
    playRotate() { /* continuous sound? maybe not needed for physics */ }
    // "Ping" - Clean Bell
    playDrop() {
        const now = this.ctx.currentTime;
        this.playScheduledTone(880, 'sine', now, 0.6); // A5, long decay
    }
    playClear() {
        this.playTone(440, 'sine', 0.3, 0.1);
        setTimeout(() => this.playTone(554, 'sine', 0.3, 0.1), 100);
        setTimeout(() => this.playTone(659, 'sine', 0.4, 0.1), 200);
    }
    playGameOver() {
        this.playTone(300, 'sawtooth', 0.5, 0.2);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.2), 300);
    }

    playScheduledTone(freq, type, time, duration) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + duration);
        } catch (e) { }
    }
}

/**
 * RENDERER
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 30;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;

        // Add bottom padding for mobile browsers
        // 1cm is approx 38px, but 50px is safer for various behaviors
        const BOTTOM_PADDING = 50;
        const availableHeight = Math.max(0, this.height - BOTTOM_PADDING);

        // We maintain aspect ratio of 10x20 in terms of "Game Units"
        // But we want the canvas to fill the screen.
        // Let's decide: blockSize determines the game world scale.
        // We fit 10 blocks wide or 20 blocks high, whichever is tighter.

        const possibleBlockByWidth = this.width / 10;
        const possibleBlockByHeight = availableHeight / 20;

        this.blockSize = Math.min(possibleBlockByWidth, possibleBlockByHeight);

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Output properties for Physics to know boundaries
        this.gameOriginX = (this.width - (10 * this.blockSize)) / 2;
        // Center vertically in the AVAILABLE height (top-biased), then maybe offset slightly?
        // Actually centering in availableHeight keeps it off the very bottom.
        this.gameOriginY = (availableHeight - (20 * this.blockSize)) / 2;
    }

    clear() {
        // Clear entire canvas to transparent (letting CSS background show)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // World X/Y to Canvas X/Y
    toCanvas(gx, gy) {
        return {
            x: this.gameOriginX + gx * this.blockSize,
            y: this.gameOriginY + gy * this.blockSize
        };
    }

    // Window Client X/Y to World X/Y
    toWorld(cx, cy) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (cx - rect.left) * scaleX;
        const canvasY = (cy - rect.top) * scaleY;
        return {
            x: (canvasX - this.gameOriginX) / this.blockSize,
            y: (canvasY - this.gameOriginY) / this.blockSize
        };
    }

    drawGrid(grid) {
        this.clear();

        // 1. Draw The Game Well (Black Background)
        this.ctx.fillStyle = '#000000';
        // Add a slight padding for the "Wall" thickness visual
        const border = 4;
        this.ctx.fillRect(
            this.gameOriginX - border,
            this.gameOriginY - border,
            10 * this.blockSize + border * 2,
            20 * this.blockSize + border + border // Top wall? usually open. Bottom val.
        );

        // 2. Draw Grid Lines (Subtle)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x <= 10; x++) {
            const bx = this.gameOriginX + x * this.blockSize;
            this.ctx.moveTo(bx, this.gameOriginY);
            this.ctx.lineTo(bx, this.gameOriginY + 20 * this.blockSize);
        }
        for (let y = 0; y <= 20; y++) {
            const by = this.gameOriginY + y * this.blockSize;
            this.ctx.moveTo(this.gameOriginX, by);
            this.ctx.lineTo(this.gameOriginX + 10 * this.blockSize, by);
        }
        this.ctx.stroke();

        // 3. Draw The Walls (Neon Cyberpunk)
        this.ctx.strokeStyle = '#00f0f0'; // Neon Blue
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00f0f0';

        this.ctx.beginPath();
        // Left Wall
        this.ctx.moveTo(this.gameOriginX, this.gameOriginY);
        this.ctx.lineTo(this.gameOriginX, this.gameOriginY + 20 * this.blockSize);
        // Floor
        this.ctx.lineTo(this.gameOriginX + 10 * this.blockSize, this.gameOriginY + 20 * this.blockSize);
        // Right Wall
        this.ctx.lineTo(this.gameOriginX + 10 * this.blockSize, this.gameOriginY);

        this.ctx.stroke();

        // Reset Shadow for blocks
        this.ctx.shadowBlur = 0;

        // Draw locked blocks
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                if (grid[y][x]) {
                    const pos = this.toCanvas(x, y);
                    this.drawBlock(pos.x, pos.y, grid[y][x], 0);
                }
            }
        }
    }

    drawBlock(px, py, color, rotation = 0, scale = 1, isGhost = false) {
        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate(rotation);

        const size = this.blockSize * scale;
        // We draw from top-left of the block if no rotation, 
        // BUT for physics rotation we usually want center.
        // My physics engine tracks Top-Left of the "Matrix". 
        // So a block at (1,1) in the shape matrix needs to be drawn at correct offset.
        // This helper draws a single square at 0,0 usually.

        // Let's assume px,py is the Top-Left of the block
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;

        this.ctx.fillRect(1, 1, size - 2, size - 2);

        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fillRect(1, 1, size - 2, size * 0.2);

        this.ctx.restore();
    }

    drawActivePiece(piece) {
        if (!piece) return;

        this.ctx.save();

        // Transform to Piece Origin (Top-Left of the shape grid)
        const pos = this.toCanvas(piece.x, piece.y);

        // We need to rotate around the CENTER of the shape.
        // Approximate center:
        const cx = (piece.shape[0].length * this.blockSize) / 2;
        const cy = (piece.shape.length * this.blockSize) / 2;

        this.ctx.translate(pos.x + cx, pos.y + cy);
        this.ctx.rotate(piece.rotation);
        this.ctx.translate(-cx, -cy); // Move back

        // Now draw blocks relative to this origin
        piece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) {
                    this.drawBlock(x * this.blockSize, y * this.blockSize, piece.color);
                }
            });
        });

        // Debug: Draw Center of Mass
        // this.ctx.fillStyle = 'white';
        // this.ctx.fillRect(cx-2, cy-2, 4, 4);

        this.ctx.restore();
    }
}

/**
 * GAME LOGIC
 */
class Game {
    constructor(renderer, audio) {
        this.renderer = renderer;
        this.audio = audio;

        this.grid = Array.from({ length: 20 }, () => Array(10).fill(null));
        this.activePiece = null;
        this.score = 0;
        this.gameOver = false;

        // Physics Params
        this.gravity = 25.0; // Stronger gravity
        this.drag = 0.999; // Very low air resistance (allows acceleration)
        this.angularDrag = 0.96;
        this.springStrength = 8.0;
        this.lastTime = 0;

        this.scoreElement = document.getElementById('score-display');
        this.finalScoreElement = document.getElementById('final-score');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.startScreen = document.getElementById('start-screen');
        this.pauseBtn = document.getElementById('pause-btn');

        this.update = this.update.bind(this);
        this.togglePause = this.togglePause.bind(this);

        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Mute game inputs
                this.togglePause();
            });
            this.pauseBtn.textContent = '⏸';
            this.pauseBtn.style.display = 'none'; // Hidden until start
        }
    }

    togglePause() {
        if (this.gameOver || !this.activePiece) return;
        this.paused = !this.paused;
        this.pauseBtn.textContent = this.paused ? '▶' : '⏸';
        if (this.audio) this.audio.playGrab();
    }

    start() {
        try {
            this.grid = Array.from({ length: 20 }, () => Array(10).fill(null));
            this.score = 0;
            this.scoreElement.textContent = this.score;
            this.gameOver = false;
            this.paused = false;
            this.activePiece = getRandomTetromino();

            this.activePiece.vx = 0;
            this.activePiece.vy = 0;
            this.activePiece.vr = 0;
            this.activePiece.rotation = 0;

            this.lastTime = 0;

            this.inputTarget = null;
            this.grabOffset = null;

            this.startScreen.classList.add('hidden');
            this.gameOverScreen.classList.add('hidden');

            if (this.pauseBtn) {
                this.pauseBtn.style.display = 'block';
                this.pauseBtn.textContent = '⏸';
            }

            if (this.audio) this.audio.init();

            requestAnimationFrame(this.update);
        } catch (e) {
            alert("Error Starting: " + e.message + " " + e.stack);
            console.error(e);
        }
    }

    spawnPiece() {
        this.activePiece = getRandomTetromino();
        // Reset Physics
        this.activePiece.vx = 0;
        this.activePiece.vy = 0;
        this.activePiece.vr = 0;
        this.activePiece.rotation = 0;

        if (this.checkCollision(this.activePiece)) {
            this.gameOver = true;
            this.audio.playGameOver();
            this.finalScoreElement.innerText = this.score;
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    // Physics Update
    update(time) {
        if (this.gameOver) return;

        if (this.paused) {
            requestAnimationFrame(this.update);
            return;
        }

        let delta = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (delta > 0.05) delta = 0.05; // Cap Lag

        const p = this.activePiece;
        if (p) {
            // SUB-STEPPING for stability
            const steps = 4;
            const dt = delta / steps;

            for (let s = 0; s < steps; s++) {
                // 1. Forces
                let fx = 0;
                let fy = this.gravity * p.mass;
                let torque = 0;

                // Spring Force
                if (p.isGrabbed && this.inputTarget) {
                    const halfW = p.shape[0].length / 2;
                    const halfH = p.shape.length / 2;
                    const cx = p.x + halfW;
                    const cy = p.y + halfH;
                    const cos = Math.cos(p.rotation);
                    const sin = Math.sin(p.rotation);
                    const rx = p.grabOffsetX * cos - p.grabOffsetY * sin;
                    const ry = p.grabOffsetX * sin + p.grabOffsetY * cos;
                    const grabWx = cx + rx;
                    const grabWy = cy + ry;

                    const dx = this.inputTarget.x - grabWx;
                    const dy = this.inputTarget.y - grabWy;

                    // Hooke's Law
                    const dist = Math.hypot(dx, dy);

                    // --- AUDIO: Dynamic Spring Sound ---
                    // Only start/update once per frame (s==0) to save performance
                    if (s === 0) {
                        this.audio.startSpring();
                        // Tension is proportional to distance * strength
                        this.audio.updateSpring(dist * this.springStrength);
                    }

                    fx += dx * this.springStrength * 5;
                    fy += dy * this.springStrength * 5;
                    const springFx = dx * this.springStrength * 5;
                    const springFy = dy * this.springStrength * 5;
                    torque += (rx * springFy - ry * springFx) * 2;
                } else {
                    // Not grabbed
                    if (s === 0) this.audio.stopSpring();
                }

                // 2. Integrate
                p.vx += (fx / p.mass) * dt;
                p.vy += (fy / p.mass) * dt;
                p.vr += (torque / p.mass) * dt;

                p.vx *= this.drag;
                p.vy *= this.drag;
                p.vr *= this.angularDrag;

                // NaN Safety
                if (isNaN(p.vx)) p.vx = 0;
                if (isNaN(p.vy)) p.vy = 0;
                if (isNaN(p.vr)) p.vr = 0;

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rotation += p.vr * dt;

                // NaN Coordinate Safety
                if (isNaN(p.x)) p.x = 4;
                if (isNaN(p.y)) p.y = 0;
                if (isNaN(p.rotation)) p.rotation = 0;

                // 3. Collision / Bounds
                this.handleGridCollision(p);
                this.handleDesktopBounds(p);

                // Void Safety
                if (p.y > 22) { p.y = 10; p.vy = 0; }
                if (p.y < -10) { p.y = 0; p.vy = 0; }
            }

            // 4. Locking
            if (!p.isGrabbed && this.isTouchingGround(p)) {
                if (Math.abs(p.vx) < 2.0 && Math.abs(p.vy) < 2.0 && Math.abs(p.vr) < 3.0) {
                    // Magnet Effect (Safe Mode)
                    const targetX = Math.round(p.x);
                    const diffX = targetX - p.x;
                    const deg = p.rotation * (180 / Math.PI);
                    const targetRad = Math.round(deg / 90) * 90 * (Math.PI / 180);
                    const diffR = targetRad - p.rotation;

                    const isTargetSafe = !this.checkCollision({ ...p, x: targetX });
                    if (isTargetSafe) {
                        p.vx += diffX * 2.0;
                    }
                    p.vr += diffR * 2.0;

                    if (!p.lockTimer) p.lockTimer = 0;
                    p.lockTimer += delta;
                    if (p.lockTimer > 0.5) {
                        this.snapAndLock(p);
                    }
                } else {
                    p.lockTimer = 0;
                }
            } else {
                p.lockTimer = 0;
            }
        }

        this.renderer.drawGrid(this.grid);
        this.renderer.drawActivePiece(p);

        // Input Debug
        if (this.inputTarget) {
            const target = this.renderer.toCanvas(this.inputTarget.x, this.inputTarget.y);
            this.renderer.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            this.renderer.ctx.beginPath();
            this.renderer.ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
            this.renderer.ctx.fill();

            if (p && p.isGrabbed) {
                this.renderer.ctx.strokeStyle = '#fff';
                this.renderer.ctx.lineWidth = 2;
                this.renderer.ctx.beginPath();
                const halfW = p.shape[0].length / 2;
                const halfH = p.shape.length / 2;
                const cx = p.x + halfW;
                const cy = p.y + halfH;
                const cos = Math.cos(p.rotation);
                const sin = Math.sin(p.rotation);
                const rx = p.grabOffsetX * cos - p.grabOffsetY * sin;
                const ry = p.grabOffsetX * sin + p.grabOffsetY * cos;
                const anchorWx = cx + rx;
                const anchorWy = cy + ry;
                const anchorCanvas = this.renderer.toCanvas(anchorWx, anchorWy);
                this.renderer.ctx.moveTo(anchorCanvas.x, anchorCanvas.y);
                this.renderer.ctx.lineTo(target.x, target.y);
                this.renderer.ctx.stroke();
                this.renderer.ctx.fillStyle = '#ff00ff';
                this.renderer.ctx.beginPath();
                this.renderer.ctx.arc(anchorCanvas.x, anchorCanvas.y, 5, 0, Math.PI * 2);
                this.renderer.ctx.fill();
            }
        }
        requestAnimationFrame(this.update);
    }

    // Helper: Calculate actual world positions of blocks considering rotation
    getRotatedBlockPositions(p) {
        const blocks = [];
        const hW = p.shape[0].length / 2;
        const hH = p.shape.length / 2;
        const cx = p.x + hW;
        const cy = p.y + hH;
        const cos = Math.cos(p.rotation);
        const sin = Math.sin(p.rotation);

        p.shape.forEach((row, py) => {
            row.forEach((val, px) => {
                if (val) {
                    // Block center relative to Top-Left
                    const bx = px + 0.5;
                    const by = py + 0.5;

                    // Relative to center
                    const rx = bx - hW;
                    const ry = by - hH;

                    // Rotated
                    const rwx = rx * cos - ry * sin;
                    const rwy = rx * sin + ry * cos;

                    // World Pos
                    blocks.push({
                        x: cx + rwx,
                        y: cy + rwy
                    });
                }
            });
        });
        return blocks;
    }

    handleDesktopBounds(p) {
        const blocks = this.getRotatedBlockPositions(p);
        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;

        blocks.forEach(b => {
            // Block is a 1x1 square centered at b.x, b.y
            // Edges are +/- 0.5
            if (b.x - 0.5 < minX) minX = b.x - 0.5;
            if (b.x + 0.5 > maxX) maxX = b.x + 0.5;
            if (b.y + 0.5 > maxY) maxY = b.y + 0.5;
        });

        // Wall Bounces
        if (minX < 0) {
            p.x += (0 - minX);
            p.vx *= -0.3; // Dampened bounce
        }
        if (maxX > 10) {
            p.x -= (maxX - 10);
            p.vx *= -0.3;
        }
        if (maxY > 20) {
            p.y -= (maxY - 20);
            p.vy = 0;
            p.vx *= 0.8; // Floor friction
        }
    }

    handleGridCollision(p) {
        // Iterative Solver: Resolve ONE collision per iteration
        const iterations = 10;
        const bias = 0;

        // Test points offsets from center (Center, Bottom, Top, Left, Right)
        // We use 0.45 to ensure we are checking "inside" the block's visual bounds
        const offsets = [
            { x: 0, y: 0 },
            { x: 0, y: 0.45 }, { x: 0, y: -0.45 },
            { x: 0.45, y: 0 }, { x: -0.45, y: 0 }
        ];

        for (let i = 0; i < iterations; i++) {
            let collisionResolved = false;
            const blocks = this.getRotatedBlockPositions(p);

            for (const b of blocks) {
                // Check multiple points for this block to catch edge collisions
                for (const off of offsets) {
                    const checkX = b.x + off.x;
                    const checkY = b.y + off.y;
                    const gx = Math.floor(checkX);
                    const gy = Math.floor(checkY);

                    if (gx >= 0 && gx < 10 && gy >= 0 && gy < 20) {
                        if (this.grid[gy][gx]) {
                            // Collision detected at cell (gx, gy)
                            const cellCx = gx + 0.5;
                            const cellCy = gy + 0.5;
                            const dx = b.x - cellCx; // Calculate overlap from CENTER of block
                            const dy = b.y - cellCy;

                            const xOverlap = 1.0 - Math.abs(dx);
                            const yOverlap = 1.0 - Math.abs(dy);

                            if (xOverlap > 0 && yOverlap > 0) {
                                if (xOverlap < yOverlap) {
                                    // Horizontal
                                    p.x += (dx > 0 ? 1 : -1) * (xOverlap + bias);
                                    p.vx *= 0.5;
                                } else {
                                    // Vertical
                                    p.y += (dy > 0 ? 1 : -1) * (yOverlap + bias);
                                    p.vy = 0;
                                    p.vr = 0;
                                    p.vx = 0;
                                }
                                collisionResolved = true;
                                break; // Break offset loop
                            }
                        }
                    }
                }
                if (collisionResolved) break; // Break block loop
            }
            if (!collisionResolved) break; // Stable
        }
    }

    isTouchingGround(p) {
        let touching = false;
        const blocks = this.getRotatedBlockPositions(p);
        blocks.forEach(b => {
            // Check Floor (Bottom edge is b.y + 0.5)
            if (b.y + 0.5 >= 19.9) touching = true;

            // Check Grid (Check slightly below bottom edge)
            const checkY = b.y + 0.5 + 0.1;
            const gx = Math.floor(b.x);
            const gy = Math.floor(checkY);

            if (gy >= 0 && gy < 20 && gx >= 0 && gx < 10) {
                if (this.grid[gy][gx]) touching = true;
            }
        });
        return touching;
    }

    checkCollision(p) {
        // We can reuse getRotatedBlockPositions if we carefully pass 'p' which might be a clone
        // But getRotatedBlockPositions expects p to have x,y,rotation,shape
        const blocks = this.getRotatedBlockPositions(p);
        for (let b of blocks) {
            // Check boundaries
            if (b.x < 0 || b.x >= 10 || b.y >= 20) return true;
            const gx = Math.floor(b.x);
            const gy = Math.floor(b.y);
            if (gy >= 0 && this.grid[gy][gx]) return true;
        }
        return false;
    }

    snapAndLock(p) {
        // 1. Snap rotation to nearest 90 deg
        const deg = p.rotation * (180 / Math.PI);
        const snappedDeg = Math.round(deg / 90) * 90;

        // Normalize shape rotation based on snappedDeg
        // ... This is tricky. Simplified: Force rotation to 0 visuals
        // and actually rotate the grid shape if needed.
        // For this demo: Just Reset Rotation visually and Lock. 
        // Real logic needs to permute matrix 'k' times.

        let k = Math.round(deg / 90) % 4;
        if (k < 0) k += 4;

        let newShape = p.shape;
        for (let i = 0; i < k; i++) {
            newShape = newShape[0].map((_, idx) => newShape.map(row => row[idx]).reverse());
        }

        p.shape = newShape;
        p.rotation = 0;
        p.x = Math.round(p.x);
        p.y = Math.round(p.y);

        // Hard fix out of bounds after rotate
        while (this.checkCollision(p)) {
            p.y--; // Push up
            if (p.y < -5) { // Panic
                this.gameOver = true;
                return;
            }
        }

        this.lockPiece(p);
    }

    lockPiece(p) {
        this.audio.playDrop();

        p.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) {
                    const gy = Math.round(p.y + y);
                    const gx = Math.round(p.x + x);
                    if (gy >= 0 && gy < 20 && gx >= 0 && gx < 10) {
                        this.grid[gy][gx] = p.color;
                    }
                }
            });
        });

        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let lines = 0;
        for (let y = 19; y >= 0; y--) {
            if (this.grid[y].every(c => c !== null)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(10).fill(null));
                lines++;
                y++;
            }
        }
        if (lines > 0) {
            this.score += lines * 100 * lines;
            this.finalScoreElement.innerText = this.score;
            this.scoreElement.innerText = this.score;
            this.audio.playClear();
        }
    }

    updateScore(s) {
        this.score = s;
        this.scoreElement.innerText = s;
    }
}

/**
 * INPUT
 */
class InputHandler {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.bindEvents();
    }

    bindEvents() {
        const h = this.handlePointer.bind(this);
        this.canvas.addEventListener('pointerdown', h);
        window.addEventListener('pointermove', h);
        window.addEventListener('pointerup', h);
        this.canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }

    handlePointer(e) {
        // Prevent default browser zooming/scrolling for touches
        if (e.type === 'touchstart' || e.type === 'touchmove') e.preventDefault();

        // Always update input target for debug
        const worldPos = this.game.renderer.toWorld(e.clientX, e.clientY);
        this.game.inputTarget = worldPos;
        this.game.debugMouse = { x: e.clientX, y: e.clientY };

        if (e.type === 'pointerdown') {
            const p = this.game.activePiece;
            if (p) {
                const cx = p.x + p.shape[0].length / 2;
                const cy = p.y + p.shape.length / 2;
                const dist = Math.hypot(worldPos.x - cx, worldPos.y - cy);

                // Debug Hit Test
                console.log(`Click World: ${worldPos.x}, ${worldPos.y} | Piece Center: ${cx}, ${cy} | Dist: ${dist}`);

                // Increased Radius for easier grabbing on mobile
                if (dist < 4.0) {
                    p.isGrabbed = true;
                    this.game.audio.playGrab();

                    const dx = worldPos.x - cx;
                    const dy = worldPos.y - cy;
                    const cos = Math.cos(-p.rotation);
                    const sin = Math.sin(-p.rotation);
                    p.grabOffsetX = dx * cos - dy * sin;
                    p.grabOffsetY = dx * sin + dy * cos;
                }
            }
        }
        else if (e.type === 'pointerup') {
            if (this.game.activePiece) {
                this.game.activePiece.isGrabbed = false;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const renderer = new Renderer(canvas);
    const audio = new AudioController();
    const game = new Game(renderer, audio);
    new InputHandler(game, canvas);

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('start-screen').classList.add('hidden');
        game.start();
    };
    document.getElementById('restart-btn').onclick = () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        game.start();
    };
});
