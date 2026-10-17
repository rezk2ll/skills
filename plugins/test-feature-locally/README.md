## What it does

The skill checks that the change you just made works in the running app before you open a PR. It brings up docker compose, starts the dev server, drives the touched flow in a real browser through Playwright MCP, and reports PASS, PARTIAL or FAIL inline. It never files issues.

## When to use it

- Before a PR on any change with UI, HTTP or runtime-dependency behavior.
- "Test it", "verify it works", "check it in the browser".
- Reproducing a bug someone described.
- Compose, env or dependency changes that could break a real user flow.

## How it works

- Classifies the diff as app code or infra only, which decides whether to trust a dockerized app or start `npm run dev`.
- Finds the app URL from your request, compose file, `.env` keys or the dev script, in that order.
- Smoke-probes each declared host after `docker compose up --wait`, because healthchecks often pass before the listener is ready.
- Clears cookies first, exercises only the touched routes, captures console errors, network calls and screenshots under `.playwright-mcp/`.
- Reports PASS only after a full user flow from a clean state hits every changed dependency with no console errors. Healthchecks and a 200 on the base URL are evidence, not a pass.
- Never tears down with `-v` and never stops containers or servers it did not start.

## Requirements

- The Playwright MCP server, installed as the `playwright` plugin so its tools are named `mcp__plugin_playwright_playwright__*`. Without it the skill stops and tells you to enable it.
- `docker` with compose, `curl`, and `npm` for projects that use them.
