import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({ root: fileURLToPath(new URL('./frontend', import.meta.url)), plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./frontend', import.meta.url)) } }, build: { outDir: fileURLToPath(new URL('./dist', import.meta.url)), emptyOutDir: true } });
