<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { Button } from '$lib/components/ui/button';

	let { lines, label }: { lines: string[]; label?: string } = $props();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(lines.join('\n'));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="group relative rounded-lg border bg-muted/40">
	{#if label}
		<div class="border-b px-4 py-2 text-xs text-muted-foreground">{label}</div>
	{/if}
	<pre class="px-4 py-3 pr-12 font-mono text-[13px] leading-6 break-all whitespace-pre-wrap"><code
			>{#each lines as line, i (i)}<span class="block"
					><span class="text-muted-foreground/60 select-none"
						>{line.startsWith('/') ? '' : '$ '}</span
					>{line}</span
				>{/each}</code
		></pre>
	<Button
		variant="ghost"
		size="icon-sm"
		class="absolute top-2 right-2 text-muted-foreground"
		aria-label="Copy to clipboard"
		onclick={copy}
	>
		{#if copied}<CheckIcon />{:else}<CopyIcon />{/if}
	</Button>
</div>
