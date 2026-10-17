export type Pick = {
	name: string;
	url: string;
	description: string;
	why: string;
	install?: string[];
};

export type Group = { id: string; title: string; intro: string; picks: Pick[] };

export const groups: Group[] = [
	{
		id: 'mcp',
		title: 'MCP servers',
		intro:
			'Servers that give Claude live access to the tools you already use. Add only the ones you need: each one costs context on every turn.',
		picks: [
			{
				name: 'GitHub',
				url: 'https://github.com/github/github-mcp-server',
				description: "GitHub's official MCP server: issues, pull requests, reviews, Actions runs.",
				why: 'Reading PR threads and CI logs without leaving the session. Pair it with the guard hook so nothing gets posted as you by accident.',
				install: ['/plugin install github@claude-plugins-official']
			},
			{
				name: 'Playwright',
				url: 'https://github.com/microsoft/playwright-mcp',
				description:
					'Drives a real browser: navigate, click, fill forms, take screenshots, read the console.',
				why: 'The fastest way to let Claude check its own UI work at desktop and phone widths.',
				install: ['claude mcp add playwright npx @playwright/mcp@latest']
			},
			{
				name: 'Context7',
				url: 'https://github.com/upstash/context7',
				description: 'Current, version-specific documentation for libraries and frameworks.',
				why: 'Stops Claude from writing code against an API that changed two majors ago.',
				install: ['claude mcp add --transport http context7 https://mcp.context7.com/mcp']
			},
			{
				name: 'Sentry',
				url: 'https://docs.sentry.io/product/sentry-mcp/',
				description: 'Issues, events and stack traces from your Sentry projects.',
				why: 'Debugging from the real production stack trace instead of a guess.',
				install: ['claude mcp add --transport http sentry https://mcp.sentry.dev/mcp']
			},
			{
				name: 'Figma',
				url: 'https://help.figma.com/hc/en-us/articles/32132100833559',
				description: 'Reads frames, components and variables from Figma files.',
				why: 'Building a screen from the actual design tokens, not from a screenshot.',
				install: ['claude mcp add --transport http figma https://mcp.figma.com/mcp']
			},
			{
				name: 'Notion',
				url: 'https://developers.notion.com/docs/mcp',
				description: 'Search and edit pages and databases in your Notion workspace.',
				why: 'Specs and runbooks that live in Notion become usable context.',
				install: ['claude mcp add --transport http notion https://mcp.notion.com/mcp']
			}
		]
	},
	{
		id: 'plugins',
		title: 'Plugins',
		intro: 'Plugins I keep installed. Most come from the official Anthropic directory.',
		picks: [
			{
				name: 'code-review',
				url: 'https://github.com/anthropics/claude-plugins-official',
				description: 'Reviews the current diff for bugs and fixes what it finds.',
				why: 'First step of my review chain before any pull request.',
				install: ['/plugin install code-review@claude-plugins-official']
			},
			{
				name: 'ponytail',
				url: 'https://github.com/DietrichGebert/ponytail',
				description: 'Hunts over-engineering: code you did not need to write.',
				why: 'Second step of the review chain. I use it as a reviewer after the code exists, not as a persona while writing.'
			},
			{
				name: 'superpowers',
				url: 'https://github.com/obra/superpowers',
				description: 'A skills framework with brainstorming, planning and execution workflows.',
				why: 'Good structure for larger features that need a plan before code.'
			},
			{
				name: 'typescript-lsp and gopls-lsp',
				url: 'https://github.com/anthropics/claude-plugins-official',
				description: 'Language servers, so Claude gets real diagnostics and go-to-definition.',
				why: 'Catches type errors right after an edit instead of at the end of the task.',
				install: [
					'/plugin install typescript-lsp@claude-plugins-official',
					'/plugin install gopls-lsp@claude-plugins-official'
				]
			},
			{
				name: 'frontend-design',
				url: 'https://github.com/anthropics/claude-plugins-official',
				description: 'Design guidance for building interfaces that do not look generated.',
				why: 'Better first drafts for UI work.',
				install: ['/plugin install frontend-design@claude-plugins-official']
			},
			{
				name: 'skill-creator',
				url: 'https://github.com/anthropics/claude-plugins-official',
				description: 'Helps you write, test and improve your own skills.',
				why: 'Most of the skills on this site started there.',
				install: ['/plugin install skill-creator@claude-plugins-official']
			},
			{
				name: 'agent-notifications',
				url: 'https://github.com/777genius/agent-notifications',
				description: 'Desktop notifications when Claude finishes or needs input.',
				why: 'Lets me run several sessions and only look when one needs me.'
			}
		]
	},
	{
		id: 'skills',
		title: 'Skills by other people',
		intro: 'Skills I use every week but did not write. Install them from their authors.',
		picks: [
			{
				name: 'mattpocock/skills',
				url: 'https://github.com/mattpocock/skills',
				description:
					'grill-me, tdd, diagnosing-bugs, codebase-design, handoff, research, writing-for-agents and more.',
				why: 'grill-me before any big change, tdd for bug fixes, handoff when a session gets long. The best general set out there.'
			},
			{
				name: 'humanizer',
				url: 'https://github.com/blader/humanizer',
				description: 'Removes the signs of AI writing from text.',
				why: 'I run it on every PR description, issue and doc before it goes out.'
			},
			{
				name: 'agent-skills',
				url: 'https://github.com/addyosmani/agent-skills',
				description: 'Engineering skills for AI coding agents by Addy Osmani.',
				why: 'Solid defaults for performance, accessibility and web quality work.'
			}
		]
	},
	{
		id: 'mods',
		title: 'Mods by other people',
		intro:
			'Mods are plugins with JavaScript handlers that run inside Claude Code (version 2.1.287 or later). They run with your permissions, so read the code first.',
		picks: [
			{
				name: 'cctop',
				url: 'https://github.com/tomstagl/cctop',
				description:
					'A btop-style live dashboard for context, tokens, cost, limits, tools and agents, in a pane next to your session.',
				why: 'The quickest answer to "why is this session slow and expensive".'
			},
			{
				name: 'claude-code-mods',
				url: 'https://github.com/ray-amjad/claude-code-mods',
				description:
					'A collection of panes, bands, prompt guards, secret handling and memory tools.',
				why: 'A good tour of what mods can do. My secret-redactor started from an idea here.'
			},
			{
				name: 'aside',
				url: 'https://github.com/JayDoubleu/aside',
				description:
					'A read-only side chat, so you can ask a question without derailing the main task.',
				why: 'Questions mid-task stop polluting the main context.'
			},
			{
				name: 'cc-pr-tracker',
				url: 'https://github.com/sezaakgun/cc-pr-tracker',
				description: 'Shows merge state, reviews and required checks of your PRs above the prompt.',
				why: 'No more switching to the browser to see whether CI passed.'
			},
			{
				name: 'claude-mods (usage band)',
				url: 'https://github.com/pawandeepdhall/claude-mods',
				description: 'Always-visible 5-hour and weekly usage limits with a reset countdown.',
				why: 'You see the limit coming instead of hitting it.'
			},
			{
				name: 'pixelband and Claude Fables',
				url: 'https://github.com/furqan-khan07/pixelband',
				description: 'Animated pixel art and little cartoons above the prompt while Claude works.',
				why: 'Useless and charming. Zero tokens.'
			}
		]
	},
	{
		id: 'tools',
		title: 'Command line tools',
		intro: 'Not Claude Code plugins, but they change how a session feels.',
		picks: [
			{
				name: 'rtk',
				url: 'https://github.com/rtk-ai/rtk',
				description:
					'A command proxy that condenses the output of common dev commands before Claude reads it.',
				why: 'Long test and build logs stop eating the context window.'
			},
			{
				name: 'GitHub CLI',
				url: 'https://cli.github.com',
				description: 'gh: pull requests, issues, Actions and the GitHub API from the shell.',
				why: 'Most skills here use it. Claude is very good with it.'
			}
		]
	}
];
