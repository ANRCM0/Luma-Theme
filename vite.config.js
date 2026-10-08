import {defineConfig} from 'vite';

export default defineConfig({
  define: { __TXBOARD_THEME__: JSON.stringify(process.env.TXBOARD_THEME === 'true') },
  base: process.env.TXBOARD_THEME_PREVIEW === 'true' ? '/' : process.env.TXBOARD_THEME === 'true' ? '/theme/vv-theme/' : process.env.GITHUB_PAGES === 'true' ? '/vv-theme/' : '/',
});
