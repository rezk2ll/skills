---
name: postmortem-template
description: Use when the user asks to write, structure, or review a postmortem for a production incident, outage, degradation, or near-miss. Produces a postmortem that anchors every timestamp and claim to evidence (cluster events, git history, chat messages, monitoring), separates trigger from root cause, distinguishes attempted vs effective mitigations, and exposes what is not yet known via an Open Questions table.
---

## When to use this skill

Use this skill when the user asks to:

- Write a postmortem (or post-mortem) for an incident, outage, or degradation
- Document what happened during a SEV-1/SEV-2/SEV-3 event
- Review or restructure an existing incident write-up
- Capture lessons from a near-miss

## Postmortem philosophy

A postmortem is not a vindication exercise. It exists so that:

1. Anyone reading it 6 months from now understands what failed, why, and what was done about it.
2. Action items have owners, statuses, and survive past the on-call shift.
3. The things you do not yet know are visible, not hidden.

### Core principles

1. **Anchor every timestamp to evidence.** Cluster events (`kubectl get events`), git commit times, chat message timestamps, monitoring alert fire times. If you cannot point at the source, mark the time as approximate (`~`).
2. **Verify the "obvious" before writing it.** It is very easy to narrow scope to one component or one node when the real event was broader. Before committing to "the X restarted", check the equivalent on all peers.
3. **Separate trigger from root cause.** The trigger is what exposed the problem (e.g., a node restart, a deploy). The root cause is the latent condition that made it possible (e.g., images missing from the registry for an unknown period). Both belong in the document, in different sections.
4. **Distinguish attempted vs effective milestones.** "Maintenance mode toggled" is not the same as "maintenance mode serving users". Use the effective time for SLI math; mention the attempted time in the timeline.
5. **Use local time, not UTC, for the narrative.** Match the timezone the responders actually used. State the offset once in the timeline header.
6. **Do not invent a playbook that did not exist.** If the strategy was figured out on the call, say so. Name the coordinator. Naming who did what is more honest and more useful than a sanitized procedure.
7. **Owners are people or teams, never "we".** "We will improve monitoring" is not an action item. Use `TBD` for unassigned, `Done` for completed, and a real name or team otherwise.
8. **Surface what you do not know.** If the cause of a contributing event is still under investigation, put it in the Open Questions table. Better to have a visible gap than a confident guess.

## Facts to gather before writing

Run this checklist first. Most failures of postmortem quality come from writing before this list is complete.

- [ ] **Incident start (`t0`)**: the earliest moment user impact could have started. Often a trigger event (deploy, restart, cron). Anchor with a log or event line.
- [ ] **Detection time**: when monitoring first observed the failing condition. Different from when humans saw the notification (note both if they differ).
- [ ] **Acknowledge time**: first human action acknowledging the incident (chat message, page ack).
- [ ] **Mitigation milestones**: each meaningful action with its timestamp and source (commit, chat, ticket).
- [ ] **End of user impact**: the moment the user-visible degradation stopped. Maintenance mode lifted, replicas Ready, requests succeeding: pick the most user-visible one.
- [ ] **All affected services and their tenants/namespaces**: do not enumerate only the ones you remember; cross-check by listing failing pods, errored requests, or alerting series.
- [ ] **Per-affected-service evidence of failure mode**: paste the actual error line. "ImagePullBackOff against `docker-registry.example.com`" is useful; "the service was down" is not.
- [ ] **Names of responders and what each did**: ask if unsure. Crediting people surfaces hand-offs that often hide subtle bugs in the response process.
- [ ] **Anything you do not know yet**: each one becomes an Open Question.

## Durations: cumulative and gaps

Every postmortem includes a key-durations table. Compute both columns:

- **Cumulative from `t0`** answers "how long did this incident take".
- **Gap from previous step** answers "where in the response did we lose the most time". This is usually the more actionable view.

The largest gap is almost always the most important finding in the document. Call it out by name in `What did not go well`.

## Postmortem template

Use the structure below. Every section is mandatory unless marked optional. Replace `{placeholders}` with concrete facts. Delete the example italic hints once filled in.

