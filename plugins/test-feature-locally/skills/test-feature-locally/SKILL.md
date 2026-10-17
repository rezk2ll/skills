---
name: test-feature-locally
description: Use when verifying a feature works end-to-end before opening a PR. Brings up docker-compose, starts the dev server, drives the touched flow via Playwright MCP, reports regressions inline. Does NOT file GitHub issues.
---

# Test Feature Locally

Verify the change you just made actually works in the running app before opening a PR. Inline reporting only.

## When to use

- Before opening a PR on any change with UI, HTTP, or runtime-dependency behavior
- "test it", "verify it works", "run it and check", "test in browser"
- Reproducing a bug the user described
- Verifying that compose / env / dependency changes don't regress real user flows

Skip for: backend-only changes with full test coverage, pure refactors, broad exploratory QA across the whole app.

## Phase 0: Locate context

1. Workspace root: `git rev-parse --show-toplevel`. If that fails, stop.
2. Active sub-project: cwd if it has its own `package.json`; otherwise ask.
3. Read the sub-project's `package.json` scripts. If neither `dev` nor `start` exists, this skill does not apply.
4. Classify the diff: `git diff --name-only HEAD`.
   - **app-code diff**: any file under `src/`, `routes/`, `app/`, `lib/`, etc.
   - **infra-only diff**: only `docker-compose*.yml`, `Dockerfile*`, `.env*`, `nginx*.conf`, `*.ini`. No source files.
   This decides Phases 3 and 4.

## Phase 1: Determine the app URL

Probe sources in order, stop at the first hit:

1. The user told you the URL in the current request.
2. Compose file at the workspace root or in the sub-project: grep for `VIRTUAL_HOST=`, `ports:`, or any `*_URL` env. Whatever it returns is the truth; do not hardcode mappings.
3. `.env` / `.env.local` / `.env.example` keys named `PUBLIC_APP_URL`, `APP_URL`, `BASE_URL`, `ORIGIN`, `VITE_*_URL`, `NEXT_PUBLIC_*_URL`.
4. The `dev` script's `--port` flag, or framework default (`vite.config.ts` `server.port`, otherwise `5173` Vite/SvelteKit, `3000` Next/Docusaurus).

If still ambiguous, ask.

## Phase 2: Bring up dependencies

If a `docker-up` skill is available in the current repo (`.claude/skills/docker-up`), invoke it.

Otherwise, if a compose file is involved:

```bash
docker compose -f <compose-file> up -d --wait
```

If a different compose is already running and would conflict on host ports (80, 5432, etc.), take it down first. Mention this to the user before you do it.

