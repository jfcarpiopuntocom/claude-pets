// Self-test. Run: node plugin/test.js
// One line only (even with many agents and no COLUMNS); one pet per real agent, remembered in long sessions;
// an old failed tool call does not make it cry; a hung chained statusLine does not freeze it; every pet has every
// mood with 2 ASCII frames; pick saves the choice; setup twice keeps your backup and statusLine; remove puts it back;
// the launcher runs the newest version.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const assert = require('assert');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-pets-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} });
const now = new Date().toISOString();
const use = (id, input) => JSON.stringify({ timestamp: now, message: { content: [{ type: 'tool_use', id, name: 'Agent', input }] } });
const done = (id) => JSON.stringify({ type: 'queue-operation', content: `<task-notification>\n<tool-use-id>${id}</tool-use-id>\n<status>completed</status>` });
const result = (err) => JSON.stringify({ message: { content: [{ type: 'tool_result', tool_use_id: 'x', is_error: err }] } });
const tp = path.join(tmp, 't.jsonl');
const env = { ...process.env, CLAUDE_CONFIG_DIR: tmp, PETS_CONFIG: path.join(tmp, 'cfg.json'), COLUMNS: '200' };
const node = (file, args, e = env) => spawnSync(process.execPath, [path.join(__dirname, file), ...args], { encoding: 'utf8', env: e });
let sid = 0;
const run = (cfg = {}, e = env, session = 's' + sid++) => {
  fs.writeFileSync(path.join(tmp, 'cfg.json'), JSON.stringify({ color: false, ...cfg }));
  return spawnSync(process.execPath, [path.join(__dirname, 'pet.js')], { input: JSON.stringify({ transcript_path: tp, session_id: session }), encoding: 'utf8', env: e }).stdout;
};

// every pet, every mood, 2 ASCII frames
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'pet.config.json'), 'utf8'));
for (const [k, c] of Object.entries(base.creatures)) {
  assert(c.name, k + ': name');
  for (const s of ['calm', 'working', 'agents', 'error', 'sleeping']) {
    assert(Array.isArray(c[s]) && c[s].length === 2, `${k}.${s}: 2 frames`);
    for (const f of c[s]) assert(/^[\x20-\x7e]{1,20}$/.test(f), `${k}.${s}: ASCII, 1-20 chars: ${f}`);
  }
}
assert(Object.keys(base.creatures).length >= 24, 'at least two dozen pets');

// real names, finished agent gone, one line
fs.writeFileSync(tp, [use('a1', { name: 'strategist', description: 'x' }), use('a2', { subagent_type: 'researcher' }), use('a3', { name: 'critic' }), done('a3')].join('\n') + '\n');
let out = run();
console.log(out);
assert(!out.includes('\n'), 'one line');
assert(/strategist/.test(out) && /researcher/.test(out) && !/critic/.test(out), 'real names, finished agent gone');
assert(/ 2 /.test(out), 'agent count');

// long session: the agent is remembered after megabytes of other output
fs.writeFileSync(tp, use('b1', { name: 'marathoner' }) + '\n');
run({}, env, 'long');
fs.appendFileSync(tp, (result(false) + '\n').repeat(12000));
out = run({}, env, 'long');
assert(/marathoner/.test(out), 'agent remembered in a long session: ' + out);

// many agents, no COLUMNS: still one line within the default width, with +n
const e2 = { ...env }; delete e2.COLUMNS;
fs.writeFileSync(tp, Array.from({ length: 8 }, (_, i) => use('c' + i, { name: 'researcher-no-' + i })).join('\n') + '\n');
out = run({ maxAgents: 8 }, e2);
assert(!out.includes('\n') && [...out.replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '')].length <= 100, 'fits 100 columns: ' + out);
assert(/\+\d/.test(out), 'hidden agents shown as +n');

// an old failed tool call followed by a good one is not an error; a fresh failure is
fs.writeFileSync(tp, result(true) + '\n' + result(false) + '\n');
assert(!/=;\.;=|=x\.x=/.test(run()), 'old error ignored');
fs.writeFileSync(tp, result(false) + '\n' + result(true) + '\n');
assert(/=;\.;=|=x\.x=/.test(run()), 'last result failed: worried');

