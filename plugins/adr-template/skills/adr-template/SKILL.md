---
name: adr-template
description: Use when the user asks to write, review, or structure an ADR (architecture decision record), document an architectural decision, draft a technical proposal for a system change, or compare architectural approaches. Generates ADRs that cover real production concerns: error handling, failure modes, observability, migration path, rollback, and operational impact.
---

## When to use this skill

Use this skill when the user asks to:
- Write an ADR or architecture decision record
- Document an architectural decision
- Review an existing ADR
- Structure a technical proposal for a system change
- Compare architectural approaches for a decision

## ADR Philosophy

ADRs are not academic exercises. They exist so that 6 months from now, someone (including future-you) can understand WHY a decision was made, what alternatives were considered, and what operational impact to expect.

### Core Principles

1. **Address the hard questions upfront**: Error handling, failure modes, migration path, rollback strategy. If the ADR doesn't cover what happens when things go wrong, it's incomplete.
2. **Be concrete, not hand-wavy**: Show actual schemas, actual message formats, actual API shapes. "We'll use events" is not a decision; "We'll publish `user.deleted` events to a `lifecycle` exchange with routing key `user.delete` using a fanout pattern" is.
3. **Acknowledge tradeoffs honestly**: Every decision has a cost. If you can't articulate the downside, you haven't thought hard enough.
4. **Consider operational impact**: Who deploys this? What monitoring do we need? What breaks during rollout? What's the migration path for existing data?
5. **Keep it scannable**: Busy engineers need to understand the decision in 2 minutes and the details in 10.

## Hard rules (no slop)

These override everything below. Violating them is worse than omitting a section.

