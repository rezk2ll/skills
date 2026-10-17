<script lang="ts">
	import { resolve } from '$app/paths';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import CodeBlock from '$lib/components/site/code-block.svelte';
	import ItemCard from '$lib/components/site/item-card.svelte';
	import Seo from '$lib/components/site/seo.svelte';
	import {
		AUTHOR,
		KINDS,
		REPO,
		REPO_URL,
		SITE_DESCRIPTION,
		SITE_URL,
		installCommands,
		type Kind
	} from '$lib/site';

	let { data } = $props();

	let query = $state('');
	let tab = $state<'all' | Kind>('all');

	const kinds = Object.keys(KINDS) as Kind[];
	const count = (k: Kind) => data.summaries.filter((i) => i.kind === k).length;

	const results = $derived.by(() => {
		const words = query.toLowerCase().split(/\s+/).filter(Boolean);
		return data.summaries.filter((i) => {
			if (tab !== 'all' && i.kind !== tab) return false;
			const hay = `${i.slug} ${i.description} ${i.keywords.join(' ')}`.toLowerCase();
			return words.every((w) => hay.includes(w));
		});
	});
</script>

<Seo
	title="Claude Code skills, guardrails and mods · Khaled Ferjani"
	description={SITE_DESCRIPTION}
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: 'Claude Code skills, guardrails and mods',
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: data.summaries.map((i, n) => ({
				'@type': 'ListItem',
				position: n + 1,
				url: `${SITE_URL}/${i.slug}`,
				name: i.slug
			}))
		}
	}}
/>

<section class="grid gap-10 pb-12 lg:grid-cols-[1fr_26rem] lg:items-end">
	<div class="space-y-5">
		<p class="font-mono text-xs tracking-wide text-muted-foreground uppercase">
			{count('skill')} skills · {count('hook')} guardrails · {count('mod')} mods
		</p>
		<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
			Claude Code skills and guardrails I use every day
		</h1>
		<p class="max-w-xl text-lg text-pretty text-muted-foreground">
			Skills for pull requests, reviews, releases and design docs. Hooks that stop an agent before
			it merges, leaks a secret or ships an untested change. All installable as Claude Code plugins.
		</p>
		<div class="flex flex-wrap gap-2">
			<Button href="#catalog">Browse the catalog</Button>
			<Button variant="outline" href={resolve('/workflow')}>
				How I work <ArrowRightIcon />
			</Button>
		</div>
	</div>
	<div class="space-y-2">
		<CodeBlock label="Install any item in one line" lines={installCommands('pr')} />
		<CodeBlock
			label="Or add the marketplace and browse everything in /plugin"
			lines={[`/plugin marketplace add ${REPO}`]}
		/>
		<p class="text-xs text-muted-foreground">
			Run these inside Claude Code 2.1.275 or later. Skills also work without plugins: copy a folder
			from <a class="underline" href={REPO_URL}>the repository</a> into
			<code class="font-mono">~/.claude/skills</code>.
		</p>
	</div>
</section>

<section id="catalog" class="scroll-mt-20 space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<Tabs.Root bind:value={tab}>
			<Tabs.List>
				<Tabs.Trigger value="all">All</Tabs.Trigger>
				{#each kinds as k (k)}
					<Tabs.Trigger value={k}>{KINDS[k].plural}</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
		<div class="relative sm:w-72">
			<SearchIcon class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Filter by name or topic"
				aria-label="Filter the catalog"
				class="pl-8"
				bind:value={query}
			/>
		</div>
	</div>

	{#if tab !== 'all'}
		<p class="text-sm text-muted-foreground">{KINDS[tab].blurb}</p>
	{/if}

	{#if results.length}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each results as item (item.slug)}
				<ItemCard {item} />
			{/each}
		</div>
	{:else}
		<p class="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
			Nothing matches "{query}".
		</p>
	{/if}
</section>
