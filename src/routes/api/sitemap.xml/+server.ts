// src/routes/api/sitemap.xml/+server.ts
import { siteConfig } from '$lib/config/site';
import { ENABLE_POCKETBASE } from '$env/static/private';
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

// Define the shape of a Sitemap entry
interface SitemapEntry {
    loc: string;
    priority: string;
    changefreq: string;
    lastmod?: string;
}

// Configuration for dynamic content
const DYNAMIC_ROUTES = [
    {
        collection: 'posts',     // PocketBase collection name
        prefix: '/blog',         // URL prefix (e.g. /blog/my-slug)
        slugField: 'slug',       // Field to use for the URL
        dateField: 'updated'     // Field to use for <lastmod>
    }
    // Add more collections here (e.g., products, categories)
];

export async function GET({ locals }: { locals: App.Locals }) {
    const siteUrl = siteConfig.url;

    // 1. Auto-discover public static routes from the file system
    const modules = import.meta.glob('/src/routes/**/+page.svelte');

    // SAFETY: Define allowed public roots (Whitelist approach).
    const allowedRoots = [
        '/(public)/',
        '/auth/'
    ];

    const staticPages = Object.keys(modules)
        .filter((path) => {
            // Check if path contains any allowed root
            const isAllowed = allowedRoots.some(root => path.includes(root));

            // Exclude dynamic routes (e.g., [slug]) as we can't guess their URLs
            const isDynamic = path.includes('[');

            return isAllowed && !isDynamic;
        })
        .map((path) => {
            // Robustly transform file path to URL path
            let route = path
                .replace('/src/routes', '')      // Remove base
                .replace('/+page.svelte', '');   // Remove file extension

            // Remove all Route Groups generically (e.g., /(public), /(app))
            route = route.replace(/\/\([^)]+\)/g, '');

            return route === '' ? '/' : route;
        });

    // explicitly type the array to support the optional 'lastmod' field later
    let urls: SitemapEntry[] = staticPages.map((url) => ({
        loc: url,
        priority: url === '/' ? '1.0' : '0.7',
        changefreq: 'daily'
    }));

    // 2. Fetch dynamic content if PocketBase is enabled
    // We check specifically for locals.pb to ensure it exists
    if (ENABLE_POCKETBASE === 'true' && locals.pb) {
        const dynamicUrls = await fetchDynamicRoutes(locals.pb);
        urls = [...urls, ...dynamicUrls];
    }

    // 3. Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8" ?>
    <urlset
        xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
    >
        ${urls.map((page) => `
        <url>
            <loc>${siteUrl}${page.loc === '/' ? '' : page.loc}</loc>
            <changefreq>${page.changefreq}</changefreq>
            <priority>${page.priority}</priority>
            ${page.lastmod ? `<lastmod>${new Date(page.lastmod).toISOString()}</lastmod>` : ''}
        </url>
        `).join('')}
    </urlset>`.trim();

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
            // Cache for 1 hour
            'Cache-Control': 'max-age=0, s-maxage=3600'
        }
    });
}

/**
 * Helper to fetch all dynamic routes safely.
 * Uses Promise.allSettled so one failing collection doesn't break the whole sitemap.
 */
async function fetchDynamicRoutes(pb: PocketBase): Promise<SitemapEntry[]> {
    const results: SitemapEntry[] = [];

    // Map configuration to fetch promises
    const promises = DYNAMIC_ROUTES.map(async (config) => {
        try {
            // Fetch items from PocketBase
            const items = await pb.collection(config.collection).getFullList({
                fields: `${config.slugField},${config.dateField}`,
                sort: '-created'
            });

            // Map PB records to SitemapEntry
            return items.map((item: RecordModel) => ({
                loc: `${config.prefix}/${item[config.slugField]}`,
                priority: '0.6',
                changefreq: 'weekly',
                lastmod: item[config.dateField]
            }));
        } catch (err) {
            // Log warning but do NOT crash. 
            // This handles cases where the collection doesn't exist yet.
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[Sitemap] Could not fetch dynamic routes for '${config.collection}':`, message);
            return [];
        }
    });

    const outcomes = await Promise.allSettled(promises);

    outcomes.forEach((result) => {
        if (result.status === 'fulfilled') {
            results.push(...result.value);
        }
    });

    return results;
}