import {defineConfig} from 'vite';

export default defineConfig({
  base: process.env.TXBOARD_THEME === 'true' ? '/theme/vv-theme/' : process.env.GITHUB_PAGES === 'true' ? '/vv-theme/' : '/',
});
