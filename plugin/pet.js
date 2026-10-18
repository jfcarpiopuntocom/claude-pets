#!/usr/bin/env node
// pet.js - a one-line ASCII kitty for the Claude Code statusLine. No dependencies.
// by J.F.Carpio -jfcarpio.com- for Avatiun Consultores.
// Diseño: SIEMPRE ocupa una sola línea. Si hay agentes trabajando, cada uno sale con su nombre real y su
// propio gatito, uno al lado del otro en esa misma línea. Nunca lanza excepción.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const FALLBACK = '=^.^=';
const sinAnsi = (s) => s.replace(/\x1b\[[0-9;]*m|\x1b\]8;;[^\x1b]*\x1b\\/g, '');

function configDir() {
  const env = (process.env.CLAUDE_CONFIG_DIR || '').trim();
  return env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.claude');
}

// valores por defecto del plugin + overrides del usuario (sobreviven a las actualizaciones)
function leerConfig() {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'pet.config.json'), 'utf8').replace(/^﻿/, ''));
  for (const f of [path.join(configDir(), 'plugins', 'claude-pets', 'config.json'), process.env.PETS_CONFIG].filter(Boolean)) {
    try { Object.assign(base, JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''))); } catch (e) {}
  }
  return base;
}

// Agentes del equipo: llamadas a la herramienta Agent/Task en el final del transcript, con su nombre real
// (name > subagent_type > description). Un agente deja de contar cuando llega su <task-notification> con su
// tool-use-id, cuando vuelve su resultado (agentes en primer plano) o cuando pasa la ventana activa.
function agentesActivos(tp, ventanaSeg) {
  const vivos = new Map(); // tool_use_id -> { nombre, t }
  let fd;
  try {
    fd = fs.openSync(tp, 'r');
    const size = fs.fstatSync(fd).size, len = Math.min(size, 512 * 1024), buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const ahora = Date.now();
    for (const linea of buf.toString('utf8').split('\n')) {
      if (linea.includes('"tool_use"') && /"name":"(Agent|Task)"/.test(linea)) {
        try {
          const j = JSON.parse(linea);
          for (const c of (j.message && j.message.content) || []) {
            if (c.type !== 'tool_use' || !/^(Agent|Task)$/.test(c.name)) continue;
            const inp = c.input || {};
            vivos.set(c.id, { nombre: String(inp.name || inp.subagent_type || inp.description || 'agente').slice(0, 18), t: Date.parse(j.timestamp || '') || ahora });
          }
        } catch (e) {}
        continue;
      }
      for (const id of vivos.keys()) {
        if (!linea.includes(id)) continue;
        if (/<status>(completed|failed|killed)</.test(linea)) vivos.delete(id);
        // shortcut: un resultado que no habla de lanzamiento en segundo plano se toma como fin; revisar si cambia el texto de Claude Code
        else if (linea.includes('"tool_result"') && !/async|background|segundo plano|launched|running/i.test(linea)) vivos.delete(id);
      }
    }
    for (const [id, a] of vivos) if ((ahora - a.t) / 1000 > ventanaSeg) vivos.delete(id);
  } catch (e) {} finally { try { if (fd !== undefined) fs.closeSync(fd); } catch (e) {} }
  return [...new Set([...vivos.values()].map((a) => a.nombre))];
}

try {
  const cfg = leerConfig();
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
  const equipo = tp ? agentesActivos(tp, th.agentWindowSec || 1800) : [];

  if (err) state = 'error';
  else if (equipo.length) state = 'agents';
  else if (tp && age < th.workingSec) state = 'working';
  else if (tp && age > th.sleepSec) state = 'sleeping';

  const cuadro = new Date(now).getSeconds() % 2;
  const cr = cfg.creatures[cfg.creature] || cfg.creatures.gato;
  const ov = cr.messages && cr.messages[cfg.lang];
  const key = state === 'agents' ? (equipo.length === 1 ? 'agents1' : 'agentsN') : state;
  let msg = ((ov && ov[key]) || cfg.messages[cfg.lang][key]).replace('{n}', equipo.length);

  let line = `${cr[state][cuadro]} ${msg}`;
  if (cfg.color) line = `\x1b[${{ calm: 36, working: 33, agents: 35, error: 31, sleeping: 90 }[state]}m${line}\x1b[0m`;

  // cada agente real con su gatito, en la MISMA línea (máximo cfg.maxAgentes; el resto como +n)
  if (equipo.length) {
    const max = cfg.maxAgentes || 4;
    const caras = (cfg.creatures.gato || cr).working;
    const gatos = equipo.slice(0, max).map((n, i) => `${caras[(cuadro + i) % 2]} ${n}`).join('  ');
    const extra = equipo.length > max ? `  +${equipo.length - max}` : '';
    line += cfg.color ? `  \x1b[35m${gatos}${extra}\x1b[0m` : `  ${gatos}${extra}`;
  }

  const fi = cfg.firma;
  if (fi && fi.enabled && fi.url) {
    const link = `\x1b]8;;${fi.url}\x1b\\${fi.glifo || '@'}\x1b]8;;\x1b\\`;
    line += cfg.color ? `  \x1b[38;5;214m${link}\x1b[0m` : `  ${link}`;
  }

  // una sola línea, recortada al ancho de la terminal si hace falta
  const ancho = Number.parseInt(process.env.COLUMNS || '', 10);
  if (ancho > 20 && sinAnsi(line).length > ancho - 4) {
    const plano = sinAnsi(line);
    line = plano.slice(0, ancho - 5) + '…';
  }

  // combinado con otra statusline (p. ej. claude-hud): la mascota entra como UNA línea justo debajo de la del modelo
  if (cfg.encadenar) {
    try {
      const r = spawnSync(cfg.encadenar, { input: raw, shell: true, timeout: 1500, encoding: 'utf8', windowsHide: true });
      const o = (r.stdout || '').replace(/[\r\n]+$/, '');
      if (r.status === 0 && !r.error && o) {
        const ls = o.split(/\r?\n/);
        const i = ls.findIndex((l) => /opus|sonnet|haiku|fable|claude/i.test(sinAnsi(l)));
        ls.splice(i < 0 ? 1 : i + 1, 0, line);
        line = ls.join('\n');
      }
    } catch (e) {}
  }
  process.stdout.write(line);
} catch (e) {
  process.stdout.write(FALLBACK);
}