After `--wait` returns, **smoke-probe each declared host** before continuing. Healthchecks frequently report healthy on container start while the HTTP listener is still binding, or check a side dependency (e.g. `pg_isready` for a portal's database) rather than the portal itself.

For each `VIRTUAL_HOST=foo.example.com` or exposed host port the changed services declare:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://foo.example.com/
```

A 2xx, 3xx, 401, or 403 is fine (service is serving). A 502/503/connection-refused means the container is up but not actually ready; either wait and retry, or dump `docker compose logs --tail=50 <svc>` and stop.

If no compose, skip.

## Phase 3: Start the dev server

The rule depends on the diff classification from Phase 0.

- **app-code diff**: always start `npm run dev`. A running dockerized app is built from a prior snapshot and will not show your local changes; do not let it shadow the dev server.
- **infra-only diff**: if the URL responds (`curl -sf -o /dev/null <url>`), you can use the dockerized app. Otherwise start `npm run dev`.

To start: `npm run dev` (or the detected script) from the sub-project directory using Bash `run_in_background: true`. Capture the shell ID; report it to the user. Poll the URL until it returns; timeout 60s. On failure dump background output and stop.

## Phase 4: Drive the flow

Use Playwright MCP (`mcp__plugin_playwright_playwright__browser_*`). If not available, stop and tell the user to enable it. Do NOT fall back to `curl` for UI verification.

### Required first step: clear cookies

`browser_close` does NOT clear context state. Cookies (especially HttpOnly session cookies) survive across calls, so without clearing you may land mid-flow on a resumed session and test a different path than you think.

```js
// via mcp__plugin_playwright_playwright__browser_run_code_unsafe
async (page) => { await page.context().clearCookies(); }
```

Then `browser_navigate` to the URL and `browser_snapshot` to confirm you're on the entry page (e.g. home), not a resumed inner step.

### Decide what to drive

- **app-code diff**: read `git diff` and exercise ONLY the touched routes / components / endpoints.
- **infra-only diff**: pick a user flow that exercises every dependency boundary the diff changed. For each added/modified service in compose, identify one app endpoint that hits it and make sure your flow triggers that endpoint. Example: a compose change that adds a `search-api` service means your flow must call at least one route that talks to `search-api`, and you must verify the request returns successfully in the network log.

### During the flow

1. After each meaningful action capture `browser_console_messages` (level `error`) and `browser_network_requests` (filter `localhost|/api/`).
2. `browser_take_screenshot` at start, key actions, and end. Save under `.playwright-mcp/test-feature-<branch>/` (relative to the sub-project root). **Playwright MCP rejects absolute paths outside the project root**, so do not write to `/tmp/`.
3. If a login wall appears, read test creds from `.env` (keys like `TEST_USER`, `E2E_USER`, `DEV_USER`, `ADMIN_OTP`); if absent, ask.
4. When clicking a custom radio/checkbox where the visible target is a wrapper around an `sr-only` input, click the wrapper/label, not the input ref. The input is hidden and the wrapper intercepts pointer events.
5. For backend-only sub-projects with no UI: drive endpoints via `browser_network_request` or `curl`. Do not pretend to test via browser when there is nothing to render.

### Cross-check the boundary

Where possible, verify the side effect outside the app to catch silent failures. Examples:
- Created a user? `docker exec <ldap-container> ldapsearch ...` and confirm the entry.
- Wrote to a queue? Check the management UI or `docker exec <rabbitmq> rabbitmqctl list_queues`.
- Wrote to the DB? `docker exec <pg> psql -c 'select ...'`.

This is what separates "the form submitted without error" from "the system actually did the thing".

## Phase 5: Report (inline)

```
## Local test report

**Sub-project**: <name>
**App URL**: <url>
**Mode**: <dockerized | dev-server>
**Diff class**: <app-code | infra-only>
**Flow**: <one sentence>

**Result**: <PASS | PARTIAL | FAIL>

**Boundaries exercised**:
- <changed dependency> → <endpoint hit> → <observed response code, plus side-effect verification if applicable>

**Details**:
- <bullet: what worked / what broke, exact URL + console error if any>

**Screenshots**: .playwright-mcp/test-feature-<branch>/
```

### PASS criteria (strict)

You may only report PASS when ALL of these hold:

1. You walked at least one full user-facing flow end-to-end via Playwright (not curl), starting from a cleared-cookie state.
2. Every dependency the diff changed was exercised by at least one network request in that flow, with a successful response (2xx, or the documented expected status like 401 for an auth-protected endpoint without credentials).
3. No console errors over the flow.
4. Where verifiable, the side effect was confirmed outside the app (LDAP entry exists, row inserted, message enqueued).

Anything short of this is PARTIAL or FAIL. **Healthchecks passing and a base-URL `curl` returning 200 are evidence, not pass criteria.** Put those in `Details`, not in the verdict.

## Rules

- Inline reporting only; never file GitHub issues from this skill.
- Never run destructive teardown (`down -v`, `rm -rf node_modules`). Leave the env as you found it.
- Never kill containers or dev servers you did not start. If you took down another compose to free ports, note it so the user can restore.
- Test the diff, not the whole app.
- If you started a background dev server, tell the user the shell ID.
- Healthchecks and base-URL probes are evidence, not PASS.
- Save screenshots project-relative (`.playwright-mcp/...`). Absolute paths outside the project root are rejected by Playwright MCP.
- Clear cookies before driving (`page.context().clearCookies()`); `browser_close` does not.
