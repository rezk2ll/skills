## What it does

Stops a single `Read` of a large file from filling your context. When Claude reads a big file with no `offset` or `limit`, the read is capped to the first 400 lines and Claude gets a note telling it to find the part it needs and read that range.

## When to use it

- You work in repos with large generated files, lockfiles, long modules or logs.
- You see Claude read whole files when it needed one function.

## How it works

- Applies only to `Read` calls with no `offset` and no `limit`. An explicit range always passes.
- Files at or under the size limit (40 KB by default) pass untouched.
- Images, PDFs, SVGs and notebooks pass untouched.
- A capped read returns the first lines plus a note with the file size and how to read the rest.

## Configuration

Set these with `/config`, or under `pluginConfigs` in your user settings.

- `maxBytes` (default `40000`): files larger than this get capped.
- `capLines` (default `400`): how many lines a capped read returns.

## Requirements

- Claude Code 2.1.287 or later.
