#!/usr/bin/env node
// /pets:setup: copies the fixed launcher and points your statusLine at it (refreshing every second so the pet
// blinks). Your previous statusLine is kept: it keeps running, and the pet goes in as ONE line below the model line.
'use strict';
const fs = require('fs');
const path = require('path');
const { dir, home, ours, readJson, writeJson, settingsPath, cfgPath, launcher } = require('./comun.js');

const settings = readJson(settingsPath, {});
const cfg = readJson(cfgPath, {});
fs.mkdirSync(home, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'launcher.js'), launcher);
if (fs.existsSync(settingsPath) && !fs.existsSync(settingsPath + '.bak-claude-pets')) fs.copyFileSync(settingsPath, settingsPath + '.bak-claude-pets');

const prev = settings.statusLine || {};
if (cfg.encadenar && !cfg.chain) cfg.chain = cfg.encadenar;
delete cfg.encadenar;
if (prev.command && !ours(prev.command)) {
  cfg.chain = prev.command;
  cfg.previousStatusLine = prev;
} else if (ours(prev.command) && !cfg.chain) {
  // coming from the other language's plugin (or the old mascota-statusline): inherit what it was keeping
  for (const sib of ['claude-mascotas', 'claude-pets', 'mascota']) {
    const c = readJson(path.join(dir, 'plugins', sib, 'config.json'), {});
    const ch = c.chain || c.encadenar;
    if (ch && !ours(ch)) { cfg.chain = ch; if (c.previousStatusLine) cfg.previousStatusLine = c.previousStatusLine; break; }
  }
}
writeJson(cfgPath, cfg);

// plain `node` from PATH: works in bash, cmd and PowerShell, and survives node upgrades
const command = `node "${launcher.replace(/\\/g, '/')}"`;
settings.statusLine = { ...prev, type: 'command', command, refreshInterval: prev.refreshInterval && prev.refreshInterval < 1 ? prev.refreshInterval : 1 };
writeJson(settingsPath, settings);
console.log(`=^.^= done. statusLine -> ${command}`);
if (cfg.chain) console.log('Your previous statusLine keeps running: the pet sits on one line right below the model line.');
console.log(`Backup: ${settingsPath}.bak-claude-pets · Your settings: ${cfgPath}`);
console.log('Not showing up in a few seconds? Restart Claude Code.');
