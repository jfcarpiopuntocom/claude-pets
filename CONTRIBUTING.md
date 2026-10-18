# Contributing to claude-pets

Thank you! The loveliest way to help is **adding a pet**.

## Add a pet

1. In `plugin/pet.config.json`, inside `creatures`, add a new key (lowercase):

   ```json
   "capybara": {
     "name": "Capybara",
     "calm":     ["(o..o)", "(-..o)"],
     "working":  ["(O..O)", "(o..O)"],
     "agents":   ["(o..o)/", "(o..o)\\"],
     "error":    ["(x..x)", "(;..;)"],
     "sleeping": ["(-..-) z", "(-..-) Z"]
   }
   ```

   Rules: 2 frames per mood, **ASCII only**, 20 characters max. One line, always.
2. `node scripts/gallery.js` to refresh the README gallery.
3. `node plugin/test.js` must print `PASS`.
4. Bump `version` in `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
5. Open a pull request. Bonus points for adding the same pet to [claude-mascotas](https://github.com/jfcarpiopuntocom/claude-mascotas) with its Spanish name.

Not a coder? [Ask for it with this form](https://github.com/jfcarpiopuntocom/claude-pets/issues/new?template=new-pet.yml).

## Golden rule

The pet **takes exactly one line**. Any change that makes it take two does not get in. She's a cat, not a novel.
