// Test: una sola línea; un gatito por agente con su nombre real; los terminados desaparecen.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const assert = require('assert');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-pets-'));
const now = new Date().toISOString();
const use = (id, input) => JSON.stringify({ timestamp: now, message: { content: [{ type: 'tool_use', id, name: 'Agent', input }] } });
const tp = path.join(tmp, 't.jsonl');
const run = (cfg = {}) => {
  fs.writeFileSync(path.join(tmp, 'cfg.json'), JSON.stringify({ color: false, ...cfg }));
  return spawnSync(process.execPath, [path.join(__dirname, 'pet.js')], {
    input: JSON.stringify({ transcript_path: tp }), encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp, PETS_CONFIG: path.join(tmp, 'cfg.json'), COLUMNS: '200' } }).stdout;
};
fs.writeFileSync(tp, [
  use('a1', { name: 'estratega', description: 'x' }),
  use('a2', { subagent_type: 'investigador' }),
  use('a3', { name: 'critico' }),
  JSON.stringify({ type: 'queue-operation', content: '<task-notification>\n<tool-use-id>a3</tool-use-id>\n<status>completed</status>' }),
].join('\n') + '\n');
let out = run();
console.log(out);
assert(!out.includes('\n'), 'una sola línea');
assert(/estratega/.test(out) && /investigador/.test(out) && !/critico/.test(out), 'nombres reales, terminado fuera');
assert(/2 agents/.test(out));
fs.writeFileSync(path.join(tmp, 'hud.js'), "process.stdout.write('[Opus 5.5] x\\nContext 0')");
out = run({ encadenar: `"${process.execPath}" "${path.join(tmp, 'hud.js')}"` });
console.log(out);
assert.strictEqual(out.split('\n').length, 3, 'encadenado: exactamente una línea extra');
assert(/^\[Opus/.test(out) && /^Context/.test(out.split('\n')[2]));
fs.writeFileSync(tp, '');
out = run();
console.log(out);
assert(/=\^.\^=|=\^-\^=|=\^o\^=|=\^O\^=/.test(out) && !out.includes('\n'));
console.log('PASS');
