# =^.^= claude-pets

A tiny ASCII kitty that keeps you company in the Claude Code statusLine. She takes **exactly one line**. Always. By design.

```
[Opus 5.5] │ my-project git:(main)
=^o^= on it...  @
Context ░░░░░░░░░░ 12%
```

When your agent team gets to work, every agent gets its own kitten with its **real name or role**, side by side, on that same line:

```
=^.^=/ 3 agents working  =^o^= strategist  =^O^= researcher  =^o^= writer  @
```

| Mood | Kitty |
|---|---|
| purring | `=^.^=` |
| on it | `=^o^=` |
| team at work | `=^.^=/` + one kitten per agent |
| something broke | `=;.;=` |
| napping | `=-.-= z` |

## Install (2 minutes, free, forever*)

Inside Claude Code:

```
/plugin marketplace add jfcarpiopuntocom/claude-pets
/plugin install pets@claude-pets
/pets:setup
```

Restart Claude Code. Say hi.

**Can't type `/`?** From any terminal:

```
claude plugin marketplace add jfcarpiopuntocom/claude-pets
claude plugin install pets@claude-pets
```

Then open Claude Code and ask it: *"run the pets setup command"*.

**Get updates automatically:** `/plugin` → *Marketplaces* → `claude-pets` → *Enable auto-update*. Your statusLine points to a fixed launcher that always runs the newest installed version, so you never set it up twice.

Already have a statusLine (claude-hud, say)? Setup keeps it and slips the kitty in as one line right below the model line.

## Settings (optional)

Create `~/.claude/plugins/claude-pets/config.json` (or inside your `CLAUDE_CONFIG_DIR`). It survives updates:

```json
{ "lang": "es", "creature": "buho", "color": true, "maxAgentes": 4 }
```

Hide the `@` signature: `{ "firma": { "enabled": false } }`.

## Questions nobody asked

**Why does this exist?** It was a side project to learn Claude Code. It got slightly out of hand.

**How much is it?** Nothing. You may evaluate it for 40 days, and after that, too.

**Can she take two lines?** No. She's a cat, not a novel.

**Windows, macOS, Linux?** Yes. She only needs Node, which Claude Code already brought into your life.

**Spanish?** Sí: [mascota](https://github.com/jfcarpiopuntocom/mascota-statusline).

---

\* *"forever" subject to cats continuing to exist.*

by J.F.Carpio — [jfcarpio.com](https://jfcarpio.com) — for Avatiun Consultores · MIT
