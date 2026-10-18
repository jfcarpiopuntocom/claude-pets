#!/usr/bin/env node
// Rebuilds the README gallery from the config. Run: node scripts/gallery.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { creatures } = JSON.parse(fs.readFileSync(path.join(root, 'plugin', 'pet.config.json'), 'utf8'));
const c = (s) => '`' + s + '`';
const rows = Object.entries(creatures).map(([k, v]) => `| ${v.name} | ${c(v.calm[0])} | ${c(v.working[0])} | ${c(v.error[0])} | ${c(v.sleeping[0])} | ${c(k)} |`);
const table = ['| Pet | Chilling | On it | Something broke | Napping | Key |', '|---|---|---|---|---|---|', ...rows].join('\n');
const readme = path.join(root, 'README.md');
const s = fs.readFileSync(readme, 'utf8');
const a = '<!-- gallery:start -->', b = '<!-- gallery:end -->';
fs.writeFileSync(readme, s.slice(0, s.indexOf(a) + a.length) + '\n' + table + '\n' + s.slice(s.indexOf(b)));
console.log(rows.length + ' pets in the gallery');
