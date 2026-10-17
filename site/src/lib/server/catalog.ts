import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { Marked } from 'marked';
import { createHighlighter } from 'shiki';
import type { Item, ItemSummary, Kind } from '$lib/site';

const ROOT = join(process.cwd(), '..', 'plugins');

const LANGS: Record<string, string> = {
	'.sh': 'bash',
	'.py': 'python',
	'.json': 'json',
	'.ts': 'typescript',
	'.mts': 'typescript',
	'.js': 'javascript',
	'.mjs': 'javascript',
	'.md': 'markdown',
	'.yaml': 'yaml',
	'.yml': 'yaml'
};

const highlighter = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: [...new Set([...Object.values(LANGS), 'diff', 'text'])]
});

export function highlight(code: string, lang: string) {
	const loaded = highlighter.getLoadedLanguages();
	return highlighter.codeToHtml(code, {
		lang: loaded.includes(lang) ? lang : 'text',
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: false
	});
}

const md = new Marked({
	renderer: {
		code({ text, lang }) {
			return highlight(text, lang ?? 'text');
		}
	}
});

export const renderMarkdown = (src: string) => md.parse(src, { async: false });

function frontmatter(src: string): { data: Record<string, string>; body: string } {
	const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!m) return { data: {}, body: src };
	const data: Record<string, string> = {};
	let key = '';
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^([\w-]+):\s*(.*)$/);
		if (kv) {
			key = kv[1];
			data[key] = kv[2].replace(/^["']|["']$/g, '').replace(/^[>|]-?$/, '');
		} else if (key && /^\s+/.test(line)) {
			data[key] = `${data[key]} ${line.trim()}`.trim();
		}
	}
	return { data, body: src.slice(m[0].length) };
}

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		if (e.name === 'node_modules' || e.name === '.DS_Store') return [];
		const p = join(dir, e.name);
		return e.isDirectory() ? walk(p) : [p];
	});
}

function kindOf(dir: string): Kind {
	if (existsSync(join(dir, 'skills'))) return 'skill';
	const hooks = join(dir, 'hooks', 'hooks.json');
	if (existsSync(hooks) && 'modules' in JSON.parse(readFileSync(hooks, 'utf8'))) return 'mod';
	return 'hook';
}

const ORDER: Kind[] = ['skill', 'hook', 'mod'];

function load(): Item[] {
	if (!existsSync(ROOT)) return [];
	return readdirSync(ROOT)
		.filter((d) => existsSync(join(ROOT, d, '.claude-plugin', 'plugin.json')))
		.map((slug) => {
			const dir = join(ROOT, slug);
			const manifest = JSON.parse(readFileSync(join(dir, '.claude-plugin', 'plugin.json'), 'utf8'));
			const kind = kindOf(dir);
			const readme = existsSync(join(dir, 'README.md'))
				? readFileSync(join(dir, 'README.md'), 'utf8')
				: '';
			const files = walk(dir)
				.map((f) => relative(dir, f))
				.sort();

			const skills = files
				.filter((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f))
				.map((f) => {
					const { data } = frontmatter(readFileSync(join(dir, f), 'utf8'));
					const name = data.name || f.split('/')[1];
					return {
						name,
						description: data.description ?? '',
						argumentHint: data['argument-hint'],
						invocation: `/${slug}:${name}`
					};
				});

			const hooksFile = join(dir, 'hooks', 'hooks.json');
			const hooksJson = existsSync(hooksFile) ? JSON.parse(readFileSync(hooksFile, 'utf8')) : {};
			const hooks = Object.entries(hooksJson.hooks ?? {}).flatMap(([event, groups]) =>
				(groups as { matcher?: string }[]).map((g) =>
					g.matcher ? `${event} (${g.matcher})` : event
				)
			);

			const sources = files
				.filter((f) => extname(f) in LANGS && !f.startsWith('.claude-plugin') && f !== 'README.md')
				.filter((f) => !/(^|\/)(test|tests|__tests__)\/|\.test\.|fixtures?\//.test(f))
				.filter((f) => statSync(join(dir, f)).size < 40_000)
				.map((f) => ({
					path: f,
					html: highlight(readFileSync(join(dir, f), 'utf8'), LANGS[extname(f)] ?? 'text')
				}));

			return {
				slug,
				kind,
				description: manifest.description ?? '',
				keywords: manifest.keywords ?? [],
				version: manifest.version ?? '1.0.0',
				html: renderMarkdown(readme),
				skills,
				hooks,
				files,
				sources
			} satisfies Item;
		})
		.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.slug.localeCompare(b.slug));
}

export const items = load();

export const summaries: ItemSummary[] = items.map(({ slug, kind, description, keywords }) => ({
	slug,
	kind,
	description,
	keywords
}));
