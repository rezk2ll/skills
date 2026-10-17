import { items } from '$lib/server/catalog';
import { SITE_URL } from '$lib/site';

export const prerender = true;

export const GET = () => {
	const paths = ['/', '/workflow', '/recommended', ...items.map((i) => `/${i.slug}`)];
	const urls = paths.map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`).join('');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
		{ headers: { 'content-type': 'application/xml' } }
	);
};
