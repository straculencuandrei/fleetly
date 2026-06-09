const { Client } = require('pg');

const connectionString = 'postgresql://fleetlydb_user:g73UAbx9iAKDQPSgFsVpp2BDlejFsBoS@dpg-d8jf7kcm0tmc73ch14pg-a.virginia-postgres.render.com:5432/fleetlydb?sslmode=require';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const schemaQueries = [
  // masini
  `CREATE TABLE IF NOT EXISTS public.masini (
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
      specificatii TEXT,
      rata_finantare NUMERIC,
      listat_pe_site BOOLEAN DEFAULT TRUE,
      badge VARCHAR(50)
  );`,

  // soferi
  `CREATE TABLE IF NOT EXISTS public.soferi (
      id VARCHAR(50) PRIMARY KEY,
      nume VARCHAR(100) NOT NULL,
      categorii_permis VARCHAR(30),
      telefon VARCHAR(30),
      data_expirare_permis DATE,
      masina_alocata_id VARCHAR(50) REFERENCES public.masini(id) ON DELETE SET NULL
  );`,

  // fleet_users
  `CREATE TABLE IF NOT EXISTS public.fleet_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(100) NOT NULL,
      rol VARCHAR(20) NOT NULL DEFAULT 'client',
      driver_id VARCHAR(50) REFERENCES public.soferi(id) ON DELETE SET NULL
  );`,

  // service
  `CREATE TABLE IF NOT EXISTS public.service (
      id VARCHAR(50) PRIMARY KEY,
      masina_id VARCHAR(50) REFERENCES public.masini(id) ON DELETE CASCADE,
      data DATE,
      descriere TEXT,
      cost NUMERIC,
      status VARCHAR(30) DEFAULT 'În curs'
  );`,

  // asigurari
  `CREATE TABLE IF NOT EXISTS public.asigurari (
      id VARCHAR(50) PRIMARY KEY,
      masina_id VARCHAR(50) REFERENCES public.masini(id) ON DELETE CASCADE,
      tip VARCHAR(50),
      companie VARCHAR(100),
      cost NUMERIC,
      data_inceput DATE,
      data_expirare DATE
  );`,

  // viniete
  `CREATE TABLE IF NOT EXISTS public.viniete (
      id VARCHAR(50) PRIMARY KEY,
      masina_id VARCHAR(50) REFERENCES public.masini(id) ON DELETE CASCADE,
      tara VARCHAR(50),
      durata VARCHAR(50),
      data_inceput DATE,
      data_expirare DATE,
      cost NUMERIC
  );`,

  // anvelope
  `CREATE TABLE IF NOT EXISTS public.anvelope (
      id VARCHAR(50) PRIMARY KEY,
      masina_id VARCHAR(50) REFERENCES public.masini(id) ON DELETE CASCADE,
      sezon VARCHAR(50),
      dimensiune VARCHAR(50),
      marca VARCHAR(100),
      stare VARCHAR(50),
      locatie VARCHAR(100)
  );`
];

const initialUsers = [
    { username: "admin", parola: "admin123", rol: "admin", driverId: null },
    { username: "andrei", parola: "client123", rol: "client", driverId: "d1" },
    { username: "mihai", parola: "client123", rol: "client", driverId: "d2" },
    { username: "elena", parola: "client123", rol: "client", driverId: "d3" },
    { username: "alexandru", parola: "client123", rol: "client", driverId: "d4" }
];
const initialCars = [
    { id: "c1", plateNumber: "B 123 ABC", brand: "Dacia", model: "Logan", fuelType: "Benzină/GPL", year: 2021, status: "Activ" },
    { id: "c2", plateNumber: "CJ 77 WXY", brand: "Skoda", model: "Octavia", fuelType: "Motorină", year: 2019, status: "Activ" },
    { id: "c3", plateNumber: "TM 99 ZZZ", brand: "Volkswagen", model: "Golf", fuelType: "Electric", year: 2022, status: "În Service" },
    { id: "c4", plateNumber: "IS 05 SMW", brand: "Ford", model: "Focus", fuelType: "Hibrid", year: 2020, status: "Activ" }
];

