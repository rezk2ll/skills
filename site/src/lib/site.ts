export const SITE_URL = 'https://ferjani.dev/skills';
export const SITE_NAME = 'Claude Code skills by Khaled Ferjani';
export const SITE_DESCRIPTION =
	'Installable Claude Code skills, guardrail hooks and mods: PR writing rules, review chains, secret redaction, safety guards and more. Free and MIT licensed.';
export const REPO = 'rezk2ll/skills';
export const REPO_URL = `https://github.com/${REPO}`;
export const AUTHOR = { name: 'Khaled Ferjani', url: 'https://ferjani.dev' };

export type Kind = 'skill' | 'hook' | 'mod';

export const KINDS: Record<Kind, { label: string; plural: string; blurb: string }> = {
	skill: {
		label: 'Skill',
		plural: 'Skills',
		blurb: 'Instructions Claude loads when a task matches, or that you run with a slash command.'
	},
	hook: {
		label: 'Guardrail',
		plural: 'Guardrails',
		blurb: 'Shell hooks that run on Claude Code events and can block an action before it happens.'
	},
	mod: {
		label: 'Mod',
		plural: 'Mods',
		blurb:
			'JavaScript function hooks that run inside Claude Code. Requires Claude Code 2.1.287 or later.'
	}
};

export type ItemSummary = {
	slug: string;
	kind: Kind;
	description: string;
	keywords: string[];
};

export type Item = ItemSummary & {
	version: string;
	html: string;
	skills: { name: string; description: string; invocation: string; argumentHint?: string }[];
	hooks: string[];
	files: string[];
	sources: { path: string; html: string }[];
};

export const installCommands = (slug: string) => [`/plugin install ${slug} --marketplace ${REPO}`];
