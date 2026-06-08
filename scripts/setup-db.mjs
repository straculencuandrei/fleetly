import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const devVars = readFileSync(join(root, '.dev.vars'), 'utf8');
const match = devVars.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error('DATABASE_URL lipsește din .dev.vars');

const client = new pg.Client({ connectionString: match[1], ssl: { rejectUnauthorized: false } });
await client.connect();

const schema = readFileSync(join(root, 'database', 'schema.sql'), 'utf8');
const seed = readFileSync(join(root, 'database', 'seed.sql'), 'utf8');

console.log('Rulez schema.sql...');
await client.query(schema);
console.log('Schema OK');

console.log('Rulez seed.sql...');
await client.query(seed);
console.log('Seed OK');

const counts = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM masini) AS masini,
    (SELECT COUNT(*)::int FROM masini WHERE listat_pe_site = true) AS pe_site,
    (SELECT COUNT(*)::int FROM soferi) AS soferi
`);
console.log('Rezultat:', counts.rows[0]);

const sample = await client.query(`
  SELECT marca, model, listat_pe_site FROM masini ORDER BY listat_pe_site DESC, id
`);
console.log('Mașini în DB:');
sample.rows.forEach((r) => console.log(`  - ${r.marca} ${r.model}${r.listat_pe_site ? ' [SITE]' : ''}`));

await client.end();
console.log('Gata!');
