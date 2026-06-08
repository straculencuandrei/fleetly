-- Fleetly: rulează TOT acest fișier în panoul DATABASE (fleetly_hk1n)
-- Click dreapta pe baza de date → New Query → lipește → Run
--
-- ATENȚIE: șterge tabelele vechi (inclusiv „Masini” cu structură diferită)
-- și le recreează de la zero. Datele vechi se pierd.

-- 0) CURĂȚARE — rezolvă eroarea „foreign key constraint cannot be implemented”
DROP TABLE IF EXISTS utilizatori CASCADE;
DROP TABLE IF EXISTS anvelope CASCADE;
DROP TABLE IF EXISTS viniete CASCADE;
DROP TABLE IF EXISTS asigurari CASCADE;
DROP TABLE IF EXISTS service_entries CASCADE;
DROP TABLE IF EXISTS soferi CASCADE;
DROP TABLE IF EXISTS masini CASCADE;

-- 1) SCHEMA (tabele noi, structură corectă)
CREATE TABLE masini (
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

CREATE TABLE soferi (
    id VARCHAR(32) PRIMARY KEY,
    nume VARCHAR(150) NOT NULL,
    categorii_permis VARCHAR(50),
    telefon VARCHAR(30),
    data_expirare_permis DATE,
    masina_alocata_id VARCHAR(32) REFERENCES masini(id) ON DELETE SET NULL
);

CREATE TABLE service_entries (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    data DATE,
    descriere TEXT,
    cost NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'În curs'
);

CREATE TABLE asigurari (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    tip VARCHAR(50),
    companie VARCHAR(100),
    cost NUMERIC(12, 2),
    data_start DATE,
    data_expirare DATE
);

CREATE TABLE viniete (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    tara VARCHAR(50),
    durata VARCHAR(50),
    data_start DATE,
    data_expirare DATE,
    cost NUMERIC(10, 2)
);

CREATE TABLE anvelope (
    id VARCHAR(32) PRIMARY KEY,
    masina_id VARCHAR(32) REFERENCES masini(id) ON DELETE CASCADE,
    sezon VARCHAR(30),
    dimensiune VARCHAR(30),
    marca VARCHAR(50),
    stare VARCHAR(50),
    locatie VARCHAR(50)
);

CREATE TABLE utilizatori (
    username VARCHAR(50) PRIMARY KEY,
    parola VARCHAR(100) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    driver_id VARCHAR(32) REFERENCES soferi(id) ON DELETE SET NULL,
    passkey VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_masini_listat ON masini(listat_pe_site);
CREATE INDEX IF NOT EXISTS idx_masini_status ON masini(status);

-- 2) SEED (date demo)
INSERT INTO masini (id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status, listat_pe_site) VALUES
('c1', 'B 123 ABC', 'Dacia', 'Logan', 2021, 'Benzină/GPL', 'Activ', false),
('c2', 'CJ 77 WXY', 'Skoda', 'Octavia', 2019, 'Motorină', 'Activ', false),
('c3', 'TM 99 ZZZ', 'Volkswagen', 'Golf', 2022, 'Electric', 'În Service', false),
('c4', 'IS 05 SMW', 'Ford', 'Focus', 2020, 'Hibrid', 'În Service', false);

INSERT INTO masini (
    id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status,
    categorie, pret, kilometraj, transmisie, imagine_url, descriere, specificatii,
    rata_finantare, listat_pe_site, badge
) VALUES
('s1', 'B 00 BMW', 'BMW', '7 Series', 2022, 'Mild Hybrid', 'Activ', 'Sedan Premium', 34900, 62000, 'Automat', 'images/luxury_silver_sedan.png', 'BMW Seria 7 în finisaj argintiu metalizat.', '{"Cai Putere":"394 CP"}', 450, true, 'Disponibil'),
('s2', 'B 00 RRV', 'Range Rover', 'Velar', 2023, 'Plug-In Hybrid', 'Activ', 'SUV Luxury', 62500, 34000, 'Automat', 'images/dark_metal_suv.png', 'Range Rover Velar — SUV premium britanic.', '{"Cai Putere":"404 CP"}', 790, true, 'Disponibil'),
('s3', 'B 00 AM', 'Aston Martin', 'Valkyrie', 2021, 'Benzină', 'Activ', 'Sports Premium', 119000, 18500, 'Automat (PDK)', 'images/grey_sports_car.png', 'Aston Martin Valkyrie — hypercar de ediție limitată.', '{"Cai Putere":"1160 CP"}', 1450, true, 'Disponibil'),
('s4', 'B 01 MER', 'Mercedes-Benz', 'S-Class 580', 2023, 'Hibrid', 'Activ', 'Sedan Premium', 98500, 22000, 'Automat 9G-TRONIC', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80', 'Mercedes-Benz S-Class flagship.', '{"Cai Putere":"503 CP"}', 1180, true, 'Disponibil'),
('s5', 'B 02 AUD', 'Audi', 'e-tron GT quattro', 2024, 'Electric', 'Activ', 'Sports Premium', 87500, 12000, 'Automat', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80', 'Audi e-tron GT electric.', '{"Cai Putere":"646 CP"}', 1050, true, 'Disponibil'),
('s6', 'B 03 TSL', 'Tesla', 'Model S Plaid', 2023, 'Electric', 'Activ', 'Sedan Premium', 79900, 28000, 'Automat', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80', 'Tesla Model S Plaid.', '{"Cai Putere":"1020 CP"}', 960, true, 'Disponibil'),
('s7', 'B 04 LAM', 'Lamborghini', 'Urus Performante', 2022, 'Benzină', 'Activ', 'SUV Luxury', 249000, 15000, 'Automat 8 trepte', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80', 'Lamborghini Urus Performante.', '{"Cai Putere":"666 CP"}', 2990, true, 'Disponibil'),
('s8', 'B 05 BEN', 'Bentley', 'Continental GT Speed', 2021, 'Benzină', 'Activ', 'Sports Premium', 189000, 21000, 'Automat 8 trepte', 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=900&q=80', 'Bentley Continental GT Speed.', '{"Cai Putere":"659 CP"}', 2270, true, 'Disponibil'),
('s9', 'B 06 LEX', 'Lexus', 'LX 600 Ultra Luxury', 2023, 'Benzină', 'Activ', 'SUV Luxury', 112000, 19000, 'Automat 10 trepte', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80', 'Lexus LX 600 Ultra Luxury.', '{"Cai Putere":"409 CP"}', 1340, true, 'Disponibil');

INSERT INTO soferi (id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id) VALUES
('d1', 'Andrei Ionescu', 'B', '0722123456', '2028-10-12', 'c1'),
('d2', 'Mihai Popescu', 'B, C', '0733987654', '2026-06-15', 'c2'),
('d3', 'Elena Dumitrescu', 'B', '0744112233', '2029-01-20', 'c4'),
('d4', 'Alexandru Radu', 'B', '0755443322', '2026-08-30', 'c3');

INSERT INTO service_entries (id, masina_id, data, descriere, cost, status) VALUES
('sv1', 'c3', '2026-05-20', 'Schimb filtre și ulei motor + revizie sistem electric', 850, 'În curs'),
('sv2', 'c1', '2026-04-10', 'Înlocuire plăcuțe frână față și lichid de frână', 450, 'Finalizat'),
('sv3', 'c2', '2026-03-05', 'Kit distribuție și pompă de apă', 1800, 'Finalizat');

INSERT INTO asigurari (id, masina_id, tip, companie, cost, data_start, data_expirare) VALUES
('i1', 'c1', 'RCA', 'Euroins', 1200, '2025-06-01', '2026-06-01'),
('i2', 'c2', 'CASCO', 'Omniasig', 3400, '2025-09-15', '2026-09-15'),
('i3', 'c3', 'RCA', 'Groupama', 950, '2026-01-10', '2027-01-10'),
('i4', 'c4', 'RCA', 'Allianz Direct', 1100, '2026-05-25', '2026-06-25');

INSERT INTO viniete (id, masina_id, tara, durata, data_start, data_expirare, cost) VALUES
('v1', 'c1', 'România', '1 An', '2025-08-01', '2026-08-01', 140),
('v2', 'c2', 'România', '1 An', '2025-11-20', '2026-11-20', 140),
('v3', 'c3', 'Ungaria', '10 Zile', '2026-05-24', '2026-06-03', 80),
('v4', 'c4', 'România', '30 Zile', '2026-04-28', '2026-05-28', 35);

INSERT INTO anvelope (id, masina_id, sezon, dimensiune, marca, stare, locatie) VALUES
('t1', 'c1', 'Vară', '185/65 R15', 'Michelin', 'Excelent', 'Pe mașină'),
('t2', 'c1', 'Iarnă', '185/65 R15', 'Continental', 'Uzat', 'Depozit'),
('t3', 'c2', 'All-Season', '205/55 R16', 'Bridgestone', 'Bun', 'Pe mașină'),
('t4', 'c3', 'Vară', '195/65 R15', 'Hankook', 'Nou', 'Pe mașină'),
('t5', 'c4', 'Iarnă', '205/55 R16', 'Nokian', 'Excelent', 'Pe mașină');

INSERT INTO utilizatori (username, parola, rol, driver_id, passkey) VALUES
('admin', 'admin123', 'admin', NULL, 'key_admin_master'),
('andrei', 'client123', 'client', 'd1', 'key_andrei_default'),
('mihai', 'client123', 'client', 'd2', 'key_mihai_default'),
('elena', 'client123', 'client', 'd3', 'key_elena_default'),
('alexandru', 'client123', 'client', 'd4', 'key_alexandru_default');

-- 3) VERIFICARE
SELECT COUNT(*) AS total_masini FROM masini;
SELECT COUNT(*) AS masini_pe_site FROM masini WHERE listat_pe_site = true;
SELECT marca, model, listat_pe_site FROM masini ORDER BY listat_pe_site DESC, id;
