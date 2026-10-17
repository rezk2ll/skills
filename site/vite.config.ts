import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html' }),
			// Served from ferjani.dev/skills and rezk2ll.github.io/skills.
			paths: { base: '/skills' },
			prerender: { entries: ['*', '/sitemap.xml', '/llms.txt'] }
		})
	],
	server: { fs: { allow: ['..'] } }
});
