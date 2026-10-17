## What it does

Keeps secrets, email addresses and IP addresses out of the session transcript. Each value goes into an in-memory vault and the transcript gets a stable placeholder such as `[REDACTED-SECRET-xxxxxxxx]` instead. The same value always gets the same placeholder, so Claude can still tell two keys apart. When Claude passes a placeholder to a tool, the real value goes back in, so `Bash` commands and file writes keep working.

## When to use it

- You work in repos with `.env` files, config with credentials, or logs full of customer emails and IPs.
- You paste API responses or stack traces into the prompt and don't want keys in the transcript.
- You want Claude to keep using a credential without ever reading it.

## How it works

- `prompt.submit`: a key you paste is replaced before it reaches the model, with a toast saying how many values were hidden.
- `tool.call`: placeholders in the tool input are swapped back for real values, then the tool result is scrubbed. This is where most secrets arrive: `cat .env`, a `Read` of a config, an API answer.
- `prompt.context`: secrets in the blocks attached to the first message (CLAUDE.md and friends) are hidden. Emails stay, because Claude Code puts your own address there on purpose.
- A secret is a vendor shape (`sk-ant-`, `ghp_`, `AKIA`, `sk_live_`, JWTs, private key blocks, the password in `postgres://user:pass@host`), a long mixed-case token above 3.6 bits of entropy per character, or a shorter token right after a name like `API_KEY=`, `"token":` or `Bearer`.
- Public ids (Stripe `price_`, `prod_`, `pk_live_`, YouTube channel ids), code names (`playerEventBatchV1Schema`), charset constants and bare hex (git SHAs, checksums) are left alone.
- Private, loopback and documentation IP ranges stay visible by default. So do `noreply@` addresses and documentation domains like `@example.com`.
- Nothing is written to disk. The vault dies with the session, so placeholders from an earlier session mean nothing in a new one.
- It does not hide a secret Claude writes itself. Only what Claude reads is scanned.

## Configuration

Set these with `/config`, or under `pluginConfigs` in your user settings.

- `secrets` (default `true`): hide secrets.
- `pii` (default `true`): hide emails and IP addresses.
- `restoreInToolInputs` (default `true`): put the real value back before a tool runs.
- `notify` (default `true`): show a count on the tool row and a toast on a prompt.
- `minEntropy` (default `3.6`): bits per character for the mixed-case test. Raise it to hide less.
- `minLength` (default `24`): shortest token the mixed-case test looks at.
- `contextMinEntropy` (default `3.0`): bits per character when a key name sits in front.
- `redactPrivateIps` (default `false`): hide private and reserved ranges too.
- `allow`: exact strings to leave alone, comma separated.
- `allowEmails`: addresses, or `@yourdomain.com`, to leave alone, comma separated.
- `allowPrefixes`: extra id prefixes to treat as public.
- `denyPrefixes`: prefixes to put back under the entropy test.

## Requirements

- Claude Code 2.1.287 or later.
- Node 22.6 or later, only to run the detector test: `node --experimental-strip-types test/detect.test.mts`.

## Credits

This is a fork of the transcript redactor in [ray-amjad/claude-code-mods](https://github.com/ray-amjad/claude-code-mods) by Ray Amjad, released under the MIT license (see `LICENSE`). The vault, the restore-on-tool-input step and the placeholder format are his. This fork reworks the detection code.