const initialDrivers = [
    { id: "d1", name: "Andrei Ionescu", licenseCategory: "B", phone: "0722123456", licenseExpiry: "2028-10-12", assignedCarId: "c1" },
    { id: "d2", name: "Mihai Popescu", licenseCategory: "B, C", phone: "0733987654", licenseExpiry: "2026-06-15", assignedCarId: "c2" },
    { id: "d3", name: "Elena Dumitrescu", licenseCategory: "B", phone: "0744112233", licenseExpiry: "2029-01-20", assignedCarId: "c4" },
    { id: "d4", name: "Alexandru Radu", licenseCategory: "B", phone: "0755443322", licenseExpiry: "2026-08-30", assignedCarId: "c3" }
];

const initialService = [
    { id: "s1", carId: "c3", date: "2026-05-20", description: "Schimb filtre și ulei motor + revizie sistem electric", cost: 850, status: "În curs" },
    { id: "s2", carId: "c1", date: "2026-04-10", description: "Înlocuire plăcuțe frână față și lichid de frână", cost: 450, status: "Finalizat" },
    { id: "s3", carId: "c2", date: "2026-03-05", description: "Kit distribuție și pompă de apă", cost: 1800, status: "Finalizat" }
];

const initialInsurances = [
    { id: "i1", carId: "c1", type: "RCA", company: "Euroins", cost: 1200, startDate: "2025-06-01", expiryDate: "2026-06-01" },
    { id: "i2", carId: "c2", type: "CASCO", company: "Omniasig", cost: 3400, startDate: "2025-09-15", expiryDate: "2026-09-15" },
    { id: "i3", carId: "c3", type: "RCA", company: "Groupama", cost: 950, startDate: "2026-01-10", expiryDate: "2027-01-10" },
    { id: "i4", carId: "c4", type: "RCA", company: "Allianz Direct", cost: 1100, startDate: "2026-05-25", expiryDate: "2026-06-25" }
];

const initialVignettes = [
    { id: "v1", carId: "c1", country: "România", duration: "1 An", startDate: "2025-08-01", expiryDate: "2026-08-01", cost: 140 },
    { id: "v2", carId: "c2", country: "România", duration: "1 An", startDate: "2025-11-20", expiryDate: "2026-11-20", cost: 140 },
    { id: "v3", carId: "c3", country: "Ungaria", duration: "10 Zile", startDate: "2026-05-24", expiryDate: "2026-06-03", cost: 80 },
    { id: "v4", carId: "c4", country: "România", duration: "30 Zile", startDate: "2026-04-28", expiryDate: "2026-05-28", cost: 35 }
];

const initialTires = [
    { id: "t1", carId: "c1", season: "Vară", size: "185/65 R15", brand: "Michelin", state: "Excelent", location: "Pe mașină" },
    { id: "t2", carId: "c1", season: "Iarnă", size: "185/65 R15", brand: "Continental", state: "Uzat", location: "Depozit" },
    { id: "t3", carId: "c2", season: "All-Season", size: "205/55 R16", brand: "Bridgestone", state: "Bun", location: "Pe mașină" },
    { id: "t4", carId: "c3", season: "Vară", size: "195/65 R15", brand: "Hankook", state: "Nou", location: "Pe mașină" },
    { id: "t5", carId: "c4", season: "Iarnă", size: "205/55 R16", brand: "Nokian", state: "Excelent", location: "Pe mașină" }
];

