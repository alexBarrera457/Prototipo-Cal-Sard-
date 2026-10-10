import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASE_URL = 'https://calsarda.com';

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProductSlug(product) {
  return product.slug ?? (slugify(product.name) || product.number);
}

// 1. Static Routes
const staticRoutes = [
  { path: '', changefreq: 'weekly', priority: '1.0' },
  { path: 'tienda-online', changefreq: 'daily', priority: '0.9' },
  { path: 'historia', changefreq: 'monthly', priority: '0.7' },
  { path: 'galeria', changefreq: 'monthly', priority: '0.6' },
  { path: 'contacto', changefreq: 'monthly', priority: '0.7' },
  { path: 'boletin', changefreq: 'monthly', priority: '0.5' },
  { path: 'descubre-el-territorio', changefreq: 'monthly', priority: '0.6' },
  { path: 'lotes-para-empresas', changefreq: 'monthly', priority: '0.7' },
  { path: 'lotes-y-cestas-gourmet', changefreq: 'monthly', priority: '0.8' },
  { path: 'faq', changefreq: 'monthly', priority: '0.6' },
  { path: 'blog', changefreq: 'weekly', priority: '0.7' },
  { path: 'aviso-legal', changefreq: 'yearly', priority: '0.3' },
  { path: 'politica-de-privacidad', changefreq: 'yearly', priority: '0.3' },
  { path: 'politica-de-cookies', changefreq: 'yearly', priority: '0.3' },
  { path: 'condiciones-generales', changefreq: 'yearly', priority: '0.3' },
  { path: 'mapa-web', changefreq: 'monthly', priority: '0.4' },
];

// 2. Load products catalog
const catalogPath = path.join(rootDir, 'app', 'src', 'app', 'services', 'products-catalog.ts');
const catalogSource = fs.readFileSync(catalogPath, 'utf8');

const jsonMatch = catalogSource.match(
  /export const storeProducts: StoreProduct\[\] = (\[[\s\S]*\]);/,
);
if (!jsonMatch) {
  throw new Error('Could not parse storeProducts from products-catalog.ts');
}

const products = JSON.parse(jsonMatch[1]);
console.log(`Found ${products.length} products to include in sitemap.`);

const today = new Date().toISOString().split('T')[0];

const sitemapEntries = [
  ...staticRoutes.map((r) => {
    const loc = r.path ? `${BASE_URL}/${r.path}` : `${BASE_URL}/`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
  }),
  ...products.map((p) => {
    const slug = getProductSlug(p);
    return `  <url>
    <loc>${BASE_URL}/tienda-online/producto/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }),
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`;

const robotsTxt = `User-agent: *
Allow: /
Disallow: /preparar-pedido
Disallow: /cuenta
Disallow: /crear-cuenta

Sitemap: ${BASE_URL}/sitemap.xml
`;

const publicDir = path.join(rootDir, 'app', 'public');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8');

console.log(
  `Successfully generated sitemap.xml (${sitemapEntries.length} URLs) and robots.txt in ${publicDir}`,
);
