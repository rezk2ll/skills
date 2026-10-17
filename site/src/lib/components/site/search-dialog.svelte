<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Command from '$lib/components/ui/command';
	import { KINDS, type Kind, type ItemSummary } from '$lib/site';

	let { open = $bindable(false), items }: { open?: boolean; items: ItemSummary[] } = $props();

	const kinds = Object.keys(KINDS) as Kind[];

	function go(slug: string) {
		open = false;
		goto(resolve('/[slug]', { slug }));
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			open = !open;
		}
	}}
/>

<Command.Dialog bind:open title="Search" description="Find a skill, guardrail or mod">
	<Command.Input placeholder="Search skills, guardrails, mods..." />
	<Command.List>
		<Command.Empty>Nothing matches.</Command.Empty>
		{#each kinds as kind (kind)}
			{@const list = items.filter((i) => i.kind === kind)}
			{#if list.length}
				<Command.Group heading={KINDS[kind].plural}>
					{#each list as item (item.slug)}
						<Command.Item
							value={item.slug}
							keywords={[item.description, ...item.keywords]}
							onSelect={() => go(item.slug)}
						>
							<span class="font-mono">{item.slug}</span>
							<span class="ml-2 truncate text-xs text-muted-foreground">{item.description}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			{/if}
		{/each}
	</Command.List>
</Command.Dialog>
