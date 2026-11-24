// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages sert le dépôt sous /<NomDuDépôt>/ — sensible à la casse : « Keu-Diru », pas « keu-diru ».
// Surcharger via SITE_URL / BASE_PATH (ex. BASE_PATH=/ pour un domaine personnalisé ou un aperçu).
const site = process.env.SITE_URL ?? 'https://krazymapper.github.io';
const base = process.env.BASE_PATH ?? '/Keu-Diru';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  // ASSETS_DIR : l'hébergeur d'aperçu réserve les noms commençant par « _ »
  build: { format: 'directory', assets: process.env.ASSETS_DIR ?? '_astro' },
});
