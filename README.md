# Claude Code skills, guardrails and mods

The skills, hooks and mods I use every day with Claude Code, packaged as plugins you can install one at a time.

Browse them at **[ferjani.dev/skills](https://ferjani.dev/skills)**. Each page explains what the item does, when to use it, and shows its source.

## Install

Inside Claude Code 2.1.275 or later:

```
/plugin install <name> --marketplace rezk2ll/skills
```

Or add the marketplace once and browse everything from `/plugin`:

```
/plugin marketplace add rezk2ll/skills
```

Skills also work without the plugin system. Copy a folder from `plugins/<name>/skills/` into `~/.claude/skills/`.

## What is in here

- `plugins/`: one plugin per item.
  - Skills are instructions Claude loads when a task matches, or that you run as a slash command.
  - Guardrails are shell hooks that can block an action before it runs.
  - Mods are JavaScript function hooks that run inside Claude Code 2.1.287 or later.
- `site/`: the SvelteKit site behind ferjani.dev/skills. It reads `plugins/` at build time, so a plugin's README is its page.
- `scripts/marketplace.mjs`: regenerates `.claude-plugin/marketplace.json` from the plugin manifests. CI fails when the file is stale.

## Adding a plugin

1. Create `plugins/<name>/` with `.claude-plugin/plugin.json`, a `README.md` and the component folders (`skills/`, `hooks/`).
2. Run `node scripts/marketplace.mjs`.
3. Run `claude plugin validate .`.

## License

MIT. `secret-redactor` is a fork of Ray Amjad's redactor and keeps his MIT notice.
