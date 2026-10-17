<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { KINDS, type ItemSummary } from '$lib/site';

	let { item }: { item: ItemSummary } = $props();
</script>

<a
	href={resolve('/[slug]', { slug: item.slug })}
	class="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
>
	<div class="flex items-center justify-between gap-2">
		<h3 class="font-mono text-sm font-medium">{item.slug}</h3>
		<Badge variant="secondary" class="shrink-0">{KINDS[item.kind].label}</Badge>
	</div>
	<p class="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
	<div class="mt-auto flex flex-wrap gap-1.5 pt-1">
		{#each item.keywords.slice(0, 4) as k (k)}
			<span class="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{k}</span>
		{/each}
	</div>
</a>
