<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import CodeBlock from '$lib/components/site/code-block.svelte';
	import Seo from '$lib/components/site/seo.svelte';

	let { data } = $props();
	const has = (slug: string) => data.summaries.some((i) => i.slug === slug);

	type Ref = { slug: string; external?: string };
	const stages: { title: string; body: string; refs: Ref[] }[] = [
		{
			title: 'Plan',
			body: 'Anything bigger than a bug fix starts with an interview: the agent asks questions until the plan has no holes. Design decisions go into an ADR before code.',
			refs: [
				{ slug: 'grill-me', external: 'https://github.com/mattpocock/skills' },
				{ slug: 'adr-template' }
			]
		},
		{
			title: 'Build',
			body: 'One red to green slice per commit. Every edited file goes through the project formatter and linter right away, and the agent cannot say it is done while typecheck or related tests fail.',
			refs: [
				{ slug: 'tdd', external: 'https://github.com/mattpocock/skills' },
				{ slug: 'format-on-edit' },
				{ slug: 'stop-check' },
				{ slug: 'smart-typecheck' }
			]
		},
		{
			title: 'Review',
			body: 'Before a pull request, three reviews run in order: bugs, then over-engineering, then comments. A hook refuses to open the PR until all three ran in the session.',
			refs: [
				{ slug: 'code-review', external: 'https://github.com/anthropics/claude-plugins-official' },
				{ slug: 'ponytail', external: 'https://github.com/DietrichGebert/ponytail' },
				{ slug: 'comment-cleanup' },
				{ slug: 'review-chain' }
			]
		},
		{
			title: 'Ship',
			body: 'The PR body says why, in a few lines, with no test plan and no file list. A gate refuses mixed commits, new dependencies without a reason, missing tests and PRs too big to review. A lint holds every PR, issue and commit message to the same writing rules.',
			refs: [{ slug: 'pr' }, { slug: 'pre-ship-gate' }, { slug: 'text-lint' }]
		},
		{
			title: 'Stay safe',
			body: 'Merges, closes, comments posted as me, secret reads and destructive commands all need an explicit go. Secrets, emails and IPs are swapped for placeholders before they reach the transcript.',
			refs: [{ slug: 'guard' }, { slug: 'gh-guard' }, { slug: 'secret-redactor' }]
		},
		{
			title: 'Learn',
			body: 'Every correction goes into a mistakes log. Once a week a skill reads the log and the transcripts, and turns repeat mistakes into a hook or a rule.',
			refs: [{ slug: 'gardener' }]
		}
	];

	const linkFor = (r: Ref) =>
		has(r.slug) ? resolve('/[slug]', { slug: r.slug }) : (r.external ?? null);
</script>

<Seo
	title="How I work with Claude Code"
	description="A Claude Code workflow with guardrails: plan, build, a three-step review chain, a pre-ship gate, safety guards and parallel agents in worktrees."
	path="/workflow"
/>

<div class="mx-auto max-w-3xl space-y-12">
	<header class="space-y-4">
		<h1 class="text-4xl font-semibold tracking-tight">How I work with Claude Code</h1>
		<p class="text-lg text-pretty text-muted-foreground">
			Agents write code fast. The hard part is keeping review quality while they do. These are the
			steps every change goes through, and the hooks that make skipping a step impossible rather
			than discouraged.
		</p>
	</header>

	<ol class="space-y-2">
		{#each stages as stage, i (stage.title)}
			<li class="rounded-xl border bg-card p-5">
				<div class="flex items-baseline gap-3">
					<span
						class="inline-flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-primary/15 font-mono text-xs font-medium text-primary"
						>{i + 1}</span
					>
					<h2 class="text-lg font-semibold tracking-tight">{stage.title}</h2>
				</div>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
				<div class="mt-3 flex flex-wrap gap-1.5">
					{#each stage.refs as r (r.slug)}
						{@const href = linkFor(r)}
						{#if href}
							<a
								{href}
								class="rounded-md border px-2 py-0.5 font-mono text-xs transition-colors hover:border-primary/40 hover:text-primary"
								>{r.slug}{has(r.slug) ? '' : ' ↗'}</a
							>
						{/if}
					{/each}
				</div>
			</li>
			{#if i < stages.length - 1}
				<li aria-hidden="true" class="flex justify-center text-muted-foreground/50">
					<ArrowDownIcon class="size-4" />
				</li>
			{/if}
		{/each}
	</ol>

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold tracking-tight">Parallel agents</h2>
		<p class="text-muted-foreground">
			I usually run several sessions at once, one per repository or per issue. Each one works in its
			own git worktree, so their diffs never mix. A hook stops a session from editing the main
			checkout while another live session is working there.
		</p>
		<p class="text-muted-foreground">
			For a batch of issues, the
			<a class="underline" href={resolve('/[slug]', { slug: 'issues-workflow' })}>issues-workflow</a
			>
			skill starts a background workflow: one agent per issue, each in its own worktree, each running
			the review chain and opening its own PR.
		</p>
	</section>

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold tracking-tight">Workflows mode</h2>
		<p class="text-muted-foreground">
			Dynamic workflows let Claude write a small script that runs many subagents in the background:
			audits, migrations, research that needs several independent checks. Ask for one with the
			keyword <code class="font-mono">ultracode</code> or the words "use a workflow", or turn it on for
			the whole session:
		</p>
		<CodeBlock lines={['/effort ultracode']} />
		<p class="text-muted-foreground">
			It is available on paid plans and through the API. On Pro, enable it in
			<code class="font-mono">/config</code>. Workflows spend a lot of tokens, so I keep them for
			work that is truly parallel. See the
			<a class="underline" href="https://code.claude.com/docs/en/workflows">official docs</a>.
		</p>
	</section>

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold tracking-tight">Writing rules</h2>
		<p class="text-muted-foreground">
			The same rules apply to every PR description, issue and commit message the agent writes:
		</p>
		<ul class="list-disc space-y-1 pl-5 text-muted-foreground">
			<li>Say why the change exists. The diff already shows what changed.</li>
			<li>A new feature is not a fix. No "previously", no "X was missing".</li>
			<li>No test plan section. CI is the test plan.</li>
			<li>No file lists, no checklists, no tables, no em dashes.</li>
			<li>Run a humanizer pass before anything gets published.</li>
		</ul>
		<p class="text-muted-foreground">
			The <a class="underline" href={resolve('/[slug]', { slug: 'pr' })}>pr</a> skill follows them
			and the <a class="underline" href={resolve('/[slug]', { slug: 'text-lint' })}>text-lint</a> hook
			enforces them.
		</p>
	</section>
</div>
