/*
 * STAR BLASTER — js modules (load order matters)
 *
 * 01-core.js       canvas, constants, state
 * 02-sound.js      Sfx
 * 03-ui-hud.js     HUD / speed / gauge / lives
 * 04-wave-shop.js  wave shop
 * 05-perm-tree.js  permanent tree + PermHub
 * 06-accounts.js   CloudSync, profiles, highscores, difficulty, feedback
 * 07-screen-ui.js  ScreenUI overlays
 * 08-input.js      keyboard / touch
 * 09-visual.js     particles, stars, perf tier
 * 10-combat.js     player, bullets, enemies, powerups, collision
 * 11-game.js       update, draw, start/end, gameLoop
 * 12-debug.js      debug mode
 * 13-tutorial.js   tutorial
 * 99-init.js       boot (must be last)
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ===== CONSTANTS & CONFIG =====
const W = canvas.width, H = canvas.height;

// ===== STATE VARIABLES =====
let state = 'title'; // title | playing | upgrade | gameover | permTree | debug
let debugPauseReturn = false;
let score = 0, highscore = 0, level = 1, lives = 3;
let debugMode = false;
let debugUnlocked = false; // リロードのたびにロック
let debugInvincible = false;
let frameCount = 0;
let comboCount = 0, comboTimer = 0;
const orbitGuardCooldowns = [0, 0, 0];
let lastWasBossKill = false;
let permKillSpeedTimer = 0;