1. **Never invent facts.** Every technical claim (queue name, consumer name, env var, exchange, schema field, "already runs in production", deployment topology, what is or is not deployed where, sizes and event rates) must be grounded in code, config, or behavior you actually verified. If you did not verify it, do not state it. Mark genuine unknowns as open questions instead of guessing.
2. **No `file.ts:line` citations in the document.** Reference components by name, not by line number. Line numbers are noise to the reader and rot immediately. (You may read the code to ground a claim; just don't paste the coordinates.)
3. **Write only sections that carry real content.** A section with nothing concrete to say is deleted, not filled with hedging. A two-section ADR that is all signal beats a ten-section one padded to hit the template.
4. **No em-dashes, en-dashes, or double-hyphens.** Use commas, parentheses, or periods.
5. **One line per paragraph. Do not hard-wrap prose.** Manual line breaks mid-paragraph survive as broken lines when pasted into Notion, Confluence, or a PR. Let the renderer wrap. (Code blocks, Mermaid, and tables keep their own line structure.)
6. **Scope to the repo.** No client names, no POC or strategic framing, no downstream business context that does not affect the technical decision.
7. **Terse over thorough.** Cut throat-clearing, restated obvious points, and speculative failure modes nobody asked about. If a sentence does not change what the reader does, delete it.

The template below is a menu, not a checklist. Pick the sections the decision actually needs.

## Lessons from review (override the template)

### Before writing
- Read every related ADR first, including open PR versions (they are often newer than the default branch) and their review comments. Check the draft against them and list conflicts explicitly.
- Read how the existing systems already do it before proposing anything. Never invent a contract, message format or API shape. If the contract does not exist yet, write what this repo needs from it as requirements, and ask the rest as open questions.
- One subject per ADR. If a draft covers two decisions (e.g. storage and search API), split it into two ADRs and two PRs that link to each other.
- A platform ADR holds the cross-app decisions; repo ADRs hold what that repo does. Link between them instead of repeating content.

### Context
- Start with the problem: a short numbered list of what is wrong and what it costs (scale, inconsistency between apps, missing capability). No bold inline headers.
- Link claims about external apps or code (other repos) to a fixed commit. Do not link this repo's own code; name components instead. Do not over-link.
- Link every ADR you mention. Ask before referencing a private repo from a public one.
- If a set of ADRs shares a convention (for example, siblings refer to each other in words, not links), follow it, and apply a fix to one ADR to every sibling.

### Decision
- Decision section as bullet points.
- Mermaid diagrams are expected: one architecture diagram (components, exchanges, services) and sequence diagrams for the key flows. Do not drop diagrams when trimming for length.
- Message brokers: say explicitly whether a name is an exchange, a routing key or a queue, and the exchange type (fanout means no routing key, the consumer tells messages apart from the body). Do not name queues owned by other services.
- A guideline ADR (a pattern every app follows) states the pattern. Exchange, queue and routing key names belong to each app's own ADR, and alternatives the guideline rejects stay in Alternatives, out of Context.
- Requirements on another team's API go in a bullet list ("what this service needs from it").
- Config examples follow the repo's existing config conventions (same nesting, full URLs, real-looking hostnames like `search.example.com`).
- Write decisions as decisions. If something is not decided (groups, a trigger, an identifier), move it to Open questions instead of half-deciding it in the text.

### Style
- Bullets over tables. No tables unless asked.
- Short and easy on the eyes. Remove anything that does not change what the reader does: implementation trivia (internal field names, matching details), sections with no real decision, "closest existing API" asides.
- Simple, consistent terms, defined once (e.g. "members" = directory users, "contacts" = created by the user). No synonym cycling.
- Open questions are real questions, one line each, tagged with the owner (`@owner`) when someone else must answer.

### After each change
- Re-read the whole ADR for contradictions (a bullet deciding what an open question asks, a term meaning two things, a failure case that contradicts the flow) and fix them.
- If the [humanizer](https://github.com/blader/humanizer) skill is installed, run it on the draft before publishing. The hard rules above win where it disagrees.
- Match the repo's ADR format: file path and numbering (e.g. `docs/adr/NNN-slug.md`), title style, Status and Date headings.
- When asked, the PR body is exactly the ADR content. Keep one commit per PR (amend and force-with-lease). Do not push until told.

## ADR Template

The sections below are available structure, not a required set. Context and Decision are the core; include the rest only when the decision genuinely needs them (event-driven changes usually want Message Contracts; risky rollouts want Migration and Failure Modes). Drop the rest. Adapt headings and ordering to the target repo's existing ADRs.

```markdown
# ADR-{NUMBER}: {Title}

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date
{YYYY-MM-DD}

## Context

What is the problem or situation that requires a decision? Be specific:
- What system/service is affected?
- What triggered this decision? (feature request, scaling issue, tech debt, incident)
- What constraints exist? (existing tech stack, team expertise, timeline, compatibility)

## Decision

State the decision clearly in 1-2 sentences, then elaborate.

### Architecture

Describe the chosen approach with enough detail that someone could implement it:
- Component diagram (Mermaid preferred)
- Data flow / sequence diagram for key operations
- Schema / message format definitions
- API contracts (if applicable)

### Key Design Choices

For each non-obvious choice, explain:
- What: the specific choice
- Why: the reasoning
- Alternative considered: what you didn't pick and why

## Message / Data Contracts

(For event-driven decisions, always include concrete schemas)

Define the exact shape of messages, events, or data structures:

```json
{
  "type": "user.deleted",
  "source": "admin-api",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "userId": "string",
    "organizationId": "string",
    "reason": "string"
  }
}
```

Include:
- Field types and constraints
- Required vs optional fields
- Versioning strategy (how will this schema evolve?)
- Validation rules

## Consumers / Producers

(For event-driven decisions)

| Component | Role | Exchange | Routing Key | Queue | Durable |
|-----------|------|----------|-------------|-------|---------|
| Admin API | Producer | lifecycle | user.delete | n/a | n/a |
| Stack Service | Consumer | lifecycle | user.delete | stack.lifecycle | Yes |
| Chat Service | Consumer | lifecycle | user.delete | chat.lifecycle | Yes |

For each consumer, specify:
- Acknowledgment strategy (auto-ack vs manual)
- Retry policy (max retries, backoff)
- Dead letter queue configuration
- Idempotency requirements
- Expected processing time

## Error Handling & Failure Modes

When the decision introduces failure paths (it usually does), cover the ones that are real for this change. Skip the prompts that don't apply rather than answering them hypothetically:

1. **What happens if a consumer fails?**: Retry? DLQ? Alert?
2. **Partial failures**: Service A succeeds, Service B fails. What's the system state? How do we recover?
3. **Ordering guarantees**: Do messages need to arrive in order? What happens if they don't?
4. **Duplicate delivery**: How do consumers handle receiving the same event twice?
5. **Timeout/unavailability**: What if a downstream service is down for hours?

## Observability

What monitoring and alerting is needed:
- Metrics to track (publish/consume rates, failure rates, latencies, queue depths)
- Logging requirements (what gets logged at what level)
- Alerting thresholds
- Dashboard requirements (Grafana panels, LogQL queries)
- How to debug a failed operation end-to-end

## Migration & Rollout

- How do we get from current state to target state?
- Can this be deployed incrementally?
- What happens to in-flight data during migration?
- Rollback strategy if something goes wrong
- Feature flag requirements
- Database migration steps (if applicable)

## Alternatives Considered

For each alternative:

### Alternative 1: {Name}
- **Description**: What it is
- **Pros**: What's good about it
- **Cons**: Why we didn't pick it
- **Why rejected**: The decisive reason

### Alternative 2: {Name}
(Same structure)

## Consequences

### Positive
- What we gain from this decision

### Negative
- What we lose or what becomes harder
- New operational burden
- New complexity

### Risks
- What could go wrong
- Mitigation strategies

## References
- Related issues, PRs, documents
- External resources consulted
```

## When Reviewing an ADR

Use this checklist to evaluate:

### Completeness
- [ ] Is the problem clearly stated with specific context?
- [ ] Are concrete schemas/contracts defined (not just "we'll use events")?
- [ ] Are ALL consumers and producers listed with their queue configurations?
- [ ] Is error handling covered? (DLQ, retries, partial failures, idempotency)
- [ ] Is there a migration/rollout plan?
- [ ] Are observability requirements defined?
- [ ] Are at least 2 alternatives considered with honest pros/cons?

### Architecture Quality
- [ ] Does it follow existing patterns in the codebase? (e.g., existing protocol extensions, existing event patterns)
- [ ] Is the message schema consistent with existing events?
- [ ] Are there ordering or consistency issues?
- [ ] Does it introduce unnecessary coupling between services?
- [ ] Could this be simpler without losing functionality?

### Operational Readiness
- [ ] Can this be deployed without downtime?
- [ ] Is the rollback plan realistic?
- [ ] Are the monitoring requirements actionable? (specific metrics, not vague "we'll monitor it")
- [ ] Who is on-call for this? What runbook is needed?

### Common Issues to Flag
1. **Missing error handling strategy**: The #1 ADR gap. Always ask "what happens when X fails?"
2. **Inconsistent message schemas**: Events in the same system should share a base structure
3. **Overloaded fields**: A `source` field that means different things in different contexts
4. **No versioning strategy**: How will the schema evolve without breaking consumers?
5. **Hand-wavy observability**: "We'll add metrics" is not a plan
6. **No consumer implementation details**: Ack mode, prefetch, concurrency must be specified
7. **Header/transport abuse**: Using email headers or HTTP headers for application-level state when a proper data store is warranted

## Stack-Specific Guidance

### RabbitMQ Patterns
- Prefer topic exchanges for flexibility over direct exchanges
- Always specify queue durability and message persistence
- Define DLQ strategy per queue, not globally
- Consider consumer prefetch count: too high starves other consumers, too low underutilizes
- For ownership transfer or multi-step operations, consider saga pattern over multiple independent events

### Cassandra
- Define partition keys carefully: hot partitions kill performance
- Specify consistency levels for reads and writes
- Consider read patterns BEFORE designing the table. Cassandra is query-driven
- Migration strategy for new tables: create table → deploy readers → backfill → deploy writers

### Protocol / API Extensions
- Follow the existing extension patterns in the codebase for new properties
- Define the property name, type, and whether it's readable/writable
- Specify how each client will consume it

## Diagram Conventions

Use Mermaid for all diagrams. Prefer:
- `sequenceDiagram` for request flows and event chains
- `flowchart TD` for component relationships and data flow
- `erDiagram` for data models
- Keep diagrams focused: one concept per diagram, not everything in one giant chart

## Keywords
ADR, architecture decision record, technical proposal, system design, architecture, RFC, design doc, decision record
