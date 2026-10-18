#!/usr/bin/env node
// claude-pets: one-line ASCII pets for the Claude Code statusLine. No dependencies. Never throws.
// Design rule: ALWAYS exactly one line. Every active agent gets its own little pet, side by side, on that same line.
// by J.F.Carpio -jfcarpio.com- for Avatiun Consultores. MIT.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOME = 'claude-pets', CFG = 'pet.config.json', ENV = 'PETS_CONFIG';
const FALLBACK = '=^.^=';
const plain = (s) => s.replace(/\x1b\[[0-9;]*m|\x1b\]8;;[^\x1b]*\x1b\\/g, '');

function configDir() {
  const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
  return env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude');
}

// plugin defaults + user overrides (the user file lives outside the plugin, so it survives updates)
function readConfig() {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, CFG), 'utf8').replace(/^\uFEFF/, ''));
  for (const f of [path.join(configDir(), 'plugins', HOME, 'config.json'), process.env[ENV]].filter(Boolean)) {
    try { Object.assign(base, JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''))); } catch (e) {}
  }
  return base;
}

// Agents on your team: Agent/Task tool calls near the end of the transcript, with their real name
// (name > subagent_type > description). One stops counting when its <task-notification> arrives with its
// tool-use-id, when its result comes back (foreground agents), or when the active window runs out.
function activeAgents(tp, windowSec) {
  const live = new Map(); // tool_use_id -> { name, t }
  let fd;
  try {
    fd = fs.openSync(tp, 'r');
    const size = fs.fstatSync(fd).size, len = Math.min(size, 512 * 1024), buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const now = Date.now();
    for (const line of buf.toString('utf8').split('\n')) {
      if (line.includes('"tool_use"') && /"name":"(Agent|Task)"/.test(line)) {
        try {
          const j = JSON.parse(line);
          for (const c of (j.message && j.message.content) || []) {
            if (c.type !== 'tool_use' || !/^(Agent|Task)$/.test(c.name)) continue;
            const inp = c.input || {};
            live.set(c.id, { name: String(inp.name || inp.subagent_type || inp.description || 'agent').slice(0, 18), t: Date.parse(j.timestamp || '') || now });
          }
        } catch (e) {}
        continue;
      }
      for (const id of live.keys()) {
        if (!line.includes(id)) continue;
        if (/<status>(completed|failed|killed)</.test(line)) live.delete(id);
        // shortcut: a result that does not talk about a background launch counts as done; revisit if Claude Code changes that text
        else if (line.includes('"tool_result"') && !/async|background|segundo plano|launched|running/i.test(line)) live.delete(id);
      }
    }
    for (const [id, a] of live) if ((now - a.t) / 1000 > windowSec) live.delete(id);
  } catch (e) {} finally { try { if (fd !== undefined) fs.closeSync(fd); } catch (e) {} }
  return [...new Set([...live.values()].map((a) => a.name))];
}

try {
  const cfg = readConfig();
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (e) {}
  let input = null;
  try { input = JSON.parse(raw); } catch (e) {}

  const now = Date.now();
  const th = cfg.thresholds;
  let state = 'calm', age = Infinity, tp = null;
  if (input && input.transcript_path) {
    try { age = (now - fs.statSync(input.transcript_path).mtimeMs) / 1000; tp = input.transcript_path; } catch (e) {}
  }

  let err = false;
  if (tp && age < th.errorWindowSec) {
    const fd = fs.openSync(tp, 'r');
    try {
      const size = fs.fstatSync(fd).size, len = Math.min(size, 65536), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      err = buf.toString('utf8').split('\n').filter(Boolean).slice(-th.errorTailLines).some((l) => /"is_error"\s*:\s*true/.test(l));
    } finally { fs.closeSync(fd); }
  }
  const team = tp ? activeAgents(tp, th.agentWindowSec || 1800) : [];

  if (err) state = 'error';
  else if (team.length) state = 'agents';
  else if (tp && age < th.workingSec) state = 'working';
  else if (tp && age > th.sleepSec) state = 'sleeping';

  const frame = new Date(now).getSeconds() % 2;
  const cr = cfg.creatures[cfg.creature] || cfg.creatures['kitty'];
  const ov = cr.messages && cr.messages[cfg.lang];
  const key = state === 'agents' ? (team.length === 1 ? 'agents1' : 'agentsN') : state;
  const msg = ((ov && ov[key]) || cfg.messages[cfg.lang][key]).replace('{n}', team.length);

  let line = `${cr[state][frame]} ${msg}`;
  if (cfg.color) line = `\x1b[${{ calm: 36, working: 33, agents: 35, error: 31, sleeping: 90 }[state]}m${line}\x1b[0m`;

  // every real agent with its own little pet of the same species, on the SAME line (cap = maxAgents, the rest as +n)
  if (team.length) {
    const max = cfg.maxAgents || 4;
    const pets = team.slice(0, max).map((n, i) => `${cr.working[(frame + i) % 2]} ${n}`).join('  ');
    const extra = team.length > max ? `  +${team.length - max}` : '';
    line += cfg.color ? `  \x1b[35m${pets}${extra}\x1b[0m` : `  ${pets}${extra}`;
  }

  const fi = cfg.firma;
  if (fi && fi.enabled && fi.url) {
    const link = `\x1b]8;;${fi.url}\x1b\\${fi.glifo || '@'}\x1b]8;;\x1b\\`;
    line += cfg.color ? `  \x1b[38;5;214m${link}\x1b[0m` : `  ${link}`;
  }

  // one line, cut to the terminal width when needed
  const width = Number.parseInt(process.env.COLUMNS || '', 10);
  if (width > 20 && plain(line).length > width - 4) line = plain(line).slice(0, width - 5) + '…';

  // chained with another statusLine (e.g. claude-hud): the pet goes in as ONE line right below the model line
  if (cfg.encadenar) {
    try {
      const r = spawnSync(cfg.encadenar, { input: raw, shell: true, timeout: 1500, encoding: 'utf8', windowsHide: true });
      const o = (r.stdout || '').replace(/[\r\n]+$/, '');
      if (r.status === 0 && !r.error && o) {
        const ls = o.split(/\r?\n/);
        const i = ls.findIndex((x) => /opus|sonnet|haiku|fable|claude/i.test(plain(x)));
        ls.splice(i < 0 ? 1 : i + 1, 0, line);
        line = ls.join('\n');
      }
    } catch (e) {}
  }
  process.stdout.write(line);
} catch (e) {
  process.stdout.write(FALLBACK);
}
