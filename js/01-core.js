/*
 * STAR BLASTER — js modules (load order matters)
 *
 * 01-core.js         canvas, constants, core game state
 * 02-sound.js        Sfx
 * 03-ui-hud.js       HUD / speed / gauge / lives / canvas overlays
 * 04-wave-shop.js    wave shop (UPGRADES, upgradeLevels, shop getters/UI)
 * 05-characters.js   characters, passives, character select
 * 06-forbidden.js    forbidden shop card (1% rare offer)
 * 07-perm-tree.js    permanent tree, perm getters, PermHub
 * 08-accounts.js     CloudSync, profiles, highscores, difficulty, feedback
 * 09-screen-ui.js    ScreenUI overlays
 * 10-input.js        keyboard / touch
 * 11-visual.js       particles, stars, perf tier
 * 12-combat.js       player, bullets, enemies, powerups, collision, render
 * 13-game.js         update, draw, start/end, gameLoop
 * 14-debug.js        debug mode
 * 15-tutorial.js     tutorial
 * 16-achievements.js achievements
 * 99-init.js         boot (must be last)
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ===== CONSTANTS =====
const W = canvas.width, H = canvas.height;

// ===== CORE GAME STATE =====
// state: title | playing | upgrade | gameover | permTree | debug
let state = 'title';
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

// Domain state lives in sibling modules:
//   03-ui-hud.js      — gameSpeed, specialGauge, visualLiteMode
//   04-wave-shop.js   — upgradePoints, upgradeLevels, shopPurchasedIds
//   05-characters.js  — activeCharId, ownedChars
//   06-forbidden.js   — forbiddenOffer, forbiddenOwned
//   07-perm-tree.js   — permPoints, permLevels, charPermData
//   08-accounts.js    — difficultyId, playDifficultyId, activeProfileId
//   10-input.js       — keys, touchInput
//   11-visual.js      — particles, stars, _perfTier
//   12-combat.js      — player, bullets, enemies, powerups, bossActive
