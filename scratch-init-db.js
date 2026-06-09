// Căutare sau creare tabele în PostgreSQL pentru Fleetly
const { Client } = require('pg');

const connectionString = 'postgresql://fleetlydb_user:g73UAbx9iAKDQPSgFsVpp2BDlejFsBoS@dpg-d8jf7kcm0tmc73ch14pg-a.virginia-postgres.render.com:5432/fleetlydb?sslmode=require';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const schemaQuery = `
CREATE TABLE IF NOT EXISTS public.masini (
    id VARCHAR(50) PRIMARY KEY,
    nr_inmatriculare VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    an_fabricatie INTEGER NOT NULL,
    tip_combustibil VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'Activ',
    categorie VARCHAR(50),
    pret NUMERIC,
    kilometraj INTEGER DEFAULT 0,
    transmisie VARCHAR(50),
    imagine_url TEXT,
    descriere TEXT,
    specificatii TEXT, -- JSON stocat ca text
    rata_finantare NUMERIC,
    listat_pe_site BOOLEAN DEFAULT TRUE,
    badge VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS public.soferi (
    id VARCHAR(50) PRIMARY KEY,
    nume VARCHAR(100) NOT NULL,
    categorii_permis VARCHAR(30),
    telefon VARCHAR(30),
    data_expirare_permis DATE,
    masina_alocata_id VARCHAR(50) REFERENCES public.masini(id) ON DELETE SET NULL
);
`;

async function main() {
  try {
    await client.connect();
    console.log('Conectat la PostgreSQL.');
    await client.query(schemaQuery);
    console.log('Tabelele public.masini și public.soferi au fost create/verificate cu succes!');
  } catch (err) {
    console.error('Eroare la crearea tabelelor:', err.message);
  } finally {
    await client.end();
  }
}

main();
