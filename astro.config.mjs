import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";

// Tailwind 4 loads via PostCSS (see postcss.config.mjs). The Vite plugin
// `@tailwindcss/vite` is not compatible with Vite 7 (bundled by Astro 6).

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://jinba.example.com",
  // Astro 6: "hybrid" was removed — use "static" (default) + per-route `export const prerender = false` for SSR.
  output: "static",
  adapter: vercel({ webAnalytics: { enabled: false }, imageService: true }),
  integrations: [
    react(),
    mdx({
      rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
    }),
    sitemap({
      i18n: {
        defaultLocale: "es",
        locales: { es: "es-ES", en: "en-US" },
      },
      filter: (p) => !p.includes("/admin/"),
    }),
  ],
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
    fallback: { en: "es" },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  image: {
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
