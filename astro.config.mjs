import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';


// https://astro.build/config
export default defineConfig({
    site: 'https://remybarranco.fr',
    integrations: [mdx(), sitemap(), (await import("astro-compress")).default({
        CSS: true,
        HTML: {
            "html-minifier-terser": {
                removeAttributeQuotes: false,
            },
        },
        Image: false,
        JavaScript: true,
        SVG: false,
    }),
    ],

    markdown: {
        remarkPlugins: [
            'remark-math',
        ],
        rehypePlugins: [
            ['rehype-katex', {
                trust: true
                // Katex plugin options
            }]
        ]
    }
});