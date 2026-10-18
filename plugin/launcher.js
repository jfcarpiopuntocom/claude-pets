#!/usr/bin/env node
// Ejecuta la versión más nueva instalada de claude-pets. /pets:setup copia este archivo a
// <config>/plugins/claude-pets/ para que la statusLine siga funcionando cuando el plugin se actualiza.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
const cache = path.join(env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude'), 'plugins', 'cache');
const ls = (d) => { try { return fs.readdirSync(d); } catch (e) { return []; } };
const ver = (n) => (/^(\d+)\.(\d+)\.(\d+)/.exec(n) || []).slice(1).map(Number);
let best = null;
for (const m of ls(cache)) for (const v of ls(path.join(cache, m, 'pets'))) {
  const f = path.join(cache, m, 'pets', v, 'pet.js'), x = ver(v);
  if (x.length && fs.existsSync(f) && (!best || x[0] - best.x[0] || x[1] - best.x[1] || x[2] - best.x[2]) > 0) best = { x, f };
}
if (best) require(best.f); else process.stdout.write('=^.^= (reinstall: /plugin install pets@claude-pets)');
