#!/usr/bin/env node
// /pets:setup: copia el lanzador fijo y apunta la statusLine a él. Si ya había otra statusLine (p. ej. claude-hud),
// la guarda en "encadenar" para que la mascota entre como UNA línea debajo de la del modelo.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
const dir = env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude');
const casa = path.join(dir, 'plugins', 'claude-pets');
const lanzador = path.join(casa, 'launcher.js');
const settingsPath = path.join(dir, 'settings.json');
const cfgPath = path.join(casa, 'config.json');

fs.mkdirSync(casa, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'launcher.js'), lanzador);

let settings = {};
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, '')); // si no es JSON válido, paramos sin tocar nada
  fs.copyFileSync(settingsPath, settingsPath + '.bak-claude-pets');
}
const q = (p) => `"${p.replace(/\\/g, '/')}"`;
const nuestro = `${q(process.execPath)} ${q(lanzador)}`;
const previo = settings.statusLine && settings.statusLine.command;

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) {}
if (previo && !/mascota|claude-pets/.test(previo)) cfg.encadenar = previo;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

settings.statusLine = { type: 'command', command: nuestro, padding: 0 };
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log(`=^.^= done. statusLine -> ${nuestro}`);
if (cfg.encadenar) console.log(`Your previous statusLine is kept: the kitty sits on one line right below the model line.`);
console.log(`Backup: ${settingsPath}.bak-claude-pets · Your settings: ${cfgPath}`);
