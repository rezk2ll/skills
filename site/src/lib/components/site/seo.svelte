<script lang="ts">
	import { SITE_NAME, SITE_URL } from '$lib/site';

	let {
		title,
		description,
		path = '',
		jsonLd
	}: {
		title: string;
		description: string;
		path?: string;
		jsonLd?: Record<string, unknown>;
	} = $props();

	const url = $derived(`${SITE_URL}${path}`);
	const fullTitle = $derived(path ? `${title} · ${SITE_NAME}` : title);
	// Split tag so the Svelte parser does not end this script block early.
	const ld = $derived(
		jsonLd
			? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}<` +
					'/script>'
			: ''
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content="{SITE_URL}/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html ld}
</svelte:head>
