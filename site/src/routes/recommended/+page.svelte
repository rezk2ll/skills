<script lang="ts">
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import CodeBlock from '$lib/components/site/code-block.svelte';
	import Seo from '$lib/components/site/seo.svelte';
	import { groups } from '$lib/recommended';
</script>

<Seo
	title="Recommended MCP servers, plugins and mods for Claude Code"
	description="The MCP servers, plugins, skills and mods by other people that I keep installed in Claude Code, and why."
	path="/recommended"
/>

<div class="grid gap-10 lg:grid-cols-[12rem_1fr]">
	<nav class="hidden lg:block">
		<ul class="sticky top-20 space-y-1 text-sm">
			{#each groups as g (g.id)}
				<li>
					<a href="#{g.id}" class="text-muted-foreground hover:text-foreground">{g.title}</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="min-w-0 space-y-14">
		<header class="space-y-4">
			<h1 class="text-4xl font-semibold tracking-tight">Recommended</h1>
			<p class="max-w-2xl text-lg text-pretty text-muted-foreground">
				What else I keep installed in Claude Code. None of it is mine: install it from the authors.
			</p>
		</header>

		{#each groups as g (g.id)}
			<section id={g.id} class="scroll-mt-20 space-y-4">
				<div class="space-y-1">
					<h2 class="text-2xl font-semibold tracking-tight">{g.title}</h2>
					<p class="max-w-2xl text-sm text-muted-foreground">{g.intro}</p>
				</div>
				<div class="grid gap-3 md:grid-cols-2">
					{#each g.picks as p (p.name)}
						<div class="flex flex-col gap-3 rounded-xl border bg-card p-5">
							<a
								href={p.url}
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1.5 font-medium hover:underline"
								>{p.name}<ExternalLinkIcon class="size-3.5 text-muted-foreground" /></a
							>
							<p class="text-sm">{p.description}</p>
							<p class="text-sm text-muted-foreground">{p.why}</p>
							{#if p.install}
								<div class="mt-auto"><CodeBlock lines={p.install} /></div>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
