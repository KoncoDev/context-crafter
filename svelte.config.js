import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Load env vars specifically for build config
import dotenv from 'dotenv';
dotenv.config();

const target = process.env.DEPLOY_TARGET || 'vercel'; // Default to vercel

const getAdapter = () => {
    if (target === 'cloudflare') {
        console.log('🏗️ Building for Cloudflare...');
        return adapterCloudflare();
    }
    console.log('🏗️ Building for Vercel...');
    return adapterVercel();
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: getAdapter(),
        alias: {
            "@": "./src"
        }
    }
};

export default config;
