# Changelog

## 1.3.1 (Oct 18, 2026)
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
