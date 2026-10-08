'use strict';

// Havencraft AFK / greeting bot — SASUKE_440
// The AuthMe login command is read ONLY from the MC_LOGIN_CMD
// environment variable (a GitHub Actions Secret). It is never
// written in this file and never printed to the logs.

const mineflayer = require('mineflayer');

const HOST = process.env.MC_HOST || 'mc.havencraft.pro';
const PORT = parseInt(process.env.MC_PORT || '2566', 10);
const USERNAME = process.env.MC_USERNAME || 'SASUKE_440';
// Leave MC_VERSION unset so mineflayer negotiates the version
// with the server automatically. Set it only if the server
// requires one exact version string.
const VERSION = process.env.MC_VERSION || false;
const LOGIN_CMD = (process.env.MC_LOGIN_CMD || '').trim();

const RECONNECT_AFTER_DISCONNECT_MS = 15_000; // was online, dropped
const RETRY_WHEN_SERVER_DOWN_MS = 120_000; // could not connect at all
const RANDOM_LOOK_EVERY_MS = 30_000;
const DOUBLE_CROUCH_EVERY_MS = 120_000;
const PLAYER_SCAN_EVERY_MS = 1_000;
const GREET_RANGE_BLOCKS = 6;
const GREET_COOLDOWN_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let bot = null;
let timers = [];
let reconnectTimer = null;
let reconnectScheduled = false;
let crouching = false;
const lastGreetedAt = new Map();

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function addTimer(fn, ms) {
  const t = setInterval(fn, ms);
  timers.push(t);
  return t;
}

function clearTimers() {
  for (const t of timers) clearInterval(t);
  timers = [];
}

async function doubleCrouch(activeBot) {
  if (crouching || !activeBot || !activeBot.entity) return;
  crouching = true;
  try {
    for (let i = 0; i < 2; i++) {
      activeBot.setControlState('sneak', true);
      await sleep(350);
      activeBot.setControlState('sneak', false);
      await sleep(250);
    }
  } catch {
    // Bot disconnected mid-crouch — the reconnect handler takes over.
  } finally {
    crouching = false;
    try { activeBot.setControlState('sneak', false); } catch {}
  }
}

function randomLook(activeBot) {
  if (!activeBot.entity) return;
  const yaw = Math.random() * Math.PI * 2 - Math.PI;
  const pitch = Math.random() * 0.8 - 0.4; // -0.4 .. +0.4 rad
  activeBot.look(yaw, pitch, true).catch(() => {});
}

async function greetNearbyPlayers(activeBot) {
  if (!activeBot.entity || crouching) return;
  const now = Date.now();

  const nearby = Object.values(activeBot.entities)
    .filter((e) =>
      e &&
      e.type === 'player' &&
      e.username &&
      e.username !== activeBot.username &&
      e.position &&
      activeBot.entity.position.distanceTo(e.position) <= GREET_RANGE_BLOCKS)
    .sort((a, b) =>
      activeBot.entity.position.distanceTo(a.position) -
      activeBot.entity.position.distanceTo(b.position));

  for (const player of nearby) {
    const last = lastGreetedAt.get(player.username) || 0;
    if (now - last < GREET_COOLDOWN_MS) continue;

    lastGreetedAt.set(player.username, now);
    log(`Player nearby: ${player.username} — greeting`);
    try {
      const height = typeof player.height === 'number' ? player.height : 1.62;
      await activeBot.lookAt(player.position.offset(0, height, 0), true);
    } catch {}
    await doubleCrouch(activeBot);
    break; // greet one player per scan
  }
}

function scheduleReconnect(wasSpawned) {
  if (reconnectScheduled) return;
  reconnectScheduled = true;
  clearTimers();

  const delay = wasSpawned ? RECONNECT_AFTER_DISCONNECT_MS : RETRY_WHEN_SERVER_DOWN_MS;
  log(`Reconnecting in ${Math.round(delay / 1000)}s...`);
  reconnectTimer = setTimeout(() => {
    reconnectScheduled = false;
    createBot();
  }, delay);
}

function createBot() {
  if (!LOGIN_CMD) {
    log('WARNING: MC_LOGIN_CMD is not set. The bot will join but cannot log in with AuthMe.');
  }

  log(`Connecting to ${HOST}:${PORT} as ${USERNAME} (offline mode)...`);
  let spawned = false;

  bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    auth: 'offline',
    version: VERSION,
    hideErrors: false,
  });

  bot.once('spawn', async () => {
    spawned = true;
    log('Spawned in server.');

    // AuthMe login a few seconds after spawn, so the server
    // is ready to accept the command.
    await sleep(3_000);
    if (LOGIN_CMD && bot) {
      try {
        bot.chat(LOGIN_CMD); // value comes from the Secret, never logged
        log('AuthMe login command sent.');
      } catch (err) {
        log('Could not send login command:', err.message);
      }
    }

    addTimer(() => randomLook(bot), RANDOM_LOOK_EVERY_MS);
    addTimer(() => { doubleCrouch(bot); }, DOUBLE_CROUCH_EVERY_MS);
    addTimer(() => { greetNearbyPlayers(bot); }, PLAYER_SCAN_EVERY_MS);
  });

  bot.on('kicked', (reason) => {
    log('Kicked:', typeof reason === 'string' ? reason : JSON.stringify(reason));
  });

  bot.on('error', (err) => {
    log('Error:', err && err.message ? err.message : err);
  });

  bot.once('end', (reason) => {
    log('Disconnected:', reason || 'connection ended');
    const wasSpawned = spawned;
    bot = null;
    scheduleReconnect(wasSpawned);
  });
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

createBot();
