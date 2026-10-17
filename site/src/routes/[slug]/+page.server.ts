import { error } from '@sveltejs/kit';
import { items } from '$lib/server/catalog';

export const entries = () => items.map(({ slug }) => ({ slug }));

export const load = ({ params }) => {
	const index = items.findIndex((i) => i.slug === params.slug);
	if (index === -1) error(404, 'Not found');
	const item = items[index];
	const related = items
		.filter((i) => i.slug !== item.slug && i.kind === item.kind)
		.map(({ slug, kind, description, keywords }) => ({ slug, kind, description, keywords }))
		.slice(0, 3);
	return { item, related };
};
