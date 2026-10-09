'use strict';

// Automated tests for the pure helpers in bot.js.
// Run with: npm test   (uses Node's built-in test runner)
// These tests need no network, no Minecraft server and no
// Discord token — importing bot.js does not start the bots.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RecentKeys,
  normalizeDiscordContent,
  isPlayerlistMessage,
  formatPlayerList,
  yawToFace,
  angularDifference,
  isLookingAt,
  parseMessagestrAsPlayerChat,
} = require('./bot.js');

test('formatPlayerList uses the real names and count, in the required shape', () => {
  assert.equal(formatPlayerList(['Player1', 'Player2']), 'Server 2 online: Player1, Player2');
  assert.equal(formatPlayerList(['SASUKE_440']), 'Server 1 online: SASUKE_440');
  assert.equal(formatPlayerList([]), 'Server 0 online: ');
});

test('isPlayerlistMessage matches only the word Playerlist', () => {
  assert.equal(isPlayerlistMessage('Playerlist'), true);
  assert.equal(isPlayerlistMessage('  playerlist  '), true);
  assert.equal(isPlayerlistMessage('PLAYERLIST'), true);
  assert.equal(isPlayerlistMessage('Playerlist please'), false);
  assert.equal(isPlayerlistMessage('/playerlist'), false);
  assert.equal(isPlayerlistMessage('Hi'), false);
});

test('normalizeDiscordContent collapses newlines so one Discord message = one MC chat', () => {
  assert.equal(normalizeDiscordContent('Hi\nthere\r\nfriend'), 'Hi there friend');
  assert.equal(normalizeDiscordContent('  spaced   out  '), 'spaced out');
  assert.equal(normalizeDiscordContent(''), '');
  assert.equal(normalizeDiscordContent(null), '');
});

test('RecentKeys lets a key through once, then blocks duplicates inside the window', () => {
  const keys = new RecentKeys(3_000);
  assert.equal(keys.firstTime('abc', 1_000), true);
  assert.equal(keys.firstTime('abc', 2_000), false); // duplicate
  assert.equal(keys.firstTime('xyz', 2_000), true); // different key
  assert.equal(keys.firstTime('abc', 5_001), true); // window passed
});

test('yawToFace + isLookingAt: facing the bot counts, facing away does not', () => {
  const playerPos = { x: 0, y: 64, z: 0 };
  const botPos = { x: 3, y: 64, z: -4 };
  const facingBot = { position: playerPos, yaw: yawToFace(playerPos, botPos) };
  assert.equal(isLookingAt(facingBot, botPos), true);
  const facingAway = { position: playerPos, yaw: yawToFace(playerPos, botPos) + Math.PI };
  assert.equal(isLookingAt(facingAway, botPos), false);
  assert.equal(isLookingAt({ position: playerPos }, botPos), false); // no yaw known
});

test('angularDifference wraps around at 2*pi', () => {
  assert.ok(angularDifference(0.1, Math.PI * 2 - 0.1) < 0.21);
  assert.ok(Math.abs(angularDifference(0, Math.PI) - Math.PI) < 1e-9);
});

test('parseMessagestrAsPlayerChat accepts real chat formats', () => {
  const online = ['NAPA_EXTEND', 'Steve', 'SASUKE_440'];
  assert.deepEqual(
    parseMessagestrAsPlayerChat('<NAPA_EXTEND> ayyyhay', online, 'SASUKE_440'),
    { username: 'NAPA_EXTEND', message: 'ayyyhay' });
  assert.deepEqual(
    parseMessagestrAsPlayerChat('Steve: hello there', online, 'SASUKE_440'),
    { username: 'Steve', message: 'hello there' });
  assert.deepEqual(
    parseMessagestrAsPlayerChat('[VIP] Steve » ranked hello', online, 'SASUKE_440'),
    { username: 'Steve', message: 'ranked hello' });
});

test('parseMessagestrAsPlayerChat rejects system lines, strangers and the bot itself', () => {
  const online = ['Steve', 'SASUKE_440'];
  assert.equal(parseMessagestrAsPlayerChat('Steve joined the game', online, 'SASUKE_440'), null);
  assert.equal(parseMessagestrAsPlayerChat('Welcome to Havencraft!', online, 'SASUKE_440'), null);
  assert.equal(parseMessagestrAsPlayerChat('<Stranger> hi', online, 'SASUKE_440'), null);
  assert.equal(parseMessagestrAsPlayerChat('<SASUKE_440> my own words', online, 'SASUKE_440'), null);
});
