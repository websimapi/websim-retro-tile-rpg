// Remove all code that was moved to game.js and replace with:
import { Game } from './game.js';

const svg = document.getElementById('game-svg');
const gameContainer = document.getElementById('game-container');
const devInfo = document.getElementById('dev-info');

const game = new Game(svg, gameContainer, devInfo);
game.initializeGame();

