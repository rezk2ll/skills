## What it does

The skill cuts a release for one project in a monorepo. It syncs your release branch, reads the tag format from the project's CI workflow, bumps the version only when the current one is already tagged, then pushes the commit and the prefixed tag. Invoking it is the go: it runs the whole chain without asking.

## When to use it

- "Release api", "cut a patch for web", "bump and tag".
- Each project in your monorepo has its own tag prefix (`api-v1.2.3`) that triggers its publish workflow.
- Someone bumped `package.json` by hand and forgot the tag.

## How it works

- Greps `.github/workflows/<project>-release.yml` for the `tags:` trigger instead of guessing the prefix.
- Checks `git ls-remote --tags` for the current version. Tagged means bump, untagged means tag only, so a version is never skipped.
- Bumps with `npm version --no-git-tag-version`, stages only `package.json` and `package-lock.json`, and defaults to patch.
- Stops and asks when production runs from a maintenance branch, because a tag cut from the main line would ship unreleased work.

## Configuration

- `RELEASE_BRANCH`: branch releases are cut from. Default `main`.
- `RELEASE_MAINTENANCE_BRANCHES`: optional glob of maintenance branches production runs from, for example `release/*`.

## Requirements

- `git`, `node` and `npm`.
