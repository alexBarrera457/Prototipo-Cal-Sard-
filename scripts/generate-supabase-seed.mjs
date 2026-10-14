import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeSql(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Fixed deterministic UUIDs for categories
const CATEGORY_DEFINITIONS = [
  {
    id: 'a0000000-0000-4000-a000-000000000001',
    label: 'Café gourmet',
    value: 'CAFÉ GOURMET',
    slug: 'cafe-gourmet',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000002',
    label: 'Conservas de mar',
    value: 'CONSERVAS DE MAR',
    slug: 'conservas-de-mar',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000003',
    label: 'Dulces tradicionales de fiestas',
    value: 'DULCES DE FIESTAS',
    slug: 'dulces-de-fiestas',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000004',
    label: 'Frutos secos a granel',
    value: 'FRUTOS SECOS',
    slug: 'frutos-secos',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000005',
    label: 'Galletas y pastas',
    value: 'GALLETAS Y PASTAS',
    slug: 'galletas-y-pastas',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000006',
    label: 'Bodega gourmet',
    value: 'BODEGA GOURMET',
    slug: 'bodega-gourmet',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000007',
    label: 'Chocolate gourmet',
    value: 'CHOCOLATE GOURMET',
    slug: 'chocolate-gourmet',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000008',
    label: 'Víveres gourmet',
    value: 'VÍVERES GOURMET',
    slug: 'viveres-gourmet',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000009',
    label: 'Helados y horchata (solo Barcelona)',
    value: 'HELADOS Y HORCHATA',
    slug: 'helados-y-horchata',
  },
  {
    id: 'a0000000-0000-4000-a000-000000000010',
    label: 'Embutidos',
    value: 'EMBUTIDOS',
    slug: 'embutidos',
  },
];

const categoryByValue = new Map(CATEGORY_DEFINITIONS.map((c) => [c.value, c]));

/**
 * Generates deterministic RFC-4122 v4-formatted UUID from product number.
 */
function generateProductUuid(productNumber) {
  const hash = crypto.createHash('sha1').update(`cal-sarda-product-${productNumber}`).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

export function generateSeedSql() {
  const catalogPath = path.join(rootDir, 'app', 'src', 'app', 'services', 'products-catalog.ts');
  const catalogSource = fs.readFileSync(catalogPath, 'utf8');

  const cleaned = catalogSource.replace(/^import\s+.*?;/m, '').replace(/:\s*StoreProduct\[\]/g, '');

  const match = cleaned.match(/export\s+const\s+storeProducts\s*=\s*(\[[\s\S]*\]);/);
  if (!match) {
    throw new Error('Could not parse storeProducts from products-catalog.ts');
  }

  const vmScript = new vm.Script(`(${match[1]})`);
  const products = vmScript.runInNewContext({});
  console.log(`Loaded ${products.length} products from catalog.`);

  const sqlLines = [];
  sqlLines.push('-- =================================================================');
  sqlLines.push('-- Cal Sardà - Seed Data');
  sqlLines.push('-- Catálogo oficial de categorías y productos gourmet fundado en 1930');
  sqlLines.push('-- Generado automáticamente por scripts/generate-supabase-seed.mjs');
  sqlLines.push('-- =================================================================');
  sqlLines.push('');
  sqlLines.push('-- 1. Insert Categories');
  sqlLines.push('INSERT INTO public.categories (id, slug, label, value)');
  sqlLines.push('VALUES');

  const catValues = CATEGORY_DEFINITIONS.map((c, idx) => {
    const isLast = idx === CATEGORY_DEFINITIONS.length - 1;
    return `  (${escapeSql(c.id)}, ${escapeSql(c.slug)}, ${escapeSql(c.label)}, ${escapeSql(c.value)})${isLast ? '' : ','}`;
  });
  sqlLines.push(catValues.join('\n'));
  sqlLines.push('ON CONFLICT (value) DO UPDATE');
  sqlLines.push('  SET label = EXCLUDED.label, slug = EXCLUDED.slug;');
  sqlLines.push('');

  sqlLines.push('-- 2. Insert Products');
  sqlLines.push('INSERT INTO public.products (');
  sqlLines.push('  id,');
  sqlLines.push('  number,');
  sqlLines.push('  name,');
  sqlLines.push('  category_id,');
  sqlLines.push('  category_name,');
  sqlLines.push('  description,');
  sqlLines.push('  short_description,');
  sqlLines.push('  price,');
  sqlLines.push('  price_label,');
  sqlLines.push('  image,');
  sqlLines.push('  images,');
  sqlLines.push('  image_fit,');
  sqlLines.push('  source_url,');
  sqlLines.push('  is_active');
  sqlLines.push(')');
  sqlLines.push('VALUES');

  const productValues = products.map((p, idx) => {
    const isLast = idx === products.length - 1;
    const cat = categoryByValue.get(p.category);
    if (!cat) {
      throw new Error(`Unknown category: "${p.category}" for product ${p.number} (${p.name})`);
    }

    const productId = generateProductUuid(p.number);
    const categoryId = cat.id;
    const categoryName = p.category;
    const desc = p.description ?? '';
    const shortDesc = p.shortDescription ?? '';
    const price =
      typeof p.price === 'number' && !Number.isNaN(p.price) ? p.price.toFixed(2) : '0.00';
    const priceLabel = p.priceLabel ?? null;
    const image = p.image ?? '';
    const imageFit = p.imageFit === 'cover' ? 'cover' : 'contain';
    const sourceUrl = p.sourceUrl ?? null;
    const isActive = true;

    const imagesArray =
      Array.isArray(p.images) && p.images.length > 0
        ? `ARRAY[${p.images.map((img) => escapeSql(img)).join(', ')}]::text[]`
        : `ARRAY[]::text[]`;

    return `  (
    ${escapeSql(productId)},
    ${escapeSql(p.number)},
    ${escapeSql(p.name)},
    ${escapeSql(categoryId)},
    ${escapeSql(categoryName)},
    ${escapeSql(desc)},
    ${escapeSql(shortDesc)},
    ${price},
    ${escapeSql(priceLabel)},
    ${escapeSql(image)},
    ${imagesArray},
    ${escapeSql(imageFit)},
    ${escapeSql(sourceUrl)},
    ${isActive}
  )${isLast ? '' : ','}`;
  });

  sqlLines.push(productValues.join('\n'));
  sqlLines.push('ON CONFLICT (number) DO UPDATE SET');
  sqlLines.push('  name = EXCLUDED.name,');
  sqlLines.push('  category_id = EXCLUDED.category_id,');
  sqlLines.push('  category_name = EXCLUDED.category_name,');
  sqlLines.push('  description = EXCLUDED.description,');
  sqlLines.push('  short_description = EXCLUDED.short_description,');
  sqlLines.push('  price = EXCLUDED.price,');
  sqlLines.push('  price_label = EXCLUDED.price_label,');
  sqlLines.push('  image = EXCLUDED.image,');
  sqlLines.push('  images = EXCLUDED.images,');
  sqlLines.push('  image_fit = EXCLUDED.image_fit,');
  sqlLines.push('  source_url = EXCLUDED.source_url,');
  sqlLines.push('  is_active = EXCLUDED.is_active,');
  sqlLines.push("  updated_at = timezone('utc'::text, now());");
  sqlLines.push('');

  return sqlLines.join('\n');
}

// If executed directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const seedSql = generateSeedSql();
  const outputPath = path.join(rootDir, 'supabase', 'seed.sql');
  fs.writeFileSync(outputPath, seedSql, 'utf8');
  console.log(`Successfully generated ${outputPath} (${(seedSql.length / 1024).toFixed(1)} kB)`);
}
