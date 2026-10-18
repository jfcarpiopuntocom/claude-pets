#!/usr/bin/env node
// /pets:remove: puts back the statusLine you had before (or none), and removes the launcher. Your pet choice stays
// in config.json in case you come back.
'use strict';
const fs = require('fs');
const { ours, readJson, writeJson, settingsPath, cfgPath, launcher } = require('./comun.js');

const settings = readJson(settingsPath, {});
const cfg = readJson(cfgPath, {});
const chain = cfg.chain || cfg.encadenar;
if (settings.statusLine && ours(settings.statusLine.command)) {
  if (cfg.previousStatusLine && !ours(cfg.previousStatusLine.command)) settings.statusLine = cfg.previousStatusLine;
  else if (chain && !ours(chain)) settings.statusLine = { type: 'command', command: chain };
  else delete settings.statusLine;
  writeJson(settingsPath, settings);
}
try { fs.unlinkSync(launcher); } catch (e) {}
console.log(settings.statusLine ? `Your previous statusLine is back: ${settings.statusLine.command}` : 'Done, statusLine removed.');
console.log('To uninstall the plugin: /plugin uninstall pets@claude-pets');
