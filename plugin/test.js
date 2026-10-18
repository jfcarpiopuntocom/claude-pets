// Self-test: one line only; one pet per real agent; finished agents disappear; chaining adds exactly one line;
// every pet has every state with 2 ASCII frames; pick saves the choice. Run: node plugin/test.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const assert = require('assert');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-pets-'));
const now = new Date().toISOString();
const use = (id, input) => JSON.stringify({ timestamp: now, message: { content: [{ type: 'tool_use', id, name: 'Agent', input }] } });
const tp = path.join(tmp, 't.jsonl');
const env = { ...process.env, CLAUDE_CONFIG_DIR: tmp, PETS_CONFIG: path.join(tmp, 'cfg.json'), COLUMNS: '200' };
const run = (cfg = {}) => {
  fs.writeFileSync(path.join(tmp, 'cfg.json'), JSON.stringify({ color: false, ...cfg }));
  return spawnSync(process.execPath, [path.join(__dirname, 'pet.js')], { input: JSON.stringify({ transcript_path: tp }), encoding: 'utf8', env }).stdout;
};

const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'pet.config.json'), 'utf8'));
for (const [k, c] of Object.entries(base.creatures)) {
  assert(c.name, k + ': name');
  for (const s of ['calm', 'working', 'agents', 'error', 'sleeping']) {
    assert(Array.isArray(c[s]) && c[s].length === 2, `${k}.${s}: 2 frames`);
    for (const f of c[s]) assert(/^[\x20-\x7e]{1,20}$/.test(f), `${k}.${s}: ASCII, 1-20 chars: ${f}`);
  }
}
assert(Object.keys(base.creatures).length >= 24, 'at least two dozen pets');

fs.writeFileSync(tp, [
  use('a1', { name: 'strategist', description: 'x' }),
  use('a2', { subagent_type: 'researcher' }),
  use('a3', { name: 'critic' }),
  JSON.stringify({ type: 'queue-operation', content: '<task-notification>\n<tool-use-id>a3</tool-use-id>\n<status>completed</status>' }),
].join('\n') + '\n');
let out = run();
console.log(out);
assert(!out.includes('\n'), 'one line');
assert(/strategist/.test(out) && /researcher/.test(out) && !/critic/.test(out), 'real names, finished agent gone');
assert(/ 2 /.test(out), 'agent count');

fs.writeFileSync(path.join(tmp, 'hud.js'), "process.stdout.write('[Opus 5.5] x\\nContext 0')");
out = run({ encadenar: `"${process.execPath}" "${path.join(tmp, 'hud.js')}"` });
console.log(out);
assert.strictEqual(out.split('\n').length, 3, 'chained: exactly one extra line');
assert(/^\[Opus/.test(out) && /^Context/.test(out.split('\n')[2]));

for (const k of Object.keys(base.creatures)) {
  fs.writeFileSync(tp, '');
  out = run({ creature: k });
  assert(out.startsWith(base.creatures[k].working[0]) || out.startsWith(base.creatures[k].working[1]), k + ' renders');
}

const p = spawnSync(process.execPath, [path.join(__dirname, 'pick.js'), Object.keys(base.creatures)[1]], { encoding: 'utf8', env });
assert.strictEqual(p.status, 0, p.stdout + p.stderr);
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'plugins', 'claude-pets', 'config.json'), 'utf8')).creature, Object.keys(base.creatures)[1]);
assert.notStrictEqual(spawnSync(process.execPath, [path.join(__dirname, 'pick.js'), 'unicornio-de-plutón'], { encoding: 'utf8', env }).status, 0);
console.log('PASS');