// broken user config never breaks the line; partial overrides keep the rest
fs.writeFileSync(tp, '');
fs.writeFileSync(path.join(tmp, 'cfg.json'), '{ not json');
out = spawnSync(process.execPath, [path.join(__dirname, 'pet.js')], { input: JSON.stringify({ transcript_path: tp }), encoding: 'utf8', env }).stdout;
assert(out.length > 6, 'broken config still renders: ' + out);
out = run({ thresholds: { workingSec: 9999 }, lang: 'xx' });
assert(/ \S/.test(out) && out.length > 6, 'partial config + unknown lang: ' + out);

// chained statusLine: exactly one extra line; a hung one does not freeze the pet
fs.writeFileSync(path.join(tmp, 'hud.js'), "process.stdout.write('[Opus 5.5] x\\nContext 0')");
out = run({ chain: `node "${path.join(tmp, 'hud.js')}"` });
assert.strictEqual(out.split('\n').length, 3, 'chained: exactly one extra line');
assert(/^\[Opus/.test(out) && /^Context/.test(out.split('\n')[2]));
fs.writeFileSync(path.join(tmp, 'hang.js'), 'setTimeout(() => {}, 20000)');
const t0 = Date.now();
out = run({ chain: `node "${path.join(tmp, 'hang.js')}"` });
assert(Date.now() - t0 < 6000 && out.length > 3, 'hung chain does not freeze: ' + (Date.now() - t0) + ' ms');

// every pet renders
for (const k of Object.keys(base.creatures)) {
  fs.writeFileSync(tp, '');
  out = run({ creature: k });
  assert(out.startsWith(base.creatures[k].working[0]) || out.startsWith(base.creatures[k].working[1]), k + ' renders');
}

// pick
const second = Object.keys(base.creatures)[1];
{ const r = node('pick.js', [second]); assert.strictEqual(r.status, 0, r.stdout + r.stderr); }
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'plugins', 'claude-pets', 'config.json'), 'utf8')).creature, second);
assert.notStrictEqual(node('pick.js', ['unicornio-de-pluton']).status, 0);

// pick by number
{ const r = node('pick.js', ['3']); assert.strictEqual(r.status, 0, r.stdout + r.stderr); }
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'plugins', 'claude-pets', 'config.json'), 'utf8')).creature, Object.keys(base.creatures)[2]);
assert.notStrictEqual(node('pick.js', ['99']).status, 0);

// setup twice keeps the original backup and statusLine; remove puts it back
const settingsPath = path.join(tmp, 'settings.json');
fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'dark', statusLine: { type: 'command', command: 'my-hud', padding: 2, refreshInterval: 5 } }));
assert.strictEqual(node('setup.js', []).status, 0);
assert.strictEqual(node('setup.js', []).status, 0);
let s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
assert(/^node "/.test(s.statusLine.command) && s.statusLine.refreshInterval === 1 && s.statusLine.padding === 2 && s.theme === 'dark', JSON.stringify(s));
assert(/my-hud/.test(fs.readFileSync(settingsPath + '.bak-claude-pets', 'utf8')), 'original backup kept');
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'plugins', 'claude-pets', 'config.json'), 'utf8')).chain, 'my-hud');
assert.strictEqual(node('remove.js', []).status, 0);
s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
assert.strictEqual(s.statusLine.command, 'my-hud', 'remove restores your statusLine');
assert(!fs.existsSync(path.join(tmp, 'plugins', 'claude-pets', 'launcher.js')), 'launcher removed');

// launcher runs the newest installed version
for (const v of ['0.9.0', '9.9.9']) {
  const d = path.join(tmp, 'plugins', 'cache', 'claude-pets', 'pets', v);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'pet.js'), `process.stdout.write('v${v}')`);
}
fs.copyFileSync(path.join(__dirname, 'launcher.js'), path.join(tmp, 'launcher.js'));
assert.strictEqual(spawnSync(process.execPath, [path.join(tmp, 'launcher.js')], { input: '{}', encoding: 'utf8', env }).stdout, 'v9.9.9');
console.log('PASS');
