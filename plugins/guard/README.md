## What it does

Denies actions that should wait for your explicit go: merging or closing PRs and issues, posting GitLab notes, reading secret files, printing Kubernetes secrets and tearing down Docker containers. It also stops two habits that hide mistakes: rewriting git tracked files through the shell, and committing behind a check whose exit code a pipe swallowed.

## When to use it

- You run Claude with broad permissions and want a short list of actions that always come back to you.
- You keep `.env`, `*.pem` or `secrets.yaml` files in your projects and do not want their values in a transcript.
- You test against local containers and do not want them torn down under you.
- You want to see every file change as a diff, not as a `sed -i`.

## How it works

- `Bash`: each rule matches the command. Text inside heredocs and quoted `--body` or `-m` values is ignored, so a PR body that mentions `docker compose down` passes.
- `Read`: denies reading `.env`, `.env.*` (except `.example`, `.sample`, `.template`, `.dist`), `*secret*.yaml`, `*.pem` and `id_rsa` or `id_ed25519` files.
- GitHub MCP tools: merging a PR or closing an issue or PR asks you first.
- Every denial says which token to append if you really want the action.

## Overrides

Append the token to the command, only after you said yes:

- `# merge-go`: `gh pr merge|close`, `gh issue close`, `glab mr merge|close`, `glab issue close`.
- `# gh-go`: `glab mr|issue note` and `glab api` POST, PUT or DELETE on notes.
- `# teardown-go`: `docker` or `docker compose` `down`, `stop`, `kill`, `rm`, `prune`.
- `# secret-go`: printing a secret file (`cat`, `grep`, `jq` and similar), `kubectl get secret -o yaml|json`, `kubectl exec` running `env` or `printenv`.
- `# shell-edit`: `sed -i`, `perl -i`, `>`, `>>`, `tee` or `cp` onto a git tracked file, and scripts that write one.
- `# pipe-commit`: `git commit` or `git push` chained after a test, lint or build piped through `grep`, `tail` or `head`.

Secret reads through the `Read` tool have no override. Ask for the one value you need.

## Requirements

- `python3` and `git`.