```markdown
# Postmortem {DD/MM/YYYY}: {short, neutral title describing the failure}

- Date: {YYYY-MM-DD}
- Status: {Resolved | Investigating | Mitigated, awaiting root cause}
- Author: {name}
- Severity: {SEV-1 / critical | SEV-2 / major | SEV-3 / minor}
- Duration of user impact: ~{X}h {Y}min, from {t0 description} at {HH:MM local} until {end description} at {HH:MM local}.

### Key durations

`t0` is {one-line definition of the incident start} at `{HH:MM:SS}` {local tz}. {Optional one-line clarification, e.g. why "effective" maintenance mode differs from "attempted".}

| Metric | From → To | Cumulative from t0 | Gap from previous step |
| --- | --- | --- | --- |
| Time to observe (detect) | `{HH:MM:SS}` {incident start} → `{HH:MM:SS}` {first monitoring signal} | ~{X} min | ~{X} min (t0 → detect) |
| Time to act (acknowledge) | `{HH:MM:SS}` signal → `{HH:MM:SS}` first human action | ~{X} min | ~{X} min (detect → act) |
| Time to put mitigation in place (effective) | `{HH:MM:SS}` start → `{HH:MM:SS}` mitigation actually serving users | ~{X} min | ~{X} min (act → mitigation) |
| Time to fix the underlying issue | `{HH:MM:SS}` start → `{HH:MM:SS}` last failing component restored | ~{X}h {Y} min | ~{X} min (mitigation → fix) |
| Time until lifting mitigation | `{HH:MM:SS}` start → `{HH:MM:SS}` mitigation removed | ~{X}h {Y} min | ~{X} min (fix → lift) |
| Total incident duration | `{HH:MM:SS}` start → `{HH:MM:SS}` last service restored | ~{X}h {Y} min | ~{X} min (lift → final) |

## Summary

{2-4 sentences. What was the trigger, what was the root cause, what was the user-visible impact, what was the recovery shape. No file lists, no implementation detail.}

## Impact

- `{service-1}`: {what users could not do}.
- `{service-2}`: {...}.
- `{service-3}` ({namespace / tenants}, if multi-tenant): {...}.

## Root cause

{Plain-prose description of the latent condition, separate from the trigger. Include the actual error message verbatim where possible.}

```
{paste the actual log/event line that proves the failure mode}
```

{One paragraph on the latent risk: how long had this been latent, what was masking it, what removed the mask.}

{One paragraph on what is still unknown about the root cause and who owns finding out.}

## Contributing factors

- {Factor 1: a configuration, a missing alert, an architectural choice that made this possible or worse.}
- {Factor 2: ...}
- {Factor 3: ...}

## Timeline (all times {local tz and offset, e.g. CEST, UTC+2})

| Time | Event |
| --- | --- |
| `{HH:MM:SS}` | {Trigger event with source, e.g. "Node X returns Ready after restart (kubectl)".} |
| `{HH:MM:SS}` | {First monitoring signal with source, e.g. "Grafana alert `<name>` delivered".} |
| `{HH:MM:SS}` | {First user report with source, e.g. "@person posted in `<channel>` saying ..."} |
| `{HH:MM:SS}` | {First responder action with source, e.g. commit hash or chat message.} |
| `{HH:MM:SS}` | {Each mitigation step, in order. Include attempted-but-failed steps; mark them.} |
| `{HH:MM:SS}` | {Effective mitigation. Note explicitly when it actually started shielding users.} |
| `{HH:MM:SS}` | {Each repair step.} |
| `{HH:MM:SS}` | {End of user impact.} |
| `{HH:MM:SS}` | {Tail-end items handled in parallel, with who did them.} |

## Detection

{Describe each signal that surfaced the incident. For each signal, say what fired, when, and whether it pointed directly at the root cause or only at a downstream symptom.}

{One short paragraph on detection gaps: what did NOT alert that should have, and what should be added to close the gap.}

## Response

{2-3 sentences on how the response was organized. Was there a prepared runbook, or was it figured out on the call? Who coordinated. Who owned which service.}

The shape that emerged:

- {Step 1, in plain language.}
- {Step 2.}
- {Step n.}

**What worked:**

- {Concrete thing that made recovery faster.}
- {...}

**What did not work:**

- {Concrete friction or wasted time, ideally with a timestamp.}
- {...}

## Action items

{One-line note on ownership convention if relevant.}

| # | Action | Owner | Status |
| --- | --- | --- | --- |
| 1 | {Most important action, usually tied to the root cause.} | {Name or team} | {Open / In progress / Done} |
| 2 | {Detection gap closure.} | TBD | Open |
| 3 | {Resilience / mitigation improvement.} | TBD | Open |
| 4 | {Documentation / runbook from this incident.} | TBD | Open |

## Open questions

| # | Question | Why it matters | Owner |
| --- | --- | --- | --- |
| Q1 | {Open question about root cause.} | {What we cannot rule out / decide without an answer.} | {Owner or TBD} |
| Q2 | {Open question about the trigger.} | {...} | TBD |
| Q3 | {Open question about scope: are other environments / tenants exposed?} | {...} | TBD |

## What went well

- {Specific thing that made the response faster or the impact smaller.}
- {...}

## What did not go well

- {Specific friction, with a timestamp where applicable. Call out the largest gap from the durations table here.}
- {...}
```

## Common mistakes

- **Narrowing scope too early.** "A node restarted" when the data showed all six nodes did. Always cross-check across peers (same pool, same provider, same workload).
- **Treating attempted = effective.** Maintenance mode flipped at `10:32` but actually shielded users at `10:52`. Use the effective time for durations.
- **Citing internal links that rot.** Reference systems by what they are (chat channel, monitoring board) rather than fragile internal URLs.
- **Inventing a playbook.** If recovery was ad-hoc, say so. The honest version is more useful.
- **Owners as collective nouns.** "DevOps will look into it" is not ownership. Either name a team that owns this class of work or mark `TBD` and assign in review.
- **Hiding what you do not know.** If the trigger is unexplained, put it in Open Questions. A postmortem that closes everything is suspicious.
- **Skipping the gap column.** Cumulative time hides where the response actually lost time. The biggest gap is usually the most actionable finding.
