---
description: Pick your pet (no name lists them all; "random" picks one for you)
argument-hint: "[name | random]"
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/pick.js"*)
---
Run exactly this command and show its output to the user as is, in a code block, adding nothing else:

```
node "${CLAUDE_PLUGIN_ROOT}/pick.js" $ARGUMENTS
```
