---
description: Pick your pet: by number (1-24), by name, or at random; with nothing it lists them all
argument-hint: "[number | name | random]"
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/pick.js"*)
---
Run exactly this command and show its output to the user as is, in a code block, adding nothing else:

```
node "${CLAUDE_PLUGIN_ROOT}/pick.js" $ARGUMENTS
```
