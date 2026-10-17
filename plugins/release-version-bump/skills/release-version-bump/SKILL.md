---
name: release-version-bump
description: Use when the user asks to release, ship, cut, tag, or bump a version of a project in a monorepo. The "go to the release branch, pull, bump, push, tag, push tag" flow.
---

# Release Version Bump

## Overview

Cut a new release for a single project in a monorepo: sync the release branch, then create and push a git tag using the project-specific format defined by CI. The version bump may already be done, so **check before bumping**. If `package.json`'s current version has no tag on the remote, someone bumped it manually and only the tag is missing. Bumping again would skip a version.

## Configuration

- `RELEASE_BRANCH`: the branch releases are cut from. Default `main`. Below, `<branch>` means this value.
- `RELEASE_MAINTENANCE_BRANCHES`: optional glob of maintenance branches that production runs from (for example `release/*`). Unset means production ships from `<branch>`.

Read them with `echo "${RELEASE_BRANCH:-main}" "${RELEASE_MAINTENANCE_BRANCHES:-}"` before starting.

## When to Use

- "Bump version and tag", "release X", "cut a patch for X", "ship X"
- After merging a fix or feature PR that should trigger the publish workflow
- Monorepos where each project has its own tag prefix (e.g. `api-v1.2.3`)

## Workflow

1. **Sync the release branch.** `git checkout <branch> && git pull`
2. **Find the tag format.** Grep the project's release workflow for the `tags:` trigger. Never guess.
   ```bash
   grep -A1 "tags:" .github/workflows/<project>-release.yml
   ```
   Typical pattern: `<project>-v[0-9]+.[0-9]+.[0-9]+*` gives the tag `<project>-v1.2.3`.
3. **Decide: bump, or just tag?** Read the current version and check whether its tag already exists on the remote.
   ```bash
   CURRENT=$(node -p "require('./package.json').version")   # from the project dir
   git ls-remote --tags origin "<project>-v$CURRENT"
   ```
   - **Tag exists** (non-empty output): the current version is already released. **Bump** (step 4a), then tag the new version.
   - **Tag missing** (empty output): the bump was done manually but never tagged. **Skip the bump.** Go straight to tagging `<project>-v$CURRENT` (step 4b). Bumping here would double-bump and skip a version.

   Sanity check when the tag is missing: confirm the manual bump is actually committed (`git status` clean, `git log -1` shows the bump). If `package.json` has an uncommitted bump, commit it first, then tag.
4a. **Bump, commit, push, tag, push tag** in one chain:
   ```bash
   npm version patch --no-git-tag-version \
     && git add package.json package-lock.json \
     && git commit -m "chore(<project>): bump version to <new>" \
     && git push origin <branch> \
     && git tag <project>-v<new> \
     && git push origin <project>-v<new>
   ```
   Use `minor`/`major` only if the user specifies. `--no-git-tag-version` is required so you tag manually with the monorepo prefix.
4b. **Tag only** (version already bumped manually). No `npm version`, no new commit:
   ```bash
   git tag <project>-v$CURRENT \
     && git push origin <project>-v$CURRENT
   ```

## Quick Reference

- Sync: `git checkout <branch> && git pull`
- Tag format: `grep -A1 "tags:" .github/workflows/<project>-release.yml`
- Current version: `node -p "require('./package.json').version"` (in project dir)
- Tag exists?: `git ls-remote --tags origin "<project>-v$CURRENT"`
- Bump (if tag exists): `npm version patch --no-git-tag-version` (in project dir)
- Ship (bumped): `git add … && git commit … && git push && git tag … && git push origin <tag>`
- Tag only (already bumped): `git tag <project>-v$CURRENT && git push origin <project>-v$CURRENT`

## Gotchas

- **Production fixes on a maintenance line do not use this flow.** If `RELEASE_MAINTENANCE_BRANCHES` is set, or the repo has branches like `release/*` that production runs from, a fix for production goes to that branch and is tagged there. A tag cut from `<branch>` ships unreleased features. Stop and ask which line the release targets.
- **Check the tag before bumping.** If `package.json`'s current version has no tag on the remote, the bump was already done manually. Only tag it, don't bump again. Re-bumping skips a version and ships the wrong number.
- **Pushing to `<branch>` directly is allowed only for the version-bump commit.** Feature work always goes through a PR. If CI blocks direct pushes, stop and ask. In the tag-only path there is no new commit to push at all.
- **Always verify the tag format from CI**, not from memory. Prefixes vary per project (`api-v…`, `web-v…`, etc.) and a wrong tag silently fails to trigger the publish workflow.
- **`npm version` without `--no-git-tag-version`** creates an unprefixed `v1.2.3` tag and commits it. That is wrong for monorepos. Always pass the flag.
- **Stage only `package.json` and `package-lock.json`.** Don't `git add -A`. There may be untracked artifacts in the working tree.
- **Bump type defaults to patch.** Only use minor/major when the user says so or the change is clearly breaking.
- **Do not ask for confirmation.** Invoking this skill is the authorization. Run the full chain (bump, commit, push, tag, push tag) without pausing.
