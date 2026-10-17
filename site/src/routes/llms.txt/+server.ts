import { items } from '$lib/server/catalog';
import { KINDS, REPO, SITE_DESCRIPTION, SITE_URL, type Kind } from '$lib/site';

export const prerender = true;

export const GET = () => {
	const sections = (Object.keys(KINDS) as Kind[]).map((k) =>
		[
			`## ${KINDS[k].plural}`,
			'',
			...items
				.filter((i) => i.kind === k)
				.map((i) => `- [${i.slug}](${SITE_URL}/${i.slug}): ${i.description}`)
		].join('\n')
	);
	const body = [
		'# Claude Code skills by Khaled Ferjani',
		'',
		`> ${SITE_DESCRIPTION}`,
		'',
		`Install inside Claude Code: \`/plugin install <name> --marketplace ${REPO}\`.`,
		'',
		...sections,
		''
	].join('\n');
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
