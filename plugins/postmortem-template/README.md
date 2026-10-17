## What it does

The skill writes incident postmortems that anchor every timestamp and claim to evidence: cluster events, commits, chat messages, alerts. It keeps the trigger apart from the root cause, uses the time a mitigation actually protected users rather than when it was attempted, and lists what is still unknown as open questions.

## When to use it

- Writing up an outage, a degradation or a near miss.
- Reviewing or restructuring an incident write-up someone else drafted.

## How it works

- Runs a fact checklist before writing: incident start, detection, acknowledge, mitigation milestones, end of impact, every affected service, responders.
- Builds a key-durations table with cumulative time and the gap from the previous step. The largest gap is called out as a finding.
- Gives action items a named owner or `TBD`, never "we".
- Lists common mistakes to avoid, like narrowing scope to one node when all of them restarted.
