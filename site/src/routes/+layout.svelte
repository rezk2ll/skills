<script lang="ts">
	import './layout.css';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { Button } from '$lib/components/ui/button';
	import { Kbd } from '$lib/components/ui/kbd';
	import SearchDialog from '$lib/components/site/search-dialog.svelte';
	import { AUTHOR, REPO_URL } from '$lib/site';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	let searchOpen = $state(false);

	const nav = [
		{ href: resolve('/'), label: 'Catalog' },
		{ href: resolve('/workflow'), label: 'Workflow' },
		{ href: resolve('/recommended'), label: 'Recommended' }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />
<SearchDialog bind:open={searchOpen} items={data.summaries} />

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
		<div class="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
			<a href={resolve('/')} class="font-mono text-sm font-semibold tracking-tight">
				ferjani<span class="text-primary">/</span><span class="text-muted-foreground">skills</span>
			</a>
			<nav class="hidden items-center gap-1 sm:flex">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
						aria-current={page.url.pathname === item.href ? 'page' : undefined}>{item.label}</a
					>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					class="w-9 justify-start gap-2 px-2 text-muted-foreground sm:w-56 sm:px-3"
					onclick={() => (searchOpen = true)}
				>
					<SearchIcon />
					<span class="hidden sm:inline">Search...</span>
					<Kbd class="ml-auto hidden sm:inline-flex">⌘K</Kbd>
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					href={REPO_URL}
					target="_blank"
					rel="noopener"
					aria-label="GitHub repository"
				>
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
						><path
							d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 5 18 5c.7 1.6.3 2.8.2 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
						/></svg
					>
				</Button>
				<Button variant="ghost" size="icon-sm" onclick={toggleMode} aria-label="Toggle dark mode">
					<SunIcon class="scale-100 dark:scale-0" />
					<MoonIcon class="absolute scale-0 dark:scale-100" />
				</Button>
			</div>
		</div>
		<nav class="flex gap-1 overflow-x-auto px-2 pb-2 sm:hidden">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="rounded-md px-3 py-1 text-sm whitespace-nowrap text-muted-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
					aria-current={page.url.pathname === item.href ? 'page' : undefined}>{item.label}</a
				>
			{/each}
		</nav>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
		{@render children()}
	</main>

	<footer class="border-t">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<p>
				Made by <a href={AUTHOR.url} class="text-foreground hover:underline">{AUTHOR.name}</a>. MIT
				licensed.
			</p>
			<p>
				<a href={REPO_URL} class="hover:text-foreground">Source on GitHub</a>
			</p>
		</div>
	</footer>
</div>
