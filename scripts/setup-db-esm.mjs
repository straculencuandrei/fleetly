import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const devVars = readFileSync(join(root, '.dev.vars'), 'utf8');
const match = devVars.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error('DATABASE_URL lipsește din .dev.vars');

const sql = postgres(match[1], { ssl: 'require', max: 1 });

const schema = readFileSync(join(root, 'database', 'schema.sql'), 'utf8');
const seed = readFileSync(join(root, 'database', 'seed.sql'), 'utf8');

console.log('Rulez schema.sql...');
await sql.unsafe(schema);
console.log('Schema OK');

console.log('Rulez seed.sql...');
await sql.unsafe(seed);
console.log('Seed OK');

const [counts] = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM masini) AS masini,
    (SELECT COUNT(*)::int FROM masini WHERE listat_pe_site = true) AS pe_site,
    (SELECT COUNT(*)::int FROM soferi) AS soferi
`;
console.log('Rezultat:', counts);

const rows = await sql`SELECT marca, model, listat_pe_site FROM masini ORDER BY listat_pe_site DESC, id`;
console.log('Mașini în DB:');
rows.forEach((r) => console.log(`  - ${r.marca} ${r.model}${r.listat_pe_site ? ' [SITE]' : ''}`));

await sql.end();
console.log('Gata!');
