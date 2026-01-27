import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { AudioController } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const renderer = new Renderer(canvas);
    const audio = new AudioController();
    const game = new Game(renderer, audio);
    const input = new InputHandler(game, canvas);

    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');
    const restartBtn = document.getElementById('restart-btn');
    const gameOverScreen = document.getElementById('game-over-screen');

    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        game.start();
    });

    restartBtn.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        game.start();
    });
});
