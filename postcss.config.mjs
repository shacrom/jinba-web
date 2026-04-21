// PostCSS config — switched from `@tailwindcss/vite` plugin after Astro 6
// bumped Vite to 7.x, which removed `createIdResolver`. The postcss plugin
// path is Vite-version-agnostic and works inside Astro's built-in PostCSS.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
