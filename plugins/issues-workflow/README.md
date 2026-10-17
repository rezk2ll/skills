## What it does

`issues-workflow` hands a batch of open GitHub issues to a background Workflow. Each issue gets its own agent in its own git worktree, which reproduces the bug with a test, fixes it, runs the checks and review skills, and opens one PR. Your main session only scouts and launches, so its context stays small.

## When to use it

- You want several issues fixed in parallel: "work these issues in workflow mode".
- You want the fixes done without spending main-session tokens.
- You want the PRs merged one at a time on green CI, each rebased on the one before.

## How it works

- Lists the repo's open issues and picks the ones you name. With no list, it takes the bugs and tells you which it left out.
- Asks once whether to merge on green CI or leave the PRs open.
- Launches `workflow.js` with args such as `repo`, `issues`, `merge`, `base`, `reviewSkills`, `prSkill`, `serial` and `checks`. The skill file lists them all.
- An agent that finds the issue is not a bug, or needs a product decision, stops and reports back instead of guessing.
- Merges run serially: rebase, watch CI with `gh run watch`, fix up to three times, then squash-merge.

## Requirements

- Claude Code with the Workflow tool.
- `git` and the GitHub CLI (`gh`), authenticated.
- Optional: the `code-review` plugin from `claude-plugins-official` (`/plugin install code-review@claude-plugins-official`). It is the default review step; agents skip review skills that are not installed.
- Optional: any PR skill passed as `prSkill`, such as the `pr` plugin from this repo.
