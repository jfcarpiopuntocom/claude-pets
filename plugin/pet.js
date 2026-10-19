#!/usr/bin/env node
// claude-pets: one-line ASCII pets for the Claude Code statusLine. No dependencies, no network. Never throws.
// Design rule: ALWAYS exactly one line. Every active agent gets its own little pet, side by side, on that same line.
// by J.F.Carpio -jfcarpio.com- for Avatiun Consultores. MIT.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const HOME = 'claude-pets', CFG = 'pet.config.json', DEF = 'kitty', LANG = 'en';
const FALLBACK = '=^.^=';
const plain = (s) => s.replace(/\x1b\[[0-9;]*m|\x1b\]8;;[^\x1b]*\x1b\\/g, '');
process.stdout.on('error', () => process.exit(0));

function configDir() {
  const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
  return env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude');
}
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) {
  for (const [k, v] of Object.entries(b)) a[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return a;
}

// plugin defaults, deep-merged with the user's file (it lives outside the plugin, so it survives updates)
function readConfig() {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, CFG), 'utf8').replace(/^﻿/, ''));
  for (const f of [path.join(configDir(), 'plugins', HOME, 'config.json'), process.env.PETS_CONFIG].filter(Boolean)) {
    try { merge(base, JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''))); } catch (e) {}
  }
  // older Spanish key still works
  if (base.encadenar && !base.chain) base.chain = base.encadenar;
  if (!base.messages[base.lang]) base.lang = LANG;
  return base;
}

// Visible width: wide CJK/emoji count 2, joiners/variation selectors 0.
function width(s) {
  let w = 0;
  for (const ch of plain(s)) {
    const c = ch.codePointAt(0);
    if (c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f) || (c >= 0x300 && c <= 0x36f)) continue;
    w += (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1faff) ||
      (c >= 0x20000 && c <= 0x3fffd) ? 2 : 1;
  }
  return w;
}
const cut = (s, n) => [...s].slice(0, n).join('');

