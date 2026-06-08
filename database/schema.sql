-- Fleetly PostgreSQL schema
-- Rulează în panoul DATABASE din Cursor (conexiunea fleetly_hk1n)

CREATE TABLE IF NOT EXISTS masini (
    id VARCHAR(32) PRIMARY KEY,
    nr_inmatriculare VARCHAR(20),
    marca VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    an_fabricatie INTEGER,
    tip_combustibil VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Activ',
    categorie VARCHAR(100),
    pret NUMERIC(12, 2),
    kilometraj INTEGER,
    transmisie VARCHAR(50),
    imagine_url TEXT,
    descriere TEXT,
    specificatii JSONB DEFAULT '{}',
    rata_finantare NUMERIC(10, 2),
    listat_pe_site BOOLEAN DEFAULT FALSE,
    badge VARCHAR(50) DEFAULT 'Disponibil'
);

CREATE TABLE IF NOT EXISTS soferi (
    id VARCHAR(32) PRIMARY KEY,
    nume VARCHAR(150) NOT NULL,
    categorii_permis VARCHAR(50),
    telefon VARCHAR(30),
    data_expirare_permis DATE,
    masina_alocata_id VARCHAR(32) REFERENCES masini(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_entries (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    data DATE,
    descriere TEXT,
    cost NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'În curs'
);

CREATE TABLE IF NOT EXISTS asigurari (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    tip VARCHAR(50),
    companie VARCHAR(100),
    cost NUMERIC(12, 2),
    data_start DATE,
    data_expirare DATE
);

CREATE TABLE IF NOT EXISTS viniete (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    tara VARCHAR(50),
    durata VARCHAR(50),
    data_start DATE,
    data_expirare DATE,
    cost NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS anvelope (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    sezon VARCHAR(30),
    dimensiune VARCHAR(30),
    marca VARCHAR(50),
    stare VARCHAR(50),
    locatie VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS utilizatori (
    username VARCHAR(50) PRIMARY KEY,
    parola VARCHAR(100) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    driver_id VARCHAR(32) REFERENCES soferi(id) ON DELETE SET NULL,
    passkey VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_masini_listat ON masini(listat_pe_site);
CREATE INDEX IF NOT EXISTS idx_masini_status ON masini(status);
