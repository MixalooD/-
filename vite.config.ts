import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.VITE_BASE_PATH || './',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so unbundled image URLs resolve in production
      // builds, and creates GitHub Pages support files (.nojekyll and 404.html).
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          if (fs.existsSync(distDir)) {
            const leakedChatAssets = path.join(distDir, 'assets', 'aistudio');
            if (fs.existsSync(leakedChatAssets)) {
              fs.rmSync(leakedChatAssets, {recursive: true, force: true});
            }
            fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
            const indexHtml = path.join(distDir, 'index.html');
            if (fs.existsSync(indexHtml)) {
              fs.copyFileSync(indexHtml, path.join(distDir, '404.html'));
            }
            if (process.env.GITHUB_ACTIONS !== 'true') {
              const docsDir = path.resolve(__dirname, 'docs');
              fs.rmSync(docsDir, {recursive: true, force: true});
              fs.cpSync(distDir, docsDir, {recursive: true, force: true});
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
