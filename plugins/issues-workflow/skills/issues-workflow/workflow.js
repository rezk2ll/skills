export const meta = {
  name: 'issues-workflow',
  description: 'Fix GitHub issues in parallel worktrees, one PR each, optionally merged one at a time on green CI',
  phases: [
    { title: 'Fix', detail: 'one agent per issue in its own worktree: test, fix, checks, review, PR' },
    { title: 'Merge', detail: 'serialized: rebase on main, green CI, squash-merge (only when args.merge)' },
  ],
}

const A = args || {}
if (!A.repo || !Array.isArray(A.issues) || !A.issues.length) {
  throw new Error('args needs {repo: "owner/name", issues: [numbers]}')
}
const REPO = A.repo
const BASE = A.base || 'main'
const CONTEXT = A.context || []
const REVIEW = A.reviewSkills || ['code-review --fix']
const PR_SKILL = A.prSkill || null
const MERGE_SUFFIX = A.mergeSuffix ? ` ${A.mergeSuffix}` : ''
const MODEL = A.model || undefined
const WIP = A.wip || {}
const CHECKS = A.checks || null

const GIT_RULE = `A worktree guard hook may refuse git commands it cannot verify. Run git one simple command per call, from the worktree root: no pipes, no &&, no wrappers around git.`

const PR_SCHEMA = {
  type: 'object',
  properties: {
    issue: { type: 'number' },
    status: { type: 'string', enum: ['pr_opened', 'blocked', 'not_a_bug'] },
    pr: { type: 'number' },
    branch: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['issue', 'status', 'note'],
}

const MERGE_SCHEMA = {
  type: 'object',
  properties: {
    pr: { type: 'number' },
    merged: { type: 'boolean' },
    note: { type: 'string' },
  },
  required: ['pr', 'merged', 'note'],
}

const contextStep = CONTEXT.length
  ? `\n- these project notes, which take precedence over your defaults:\n${CONTEXT.map((c) => `  - ${c}`).join('\n')}`
  : ''

const fixPrompt = (n) => `You own GitHub issue #${n} on ${REPO}. You run in your own git worktree; other agents fix other issues in parallel in theirs.

${GIT_RULE}

Read first:
- \`gh issue view ${n} --repo ${REPO} --comments\`. Any "possible cause" in it is a hypothesis: read the code path end to end.${contextStep}

Then:
1. \`git fetch origin ${BASE}\`, then branch from origin/${BASE}: \`fix/${n}-<short-slug>\`.${WIP[n] ? `
   An earlier interrupted run left work in progress for this issue: \`git apply ${WIP[n]}\`. Treat it as a draft: read it against the issue and the code, keep what holds, fix or drop the rest.` : ''}
2. Reproduce with a failing test, then fix the root cause. If it is not a bug, or the fix needs a product decision, stop and return not_a_bug or blocked with the reason. Do not comment on the issue.
3. Run the project's own checks (lint, typecheck, tests, build) for every part you touched. All must pass.${CHECKS ? ` How to run them on this machine (it overrides your defaults): ${CHECKS}` : ''}
4. Review, in this order, with the Skill tool: ${REVIEW.join(', then ')}. Skip any skill that is not installed. Re-run the checks after any change.
5. Commit following the style of \`git log\`, push, and open the PR ${PR_SKILL ? `with the Skill ${PR_SKILL}` : 'with `gh pr create`'} using \`--repo ${REPO} --head <branch> --base ${BASE}\`. The body says "Closes #${n}". Do not merge.

Return the PR number and branch.`

const mergePrompt = (r) => `Merge PR #${r.pr} (branch ${r.branch}, closes #${r.issue}) on ${REPO}. PRs from the same batch may have merged into ${BASE} just before you.

${GIT_RULE}

1. \`git fetch origin\`, check out ${r.branch}, rebase on origin/${BASE}. Resolve conflicts keeping both sides' intent (for translation or config files, keep both sides' keys). Re-run the checks for the touched parts, then \`git push --force-with-lease\`.
2. Watch CI: \`gh run list --repo ${REPO} --branch ${r.branch}\`, then \`gh run watch <id> --repo ${REPO} --exit-status\`. No sleep loops.
3. If CI fails, read the logs, fix, push, watch again. Stop after 3 honest attempts.
4. On green: \`gh pr merge ${r.pr} --repo ${REPO} --squash --delete-branch${MERGE_SUFFIX}\`.

Return whether it merged.`

let mergeChain = Promise.resolve()

const fix = (n) => agent(fixPrompt(n), { label: `fix #${n}`, phase: 'Fix', isolation: 'worktree', schema: PR_SCHEMA, model: MODEL })

// serial: one fix agent at a time, for machines that cannot take parallel test runs
let fixChain = Promise.resolve()
const fixStage = A.serial
  ? (n) => {
      const run = fixChain.then(() => fix(n))
      fixChain = run.catch(() => null)
      return run
    }
  : fix

const results = await pipeline(
  A.issues,
  fixStage,
  (r) => {
    if (!A.merge || !r || r.status !== 'pr_opened' || !r.pr) return r
    const run = mergeChain.then(() =>
      agent(mergePrompt(r), { label: `merge #${r.pr}`, phase: 'Merge', isolation: 'worktree', schema: MERGE_SCHEMA, model: MODEL }))
    mergeChain = run.catch(() => null)
    return run.then((m) => ({ ...r, merge: m }))
  },
)

return results.map((r, i) => r || { issue: A.issues[i], status: 'agent_failed', note: 'agent returned nothing' })
