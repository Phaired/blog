import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
    site: 'https://remybarranco.fr',
    integrations: [
        mdx(),
        sitemap(),
        (await import('astro-compress')).default({
            CSS: true,
            HTML: {
                'html-minifier-terser': {
                    removeAttributeQuotes: false,
                },
            },
            Image: false,
            JavaScript: true,
            SVG: false,
        }),
    ],
    markdown: {
        remarkPlugins: [remarkMath],
        rehypePlugins: [
            [
                rehypeKatex,
                {
                    trust: true,
                    // Additional KaTeX plugin options can be added here
                },
            ],
        ],
    },
});