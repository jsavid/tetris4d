export class AudioController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(frequency, type, duration, volume = 0.1) {
        if (!this.enabled || !this.ctx) return;
        
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
    }

    playGrab() {
        // High pitched blip
        this.playTone(440, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(880, 'sine', 0.1, 0.1), 50);
    }

    playMove() {
        // Very subtle click
        this.playTone(200, 'triangle', 0.05, 0.05);
    }

    playRotate() {
        // Whoosh-like sound
        this.playTone(600, 'sine', 0.15, 0.1);
    }

    playDrop() {
        // Thud
        this.playTone(100, 'square', 0.2, 0.2);
    }

    playClear() {
        // Success chord
        this.playTone(440, 'sine', 0.3, 0.1);
        setTimeout(() => this.playTone(554, 'sine', 0.3, 0.1), 100);
        setTimeout(() => this.playTone(659, 'sine', 0.4, 0.1), 200);
    }

    playGameOver() {
        this.playTone(300, 'sawtooth', 0.5, 0.2);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.2), 300);
        setTimeout(() => this.playTone(150, 'sawtooth', 1.0, 0.2), 600);
    }
}
