<script lang="ts">
	import { AUTHOR, SITE_NAME, SITE_URL } from '$lib/site';

	let {
		title,
		description,
		path = '',
		type = 'website',
		jsonLd
	}: {
		title: string;
		description: string;
		path?: string;
		type?: 'website' | 'article';
		jsonLd?: Record<string, unknown>;
	} = $props();

	const url = $derived(`${SITE_URL}${path || '/'}`);
	const fullTitle = $derived(path ? `${title} · ${AUTHOR.name}` : title);
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
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content="{SITE_URL}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html ld}
</svelte:head>
