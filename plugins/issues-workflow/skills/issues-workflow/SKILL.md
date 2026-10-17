---
name: issues-workflow
description: Work a batch of open GitHub issues in parallel through a background Workflow, one agent per issue in its own git worktree, one PR each, optionally merged one at a time on green CI. Use when the user asks to work open issues "in workflow mode", "in parallel", or without spending main-session tokens.
---

The main session only scouts and launches. The agents do the fixing, so the main context stays small.

1. Find the repo with `gh repo view --json nameWithOwner,defaultBranchRef`, then list the issues with `gh issue list --state open --json number,title,labels,assignees`.
2. Pick the issues the user asked for. With no explicit list, take the bugs and name the ones left out (enhancements, deferred).
3. Ask once, unless the user's memory or CLAUDE.md already answers it: should PRs be merged on green CI, or left open for review?
4. Launch `Workflow({scriptPath: "<this skill's directory>/workflow.js", args})`, with the absolute path.
5. Do not poll. When the completion notification arrives, report per issue: PR, merged or not, blockers. A `blocked` or `not_a_bug` result is a question for the user.

## args

- `repo` (required): `owner/name`. Pass it explicitly, since a local `origin` can point at a renamed repo.
- `issues` (required): issue numbers.
- `merge`: `true` to rebase, wait for CI and squash-merge each PR in turn. Default `false`, PRs stay open.
- `base`: target branch, default `main`.
- `context`: files or instructions every fix agent reads first (handoff notes, a CONTRIBUTING file, check quirks).
- `reviewSkills`: skills run in order before the PR, default `["code-review --fix"]`. Agents skip any that are not installed.
- `prSkill`: a skill that opens the PR in the team's format. Default plain `gh pr create`.
- `mergeSuffix`: text appended to the merge command, for a hook that asks for a confirmation marker.
- `model`: model for the agents. Default: the session's model.
- `serial`: `true` runs one fix agent at a time. Use it when parallel test runs overload the machine.
- `checks`: how to run the checks on this machine (worker caps, scoped specs). Overrides the agents' defaults.
- `wip`: `{issue: "/abs/path.patch"}`, an interrupted run's diff the agent applies as a draft.

Example:

```json
{"repo": "acme/api", "issues": [408, 409], "merge": true,
 "context": ["CONTRIBUTING.md"], "reviewSkills": ["code-review --fix", "simplify"]}
```

## Notes

- Each agent runs in a git worktree. Worktree guard hooks often refuse compound git commands (pipes, `&&`, wrappers), so the prompts tell agents to keep git commands simple.
- Merges run one at a time, so each PR rebases on the one merged before it. Translation files are the usual conflict.
- Resume after a crash: `Workflow({scriptPath, resumeFromRunId})` with the same args.
