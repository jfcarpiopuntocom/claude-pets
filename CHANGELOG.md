# Changelog

## 1.3.1 (Oct 18, 2026)
- `setup` keeps the statusLine a standalone mascota-statusline copy was chaining.

## 1.3.0
- `/pets`: with nothing it lists all 24 numbered; `/pets 22` by number, `/pets octopus` by name, `/pets random`.
- Color gallery (same colors as the terminal), numbered.

## 1.2.1
- No `@` on the line. Configurable wait for your previous statusLine (`chainTimeoutMs`, 4 s).

## 1.2.0
- She really moves now: `setup` asks for a redraw every second (`refreshInterval: 1`).
- Remembers your agent team even in very long sessions.
- Only worries when the last tool call failed; while agents work, the team wins.
- Always one line, even when your terminal does not report its width: first fewer agents (`+n`), then a cut.
- A slow previous statusLine no longer freezes the pet.
- `/pets:remove` puts your previous statusLine back. The `settings.json` backup is never overwritten.
- `setup` uses `node` from PATH: works in bash, cmd and PowerShell, and survives Node upgrades.
- New: otaku kitten. Everyone sleeps with Zzz.
- No `@` on the line: authorship lives in the repo.

## 1.1.0
- 24 pets and `/pets:pick` (with `random`). Your agent team comes in the species you pick.

## 1.0.0
- One line, one little pet per agent with its real name, automatic updates.
