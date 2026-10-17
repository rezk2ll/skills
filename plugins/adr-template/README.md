## What it does

The skill writes and reviews architecture decision records that hold up in production. It pushes the ADR toward concrete contracts, failure modes, observability, migration and rollback, and away from padding. Sections are a menu: a short ADR that is all signal beats a long one filled in to match a template.

## When to use it

- Writing an ADR or a technical proposal for a system change.
- Comparing architectural approaches for one decision.
- Reviewing someone's ADR before it merges.

## How it works

- Hard rules first: no invented facts, no line-number citations, no empty sections, no em dashes, one line per paragraph, terse over thorough.
- Reads related ADRs (including open PRs) and how existing systems already work before proposing anything. Unknowns become open questions with an owner.
- Expects Mermaid diagrams for architecture and key flows, bullets over tables, and terms defined once.
- Includes a review checklist and guidance for message brokers, Cassandra tables and protocol extensions.

## Requirements

- Optional: the [humanizer](https://github.com/blader/humanizer) skill. When installed, the draft goes through it before publishing. Without it, that step is skipped.