// Agents on your team, remembered per session in a tiny state file, so long sessions keep working: each run only
// reads the bytes added since the last one. An agent leaves when its <task-notification> with its tool-use-id
// arrives, when its result comes back (foreground agents), or when the active window runs out.
function activeAgents(tp, sid, windowSec) {
  const dir = path.join(configDir(), 'plugins', HOME, 'state');
  const sf = path.join(dir, String(sid || tp).replace(/[^\w-]/g, '_').slice(-80) + '.json');
  let st = { off: 0, live: {} };
  try { st = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch (e) {}
  const now = Date.now();
  let fd;
  try {
    const size = fs.statSync(tp).size;
    if (size < st.off) st = { off: 0, live: {} };
    const from = Math.max(st.off, size - 8 * 1024 * 1024);
    if (size > from) {
      fd = fs.openSync(tp, 'r');
      const buf = Buffer.alloc(size - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      const end = buf.lastIndexOf(0x0a);
      if (end >= 0) {
        const lines = buf.slice(0, end).toString('utf8').split('\n');
        if (from > st.off) lines.shift(); // skipped ahead past the 8 MB cap: the first line is partial
        st.off = from + end + 1;
        for (const line of lines) {
          if (line.includes('"tool_use"') && /"name":"(Agent|Task)"/.test(line)) {
            try {
              const j = JSON.parse(line);
              for (const c of (j.message && j.message.content) || []) {
                if (c.type !== 'tool_use' || !/^(Agent|Task)$/.test(c.name)) continue;
                const inp = c.input || {};
                st.live[c.id] = { name: cut(String(inp.name || inp.subagent_type || inp.description || 'agent'), 18), t: Date.parse(j.timestamp || '') || now };
              }
            } catch (e) {}
            continue;
          }
          for (const id of Object.keys(st.live)) {
            if (!line.includes(id)) continue;
            if (/<status>(completed|failed|killed)</.test(line)) delete st.live[id];
            // shortcut: a result that does not talk about a background launch counts as done; revisit if Claude Code changes that text
            else if (line.includes('"tool_result"') && !/async|background|segundo plano|launched|running/i.test(line)) delete st.live[id];
          }
        }
      }
    }
    for (const [id, a] of Object.entries(st.live)) if ((now - a.t) / 1000 > windowSec) delete st.live[id];
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(sf, JSON.stringify(st));
    if (Math.random() < 0.01) for (const f of fs.readdirSync(dir)) { // tidy state files older than 3 days
      const p = path.join(dir, f);
      if (now - fs.statSync(p).mtimeMs > 3 * 864e5) fs.unlinkSync(p);
    }
  } catch (e) {} finally { try { if (fd !== undefined) fs.closeSync(fd); } catch (e) {} }
  return [...new Set(Object.values(st.live).map((a) => a.name))];
}

// Something broke = the LAST tool result in the transcript is an error (a one-off failed grep earlier does not count).
function lastResultFailed(tp) {
  let fd;
  try {
    fd = fs.openSync(tp, 'r');
    const size = fs.fstatSync(fd).size, len = Math.min(size, 256 * 1024), buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const last = buf.toString('utf8').split('\n').reverse().find((l) => l.includes('"tool_result"'));
    return !!last && /"is_error"\s*:\s*true/.test(last);
  } catch (e) { return false; } finally { try { if (fd !== undefined) fs.closeSync(fd); } catch (e) {} }
}

let raw = '', line = FALLBACK, cfg = null;
try {
  cfg = readConfig();
  try { raw = fs.readFileSync(0, 'utf8'); } catch (e) {}
  let input = null;
  try { input = JSON.parse(raw); } catch (e) {}

  const now = Date.now();
  const th = cfg.thresholds;
  let state = 'calm', age = Infinity, tp = null;
  if (input && input.transcript_path) {
    try { age = (now - fs.statSync(input.transcript_path).mtimeMs) / 1000; tp = input.transcript_path; } catch (e) {}
  }
  const team = tp ? activeAgents(tp, input.session_id, th.agentWindowSec) : [];

  if (team.length) state = 'agents';
  else if (tp && age < th.errorWindowSec && lastResultFailed(tp)) state = 'error';
  else if (tp && age < th.workingSec) state = 'working';
  else if (tp && age > th.sleepSec) state = 'sleeping';

  const frame = new Date(now).getSeconds() % 2;
  const cr = cfg.creatures[cfg.creature] || cfg.creatures[DEF];
  const ov = cr.messages && cr.messages[cfg.lang];
  const key = state === 'agents' ? (team.length === 1 ? 'agents1' : 'agentsN') : state;
  const msg = ((ov && ov[key]) || cfg.messages[cfg.lang][key]).replace('{n}', team.length);
  const color = (c, s) => (cfg.color ? `\x1b[${c}m${s}\x1b[0m` : s);

  // one line that always fits: show fewer agents (as +n) before cutting anything
  const cols = Number.parseInt(process.env.COLUMNS || '', 10);
  const max = cols > 20 ? cols - 4 : cfg.maxWidth || 100;
  const build = (k) => {
    let s = color({ calm: 36, working: 33, agents: 35, error: 31, sleeping: 90 }[state], `${cr[state][frame]} ${msg}`);
    if (k > 0) s += '  ' + color(35, team.slice(0, k).map((n, i) => `${cr.working[(frame + i) % 2]} ${n}`).join('  '));
    if (team.length > k) s += color(35, `  +${team.length - k}`);
    return s;
  };
  let k = Math.min(team.length, cfg.maxAgents || 4);
  line = build(k);
  while (k > 0 && width(line) > max) line = build(--k);
  if (width(line) > max) { line = plain(line); while (width(line) > max - 1) line = cut(line, [...line].length - 1); line += '…'; }
} catch (e) {
  line = FALLBACK;
}

function out(s) { process.stdout.write(s, () => process.exit(0)); }

// chained with another statusLine (e.g. claude-hud): the pet goes in as ONE line right below the model line.
// If that statusLine is slow or hangs, the pet shows alone after chainTimeoutMs instead of freezing.
const chain = cfg && cfg.chain;
if (!chain) out(line);
else {
  let done = false, o = '';
  const finish = (s) => { if (!done) { done = true; out(s); } };
  const timer = setTimeout(() => finish(line), (cfg && cfg.chainTimeoutMs) || 4000);
  try {
    const ch = spawn(chain, { shell: true, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    ch.stdout.on('data', (d) => { o += d; });
    ch.on('error', () => finish(line));
    ch.on('close', (code) => {
      clearTimeout(timer);
      o = o.replace(/[\r\n]+$/, '');
      if (code !== 0 || !o) return finish(line);
      const ls = o.split(/\r?\n/);
      const i = ls.findIndex((x) => /opus|sonnet|haiku|fable|claude/i.test(plain(x)));
      ls.splice(i < 0 ? 1 : i + 1, 0, line);
      finish(ls.join('\n'));
    });
    ch.stdin.on('error', () => {});
    ch.stdin.end(raw);
  } catch (e) { finish(line); }
}
