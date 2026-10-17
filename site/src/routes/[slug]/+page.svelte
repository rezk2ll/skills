<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FileIcon from '@lucide/svelte/icons/file';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import CodeBlock from '$lib/components/site/code-block.svelte';
	import ItemCard from '$lib/components/site/item-card.svelte';
	import Seo from '$lib/components/site/seo.svelte';
	import { AUTHOR, KINDS, REPO, REPO_URL, SITE_URL, installCommands } from '$lib/site';

	let { data } = $props();
	const item = $derived(data.item);
	const treeUrl = $derived(`${REPO_URL}/tree/main/plugins/${item.slug}`);
	let source = $state(0);
</script>

<Seo
	title={`${item.slug}: ${KINDS[item.kind].label.toLowerCase()} for Claude Code`}
	description={item.description}
	path={`/${item.slug}`}
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'SoftwareSourceCode',
		name: item.slug,
		description: item.description,
		url: `${SITE_URL}/${item.slug}`,
		codeRepository: treeUrl,
		license: 'https://opensource.org/licenses/MIT',
		keywords: item.keywords.join(', '),
		version: item.version,
		runtimePlatform: 'Claude Code',
		author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url }
	}}
/>

<a
	href={resolve('/')}
	class="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
>
	<ArrowLeftIcon class="size-4" /> Catalog
</a>

<div class="grid gap-10 lg:grid-cols-[1fr_20rem]">
	<article class="min-w-0 space-y-8">
		<header class="space-y-3">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="secondary" class={KINDS[item.kind].badge}>{KINDS[item.kind].label}</Badge>
				<span class="font-mono text-xs text-muted-foreground">v{item.version}</span>
			</div>
			<h1 class="font-mono text-3xl font-semibold tracking-tight">{item.slug}</h1>
			<p class="text-lg text-pretty text-muted-foreground">{item.description}</p>
		</header>

		<section class="space-y-3 lg:hidden">
			<h2 class="text-sm font-medium">Install</h2>
			<CodeBlock lines={installCommands(item.slug)} />
		</section>

		<div
			class="prose max-w-none prose-zinc dark:prose-invert prose-headings:tracking-tight prose-h2:text-xl prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html item.html}
		</div>

		{#if item.sources.length}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold tracking-tight">Source</h2>
				<Tabs.Root value={String(source)} onValueChange={(v) => (source = Number(v))}>
					<Tabs.List class="h-auto max-w-full flex-wrap justify-start">
						{#each item.sources as s, i (s.path)}
							<Tabs.Trigger value={String(i)} class="font-mono text-xs">{s.path}</Tabs.Trigger>
						{/each}
					</Tabs.List>
				</Tabs.Root>
				<div class="source max-h-[36rem] overflow-auto rounded-lg border text-[13px]">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html item.sources[source].html}
				</div>
			</section>
		{/if}
	</article>

	<aside class="space-y-6 lg:sticky lg:top-20 lg:self-start">
		<section class="hidden space-y-3 lg:block">
			<h2 class="text-sm font-medium">Install</h2>
			<CodeBlock lines={installCommands(item.slug)} />
			<p class="text-xs text-muted-foreground">Run inside Claude Code 2.1.275 or later.</p>
		</section>

		{#if item.kind === 'skill'}
			<section class="space-y-2">
				<h2 class="text-sm font-medium">Manual install</h2>
				<CodeBlock
					lines={[
						`git clone --depth 1 https://github.com/${REPO} /tmp/skills`,
						...item.skills.map(
							(s) => `cp -r /tmp/skills/plugins/${item.slug}/skills/${s.name} ~/.claude/skills/`
						)
					]}
				/>
			</section>
			<section class="space-y-2">
				<h2 class="text-sm font-medium">Run it</h2>
				<ul class="space-y-1 text-sm">
					{#each item.skills as s (s.name)}
						<li>
							<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
								>{s.invocation}{s.argumentHint ? ` ${s.argumentHint}` : ''}</code
							>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">
					Claude also loads it on its own when your request matches the description.
				</p>
			</section>
		{/if}

		{#if item.hooks.length}
			<section class="space-y-2">
				<h2 class="text-sm font-medium">Runs on</h2>
				<ul class="flex flex-wrap gap-1.5">
					{#each item.hooks as h (h)}
						<li><Badge variant="outline" class="font-mono">{h}</Badge></li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-2">
			<h2 class="text-sm font-medium">Files</h2>
			<ul class="space-y-1 text-sm">
				{#each item.files as f (f)}
					<li>
						<a
							href={`${REPO_URL}/blob/main/plugins/${item.slug}/${f}`}
							class="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
							><FileIcon class="size-3.5 shrink-0" />{f}</a
						>
					</li>
				{/each}
			</ul>
		</section>

		{#if item.keywords.length}
			<div class="flex flex-wrap gap-1.5">
				{#each item.keywords as k (k)}
					<span class="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{k}</span>
				{/each}
			</div>
		{/if}
	</aside>
</div>

{#if data.related.length}
	<Separator class="my-12" />
	<section class="space-y-4">
		<h2 class="text-lg font-semibold tracking-tight">
			More {KINDS[item.kind].plural.toLowerCase()}
		</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.related as r (r.slug)}
				<ItemCard item={r} />
			{/each}
		</div>
	</section>
{/if}
