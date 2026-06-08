-- Date inițiale Fleetly (4 mașini flotă + 9 mașini listate pe site)
-- Rulează după schema.sql

TRUNCATE masini, soferi, service_entries, asigurari, viniete, anvelope, utilizatori RESTART IDENTITY CASCADE;

-- === FLOTĂ INTERNĂ (admin panel) ===
INSERT INTO masini (id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status, listat_pe_site) VALUES
('c1', 'B 123 ABC', 'Dacia', 'Logan', 2021, 'Benzină/GPL', 'Activ', false),
('c2', 'CJ 77 WXY', 'Skoda', 'Octavia', 2019, 'Motorină', 'Activ', false),
('c3', 'TM 99 ZZZ', 'Volkswagen', 'Golf', 2022, 'Electric', 'În Service', false),
('c4', 'IS 05 SMW', 'Ford', 'Focus', 2020, 'Hibrid', 'În Service', false);

-- === MAȘINI PREMIUM PE SITE (nume corectate + 6 noi) ===
INSERT INTO masini (
    id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status,
    categorie, pret, kilometraj, transmisie, imagine_url, descriere, specificatii,
    rata_finantare, listat_pe_site, badge
) VALUES
(
    's1', 'B 00 BMW', 'BMW', '7 Series', 2022, 'Mild Hybrid', 'Activ',
    'Sedan Premium', 34900, 62000, 'Automat',
    'images/luxury_silver_sedan.png',
    'BMW Seria 7 în finisaj argintiu metalizat, echipare completă cu tehnologie mild-hybrid, confort de limuzină și istoric de service verificat.',
    '{"Cai Putere":"394 CP","Transmisie":"Automată 8 trepte","Culoare":"Silver Metallic","Garanție":"12 Luni incluse"}',
    450, true, 'Disponibil'
),
(
    's2', 'B 00 RRV', 'Range Rover', 'Velar', 2023, 'Plug-In Hybrid', 'Activ',
    'SUV Luxury', 62500, 34000, 'Automat',
    'images/dark_metal_suv.png',
    'Range Rover Velar combină designul britanic cu tehnologia Plug-In Hybrid, interior premium și tracțiune integrală inteligentă.',
    '{"Cai Putere":"404 CP","Transmisie":"Automată 8 trepte","Capacitate":"5 Locuri","Garanție":"12 Luni incluse"}',
    790, true, 'Disponibil'
),
(
    's3', 'B 00 AM', 'Aston Martin', 'Valkyrie', 2021, 'Benzină', 'Activ',
    'Sports Premium', 119000, 18500, 'Automat (PDK)',
    'images/grey_sports_car.png',
    'Aston Martin Valkyrie — hypercar de ediție limitată, performanțe extreme și finisaje handcrafted, pentru colecționari exigenți.',
    '{"Cai Putere":"1160 CP","Transmisie":"Automată 7 trepte","0-100 km/h":"2.5 secunde","Garanție":"12 Luni incluse"}',
    1450, true, 'Disponibil'
),
(
    's4', 'B 01 MER', 'Mercedes-Benz', 'S-Class 580', 2023, 'Hibrid', 'Activ',
    'Sedan Premium', 98500, 22000, 'Automat 9G-TRONIC',
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80',
    'Mercedes-Benz S-Class — referința segmentului luxury, cu sistem MBUX Hyperscreen și confort rear executive.',
    '{"Cai Putere":"503 CP","Transmisie":"Automată 9 trepte","Culoare":"Obsidian Black","Garanție":"12 Luni incluse"}',
    1180, true, 'Disponibil'
),
(
    's5', 'B 02 AUD', 'Audi', 'e-tron GT quattro', 2024, 'Electric', 'Activ',
    'Sports Premium', 87500, 12000, 'Automat',
    'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80',
    'Audi e-tron GT — coupe electric de performanță cu design agresiv și autonomie extinsă.',
    '{"Cai Putere":"646 CP","Autonomie":"488 km WLTP","Transmisie":"Automată 2 trepte","Garanție":"12 Luni incluse"}',
    1050, true, 'Disponibil'
),
(
    's6', 'B 03 TSL', 'Tesla', 'Model S Plaid', 2023, 'Electric', 'Activ',
    'Sedan Premium', 79900, 28000, 'Automat',
    'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80',
    'Tesla Model S Plaid — accelerare record, tehnologie Autopilot avansat și interior minimalist premium.',
    '{"Cai Putere":"1020 CP","Autonomie":"600 km WLTP","0-100 km/h":"2.1 secunde","Garanție":"12 Luni incluse"}',
    960, true, 'Disponibil'
),
(
    's7', 'B 04 LAM', 'Lamborghini', 'Urus Performante', 2022, 'Benzină', 'Activ',
    'SUV Luxury', 249000, 15000, 'Automat 8 trepte',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80',
    'Lamborghini Urus Performante — SUV super sport cu motor V8 biturbo și dinamică de supercar.',
    '{"Cai Putere":"666 CP","Transmisie":"Automată 8 trepte","0-100 km/h":"3.3 secunde","Garanție":"12 Luni incluse"}',
    2990, true, 'Disponibil'
),
(
    's8', 'B 05 BEN', 'Bentley', 'Continental GT Speed', 2021, 'Benzină', 'Activ',
    'Sports Premium', 189000, 21000, 'Automat 8 trepte',
    'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=900&q=80',
    'Bentley Continental GT Speed — grand tourer britanic cu finisaje din piele Mulliner și motor W12.',
    '{"Cai Putere":"659 CP","Transmisie":"Automată 8 trepte","Interior":"Piele Beluga","Garanție":"12 Luni incluse"}',
    2270, true, 'Disponibil'
),
(
    's9', 'B 06 LEX', 'Lexus', 'LX 600 Ultra Luxury', 2023, 'Benzină', 'Activ',
    'SUV Luxury', 112000, 19000, 'Automat 10 trepte',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80',
    'Lexus LX 600 Ultra Luxury — SUV flagship cu 7 locuri, confort orient spre off-road premium și fiabilitate legendară.',
    '{"Cai Putere":"409 CP","Transmisie":"Automată 10 trepte","Capacitate":"7 Locuri","Garanție":"12 Luni incluse"}',
    1340, true, 'Disponibil'
);

INSERT INTO soferi (id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id) VALUES
('d1', 'Andrei Ionescu', 'B', '0722123456', '2028-10-12', 'c1'),
('d2', 'Mihai Popescu', 'B, C', '0733987654', '2026-06-15', 'c2'),
('d3', 'Elena Dumitrescu', 'B', '0744112233', '2029-01-20', 'c4'),
('d4', 'Alexandru Radu', 'B', '0755443322', '2026-08-30', 'c3');

INSERT INTO service_entries (id, masina_id, data, descriere, cost, status) VALUES
('s1', 'c3', '2026-05-20', 'Schimb filtre și ulei motor + revizie sistem electric', 850, 'În curs'),
('s2', 'c1', '2026-04-10', 'Înlocuire plăcuțe frână față și lichid de frână', 450, 'Finalizat'),
('s3', 'c2', '2026-03-05', 'Kit distribuție și pompă de apă', 1800, 'Finalizat');

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

INSERT INTO utilizatori (username, parola, rol, driver_id) VALUES
('admin', 'admin123', 'admin', NULL),
('andrei', 'client123', 'client', 'd1'),
('mihai', 'client123', 'client', 'd2'),
('elena', 'client123', 'client', 'd3'),
('alexandru', 'client123', 'client', 'd4');
