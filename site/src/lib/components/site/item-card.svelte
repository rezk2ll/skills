<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { KINDS, type ItemSummary } from '$lib/site';

	let { item }: { item: ItemSummary } = $props();
</script>

<a
	href={resolve('/[slug]', { slug: item.slug })}
	class="group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
>
	<span class={['absolute inset-x-0 top-0 h-0.5 opacity-70', KINDS[item.kind].accent]}></span>
	<div class="flex items-center justify-between gap-2">
		<h3 class="font-mono text-sm font-medium group-hover:text-primary">{item.slug}</h3>
		<Badge variant="secondary" class={['shrink-0', KINDS[item.kind].badge]}
			>{KINDS[item.kind].label}</Badge
		>
	</div>
	<p class="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
	<div class="mt-auto flex flex-wrap gap-1.5 pt-1">
		{#each item.keywords.slice(0, 4) as k (k)}
			<span class="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{k}</span>
		{/each}
	</div>
</a>
