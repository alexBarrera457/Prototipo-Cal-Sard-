import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSeedSql } from './generate-supabase-seed.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('generateSeedSql produces comprehensive seed data for categories and products', () => {
  const sql = generateSeedSql();

  assert.ok(
    sql.includes('INSERT INTO public.categories'),
    'Should have categories insert statement',
  );
  assert.ok(sql.includes('INSERT INTO public.products'), 'Should have products insert statement');

  // Verify categories
  const expectedCategories = [
    'CAFÉ GOURMET',
    'CONSERVAS DE MAR',
    'DULCES DE FIESTAS',
    'FRUTOS SECOS',
    'GALLETAS Y PASTAS',
    'BODEGA GOURMET',
    'CHOCOLATE GOURMET',
    'VÍVERES GOURMET',
    'HELADOS Y HORCHATA',
    'EMBUTIDOS',
  ];

  for (const cat of expectedCategories) {
    assert.ok(sql.includes(cat), `Category ${cat} must be present in SQL`);
  }

  // Verify all 455 products are generated
  const productInsertCount = (sql.match(/ARRAY\[/g) || []).length;
  assert.equal(productInsertCount, 455, 'Should generate exactly 455 products');

  // Verify first and last products
  assert.ok(sql.includes("'01'"), 'Product 01 should be present');
  assert.ok(sql.includes("'455'"), 'Product 455 should be present');
  assert.ok(sql.includes('Café 100% Robusta'), 'Product name should be present');
  assert.ok(sql.includes('Trenzas de Pan con Mantequilla'), 'Last product name should be present');

  // Verify check constraints and array syntax
  assert.ok(sql.includes('::text[]'), 'Images should use ::text[] cast');
  assert.ok(
    sql.includes("'contain'") || sql.includes("'cover'"),
    'image_fit should be contain or cover',
  );
  assert.ok(!sql.includes("'undefined'"), 'No undefined string literals');
  assert.ok(!sql.includes("'NaN'"), 'No NaN values');
});

test('supabase/seed.sql file exists and is populated', () => {
  const seedFile = path.join(rootDir, 'supabase', 'seed.sql');
  assert.ok(fs.existsSync(seedFile), 'supabase/seed.sql must exist on disk');

  const content = fs.readFileSync(seedFile, 'utf8');
  assert.ok(content.length > 300000, 'seed.sql should be at least 300 kB');
  assert.ok(content.includes('INSERT INTO public.categories'));
  assert.ok(content.includes('INSERT INTO public.products'));
  assert.ok(content.includes('ON CONFLICT (number) DO UPDATE'));
});
