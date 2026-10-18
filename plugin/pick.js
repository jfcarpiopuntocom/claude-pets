#!/usr/bin/env node
// /pets:pick [name]: with no name, lists every pet; with a name (or "random"), saves it in your settings,
// which live outside the plugin and survive updates. Your agent team comes in the same species.
'use strict';
const fs = require('fs');
const path = require('path');
const { readJson, writeJson, cfgPath } = require('./comun.js');

const { creatures } = JSON.parse(fs.readFileSync(path.join(__dirname, 'pet.config.json'), 'utf8'));
const keys = Object.keys(creatures);
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
let want = norm(process.argv.slice(2).join(' '));

if (!want) {
  console.log('Available pets (pick one with /pets:pick <name>):\n');
  for (const k of keys) console.log(`  ${creatures[k].calm[0].padEnd(18)} ${k}`);
  process.exit(0);
}
if (want === norm('random')) want = keys[Math.floor(Math.random() * keys.length)];
const k = keys.find((x) => x === want || norm(creatures[x].name) === want);
if (!k) { console.log(`I do not know that pet: ${want}. /pets:pick`); process.exit(1); }
const cfg = readJson(cfgPath, {});
cfg.creature = k;
writeJson(cfgPath, cfg);
console.log(`${creatures[k].calm[0]}  Picked: ${creatures[k].name}.`);
