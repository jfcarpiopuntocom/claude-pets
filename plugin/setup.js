#!/usr/bin/env node
// /pets:setup: copies the fixed launcher and points your statusLine at it. If you already had another
// statusLine (e.g. claude-hud), it is kept in "encadenar" and the pet goes in as ONE line below the model line.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
const dir = env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude');
const home = path.join(dir, 'plugins', 'claude-pets');
const launcher = path.join(home, 'launcher.js');
const settingsPath = path.join(dir, 'settings.json');
const cfgPath = path.join(home, 'config.json');

fs.mkdirSync(home, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'launcher.js'), launcher);

let settings = {};
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '')); // invalid JSON: stop without touching anything
  fs.copyFileSync(settingsPath, settingsPath + '.bak-claude-pets');
}
const q = (p) => `"${p.replace(/\\/g, '/')}"`;
const ours = `${q(process.execPath)} ${q(launcher)}`;
const previous = settings.statusLine && settings.statusLine.command;

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) {}
if (previous && !/claude-mascotas|claude-pets|mascota-statusline/.test(previous)) cfg.encadenar = previous;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

settings.statusLine = { type: 'command', command: ours, padding: 0 };
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log(`=^.^= done. statusLine -> ${ours}`);
if (cfg.encadenar) console.log('Your previous statusLine is kept: the pet sits on one line right below the model line.');
console.log(`Backup: ${settingsPath}.bak-claude-pets · Your settings: ${cfgPath}`);