async function main() {
  try {
    await client.connect();
    console.log('Conectat la PostgreSQL.');

    for (const q of schemaQueries) {
      await client.query(q);
    }
    console.log('Toate tabelele au fost create sau verificate cu succes!');

    // Seed Cars
    console.log('Seeding cars...');
    for (const car of initialCars) {
      await client.query(
        `INSERT INTO public.masini (id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [car.id, car.plateNumber, car.brand, car.model, car.year, car.fuelType, car.status]
      );
    }

    // Seed Drivers
    console.log('Seeding drivers...');
    for (const driver of initialDrivers) {
      // Check if referenced car exists. If not, set assignedCarId = null
      let carExists = false;
      if (driver.assignedCarId) {
        const carRes = await client.query('SELECT id FROM public.masini WHERE id = $1', [driver.assignedCarId]);
        if (carRes.rows.length > 0) {
          carExists = true;
        }
      }
      const carIdToInsert = carExists ? driver.assignedCarId : null;

      await client.query(
        `INSERT INTO public.soferi (id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [driver.id, driver.name, driver.licenseCategory, driver.phone, driver.licenseExpiry, carIdToInsert]
      );
    }

    // Seed Users
    console.log('Seeding users...');
    for (const u of initialUsers) {
      let driverExists = false;
      if (u.driverId) {
        const drRes = await client.query('SELECT id FROM public.soferi WHERE id = $1', [u.driverId]);
        if (drRes.rows.length > 0) {
          driverExists = true;
        }
      }
      const drIdToInsert = driverExists ? u.driverId : null;

      await client.query(
        `INSERT INTO public.fleet_users (username, password_hash, rol, driver_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO NOTHING`,
        [u.username, u.parola, u.rol, drIdToInsert]
      );
    }

    // Seed Service
    console.log('Seeding service records...');
    for (const s of initialService) {
      let carExists = false;
      if (s.carId) {
        const carRes = await client.query('SELECT id FROM public.masini WHERE id = $1', [s.carId]);
        if (carRes.rows.length > 0) carExists = true;
      }
      if (!carExists) continue;

      await client.query(
        `INSERT INTO public.service (id, masina_id, data, descriere, cost, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.carId, s.date, s.description, s.cost, s.status]
      );
    }

    // Seed Insurances
    console.log('Seeding insurances...');
    for (const ins of initialInsurances) {
      let carExists = false;
      if (ins.carId) {
        const carRes = await client.query('SELECT id FROM public.masini WHERE id = $1', [ins.carId]);
        if (carRes.rows.length > 0) carExists = true;
      }
      if (!carExists) continue;

      await client.query(
        `INSERT INTO public.asigurari (id, masina_id, tip, companie, cost, data_inceput, data_expirare)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [ins.id, ins.carId, ins.type, ins.company, ins.cost, ins.startDate, ins.expiryDate]
      );
    }

    // Seed Vignettes
    console.log('Seeding vignettes...');
    for (const v of initialVignettes) {
      let carExists = false;
      if (v.carId) {
        const carRes = await client.query('SELECT id FROM public.masini WHERE id = $1', [v.carId]);
        if (carRes.rows.length > 0) carExists = true;
      }
      if (!carExists) continue;

      await client.query(
        `INSERT INTO public.viniete (id, masina_id, tara, durata, data_inceput, data_expirare, cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [v.id, v.carId, v.country, v.duration, v.startDate, v.expiryDate, v.cost]
      );
    }

    // Seed Tires
    console.log('Seeding tires...');
    for (const t of initialTires) {
      let carExists = false;
      if (t.carId) {
        const carRes = await client.query('SELECT id FROM public.masini WHERE id = $1', [t.carId]);
        if (carRes.rows.length > 0) carExists = true;
      }
      if (!carExists) continue;

      await client.query(
        `INSERT INTO public.anvelope (id, masina_id, sezon, dimensiune, marca, stare, locatie)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.carId, t.season, t.size, t.brand, t.stare, t.locatie]
      );
    }

    console.log('Seeding finalizat cu succes!');
  } catch (err) {
    console.error('Eroare:', err.message);
  } finally {
    await client.end();
  }
}

main();
