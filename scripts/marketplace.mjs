// Regenerates .claude-plugin/marketplace.json from plugins/*/.claude-plugin/plugin.json.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const plugins = readdirSync(join(root, 'plugins'))
	.filter((d) => existsSync(join(root, 'plugins', d, '.claude-plugin', 'plugin.json')))
	.sort()
	.map((d) => {
		const dir = join(root, 'plugins', d);
		const m = JSON.parse(readFileSync(join(dir, '.claude-plugin', 'plugin.json'), 'utf8'));
		const hooks = join(dir, 'hooks', 'hooks.json');
		const category = existsSync(join(dir, 'skills'))
			? 'skills'
			: existsSync(hooks) && 'modules' in JSON.parse(readFileSync(hooks, 'utf8'))
				? 'mods'
				: 'guardrails';
		return {
			name: m.name,
			source: `./plugins/${d}`,
			description: m.description,
			version: m.version,
			category,
			tags: m.keywords ?? []
		};
	});

const marketplace = {
	$schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
	name: 'ferjani',
	description: 'Claude Code skills, guardrail hooks and mods by Khaled Ferjani',
	owner: { name: 'Khaled Ferjani', url: 'https://ferjani.dev' },
	plugins
};

const out = join(root, '.claude-plugin', 'marketplace.json');
const json = JSON.stringify(marketplace, null, '\t') + '\n';
if (process.argv.includes('--check')) {
	if (!existsSync(out) || readFileSync(out, 'utf8') !== json) {
		console.error('marketplace.json is stale: run node scripts/marketplace.mjs');
		process.exit(1);
	}
} else {
	writeFileSync(out, json);
	console.log(`${plugins.length} plugins`);
}
