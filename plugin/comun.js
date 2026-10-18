// Shared by setup.js, pick.js and remove.js: where things live, and safe JSON reading (never overwrite a file we cannot read).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
const dir = env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude');
const home = path.join(dir, 'plugins', 'claude-pets');
const ours = (c) => /claude-mascotas|claude-pets|mascota-statusline/.test(c || '');

function readJson(f, fallback) {
  if (!fs.existsSync(f)) return fallback;
  try { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); } catch (e) {
    console.error(`Could not read this file (invalid JSON?). Nothing was changed: ${f}`);
    process.exit(1);
  }
}
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); };

module.exports = { dir, home, ours, readJson, writeJson, settingsPath: path.join(dir, 'settings.json'), cfgPath: path.join(home, 'config.json'), launcher: path.join(home, 'launcher.js') };
