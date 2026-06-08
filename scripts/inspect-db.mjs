import { readFileSync } from 'fs';
import pg from 'pg';

const devVars = readFileSync('.dev.vars', 'utf8');
const match = devVars.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error('DATABASE_URL not found');
const client = new pg.Client({ connectionString: match[1] });

await client.connect();
const tables = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
);
console.log('TABLES:', tables.rows.map((r) => r.table_name).join(', ') || '(none)');

for (const row of tables.rows) {
  const name = row.table_name;
  const cols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [name]
  );
  console.log(`\n${name}:`);
  cols.rows.forEach((c) => console.log(`  - ${c.column_name} (${c.data_type})`));
  const count = await client.query(`SELECT COUNT(*)::int AS n FROM "${name}"`);
  console.log(`  rows: ${count.rows[0].n}`);
  if (count.rows[0].n > 0 && count.rows[0].n <= 20) {
    const sample = await client.query(`SELECT * FROM "${name}" LIMIT 5`);
    console.log('  sample:', JSON.stringify(sample.rows, null, 2));
  }
}

await client.end();
