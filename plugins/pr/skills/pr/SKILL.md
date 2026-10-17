---
name: pr
description: Create a branch and open a pull request with a short body that explains why, following strict PR writing rules.
argument-hint: "[branch name hint]"
disable-model-invocation: false
---

Create a pull request for the current changes. Use `$ARGUMENTS` as the branch name hint if provided.

## Steps

1. Run `git diff` and `git status` to understand all changes
2. Create a branch: `feat/...`, `fix/...`, or `chore/...` based on the nature of changes
3. Stage relevant files, commit with a clear message. When the change is large, commit it in slices a reviewer can read one at a time (see Large changes)
4. Push: `git push -u origin <branch>`
5. Draft the body (see PR format), then run it through the `humanizer` skill if it is installed (skip this when it is not). This skill's rules win on any conflict, with one exception: when the user says what the body must contain ("put the content of the ADR", "use this text"), do exactly that. A user instruction about the body overrides every template below, including Context/Solution and the length limits.
6. Open PR: `gh pr create --title "..." --body "..."`

## What goes in the PR (strict)

The PR must contain ONLY the files and commits that implement the change. Before staging and before pushing, check both the working tree AND the branch's commit range (`git log <base>..HEAD`) and exclude anything that is not part of the change:

- NEVER include internal working docs: brainstorming output, design specs, plans, scratch notes. In particular do NOT commit or push anything under `docs/superpowers/**` (or similar spec/plan dirs). These are local artifacts, not deliverables. Stage files explicitly by path; never blanket `git add -A` / `git add .` when such files are present.
- Do not let pre-existing local commits ride along. If the current branch was cut from a local branch that already had unpushed commits unrelated to this change, rebase them off (`git rebase --onto <base> <last-unrelated-commit>`) so the PR shows only this change's commits.
- After pushing, verify the PR contents match expectations: `gh pr view <n> --json files --jq '.files[].path'`. If an unintended file appears, fix the branch and force-push before moving on.

## PR format

The body is written like a human explaining the change to a teammate.

**The default body is one line.** Most PRs are routine and the title plus diff already say why:

- Deployment (image tag, chart version): the version change, plus where it came from only when it is not a plain forward bump.
- Version bump: `Bump version to 1.4.0.`
- Dependency change (bump, lockfile, Dependabot, override): what moved, e.g. `Bump @sveltejs/kit to 2.21.0.`
- Chore, CI, config, refactor, docs, removal: one sentence saying what it does.
- Feature: what it adds, in the present tense. One line, or one short paragraph when the behaviour needs it.

```
Adds the annual billing plans (standard and premium) to the pricing page.
```

Never manufacture a problem to fill a template. Framing a plain change as if it fixed something reads as drama and as AI boilerplate.

**Hard rule: a new feature is never a problem.** A `feat:` PR never gets `## Context` / `## Problem` framing, and never says or implies the absence of the feature was a failure. Banned: "Nothing did X", "X never reached Y", "X was missing", "until now", "previously there was no way", "so users could not".

**Two sections only for a real fix**, when something was actually broken and the reviewer cannot get the why from the title and diff:

```
## Context
<short paragraph: what was wrong or broken, and why it matters. This is the "why".>

## Solution
<short paragraph or a few bullets: what the change does, and why it was done this way.>
```

- `## Context` may instead be titled `## Problem`, and `## Solution` may instead be titled `## Change`. Pick whichever fits the change.
- When the deployer genuinely needs something not obvious from the diff (a rollout step, a required config change), add one plain line at the end, with no heading. Never a `## Worth knowing` section. A detail that turns out to be cosmetic once you look into it does not belong in the body at all.

**Keep it short. Density is the enemy.** A two-section body is two short paragraphs, around 2 to 4 sentences total. Aim for the fewest words that convey the why. Concretely:

- Each section is at most 2 or 3 sentences. If a section runs longer, cut it.
- Do not explain the reasoning chain that led to the fix. State the why once and stop. The reviewer reads the diff for the how.
- At most one short code snippet or command in the whole body, and only when it is the fastest way to say something (e.g. a migration command). Never paste mappings, examples, or before/after lists that the diff already shows.
- Prefer one tight paragraph over several. When in doubt, delete a sentence.

### Large changes

Past 400 lines of reviewable code (lockfiles, generated files and docs do not count), a single commit is too much to review in one sitting. Split the work into commits that each stand alone and compile, ordered so each one makes sense given the ones before it. Mechanical changes go first, in their own commit: moves, renames, formatting, lockfiles. Logic follows on top.

Then add one line to the body, after the sections, telling the reviewer how to read it:

```
Best reviewed commit by commit, in order.
```

Say more than that only when the order is not obvious from the commit subjects, and then only one short sentence naming the entry point. This line is not decoration. A pre-ship hook, if you run one, may block `gh pr create` on a large diff whose body does not carry it, and block any single commit that is itself over the limit.

### npm audit fix PRs

When the PR only patches `npm audit` vulnerabilities (e.g. `chore(<project>): patch npm audit vulnerabilities`), do NOT use the `## Context` / `## Solution` structure. The "why" is self-evident: clearing reported vulnerabilities. Use a short bullet list of the outcome instead:

- Patched N vulnerabilities (by severity)
- Upgraded packages with their new versions
- Allowlisted findings intentionally skipped, with the reason
- Deferred findings (require a major upgrade or have no compatible fix yet)

Include only the bullets that apply. Keep version lists terse and skip any bullet that is empty.

### ADR PRs

When the PR adds or changes an ADR, the body IS the ADR, not a summary of it. Do NOT use `## Context` / `## Solution`, and do not shorten it.

- Copy the ADR file's content, minus its frontmatter.
- Keep every section and every diagram as is (GitHub renders mermaid).
- Rewrite relative links (`./adr-034`, `../overview/glossary#...`) to absolute GitHub URLs, since they break in a PR body.
- After `gh pr create` or `gh pr edit`, diff `gh pr view <n> --json body --jq .body` against the file you posted to confirm the body matches.

Rules:

- Title: short, under 70 characters, lowercase
- Always explain the why, not a file-by-file account of the what
- A new feature is not a fix. Say what it adds, in the present tense
- Simple and human readable. No walls of text, no AI-verbose padding
- No test plan section. CI is the test plan
- No file lists, no checkbox checklists, no implementation-detail bullets
- No internal references such as "based on X" or "mirrors Y", even when accurate
- Never use em dashes, long dashes, or double dashes

## Scope (strict)

The PR body describes ONLY what the current diff changes. Nothing else.

- NEVER pull from memory, CLAUDE.md, or prior conversations, not even for motivation or context
- Do not reference stakeholders, reviewers, or decisions not visible in the diff (no "CTO review", "as discussed elsewhere", "requested by team")
- Do not quote or paraphrase text from other conversations, in any language
- Do not invent motivation. If the "why" is not evident from the code or commit, state the "what" plainly
- When in doubt, keep the bullet literal to the diff
