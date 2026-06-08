import postgres from 'postgres';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function mapCar(row) {
  return {
    id: row.id,
    plateNumber: row.nr_inmatriculare || '',
    brand: row.marca,
    model: row.model,
    year: row.an_fabricatie,
    fuelType: row.tip_combustibil,
    status: row.status,
    category: row.categorie,
    price: row.pret != null ? Number(row.pret) : null,
    mileage: row.kilometraj,
    transmission: row.transmisie,
    imageUrl: row.imagine_url,
    description: row.descriere,
    specs: row.specificatii || {},
    financingMonthly: row.rata_finantare != null ? Number(row.rata_finantare) : null,
    isListed: row.listat_pe_site,
    badge: row.badge,
  };
}

function toDateString(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function mapDriver(row) {
  return {
    id: row.id,
    name: row.nume,
    licenseCategory: row.categorii_permis,
    phone: row.telefon,
    licenseExpiry: toDateString(row.data_expirare_permis),
    assignedCarId: row.masina_alocata_id || '',
  };
}

function mapService(row) {
  return {
    id: row.id,
    carId: row.masina_id,
    date: toDateString(row.data),
    description: row.descriere,
    cost: row.cost != null ? Number(row.cost) : 0,
    status: row.status,
  };
}

function mapInsurance(row) {
  return {
    id: row.id,
    carId: row.masina_id,
    type: row.tip,
    company: row.companie,
    cost: row.cost != null ? Number(row.cost) : 0,
    startDate: toDateString(row.data_start),
    expiryDate: toDateString(row.data_expirare),
  };
}

function mapVignette(row) {
  return {
    id: row.id,
    carId: row.masina_id,
    country: row.tara,
    duration: row.durata,
    startDate: toDateString(row.data_start),
    expiryDate: toDateString(row.data_expirare),
    cost: row.cost != null ? Number(row.cost) : 0,
  };
}

function mapTire(row) {
  return {
    id: row.id,
    carId: row.masina_id,
    season: row.sezon,
    size: row.dimensiune,
    brand: row.marca,
    state: row.stare,
    location: row.locatie,
  };
}

function mapUser(row) {
  return {
    username: row.username,
    parola: row.parola,
    rol: row.rol,
    driverId: row.driver_id || '',
    passkey: row.passkey || '',
  };
}

async function loadState(sql) {
  const [cars, drivers, service, insurances, vignettes, tires, users] = await Promise.all([
    sql`SELECT * FROM masini ORDER BY id`,
    sql`SELECT * FROM soferi ORDER BY id`,
    sql`SELECT * FROM service_entries ORDER BY id`,
    sql`SELECT * FROM asigurari ORDER BY id`,
    sql`SELECT * FROM viniete ORDER BY id`,
    sql`SELECT * FROM anvelope ORDER BY id`,
    sql`SELECT * FROM utilizatori ORDER BY username`,
  ]);

  return {
    cars: cars.map(mapCar),
    drivers: drivers.map(mapDriver),
    service: service.map(mapService),
    insurances: insurances.map(mapInsurance),
    vignettes: vignettes.map(mapVignette),
    tires: tires.map(mapTire),
    users: users.map(mapUser),
  };
}

async function saveState(sql, state) {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM anvelope`;
    await tx`DELETE FROM viniete`;
    await tx`DELETE FROM asigurari`;
    await tx`DELETE FROM service_entries`;
    await tx`DELETE FROM soferi`;
    await tx`DELETE FROM masini`;

    for (const car of state.cars || []) {
      await tx`
        INSERT INTO masini (
          id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status,
          categorie, pret, kilometraj, transmisie, imagine_url, descriere, specificatii,
          rata_finantare, listat_pe_site, badge
        ) VALUES (
          ${car.id}, ${car.plateNumber || null}, ${car.brand}, ${car.model},
          ${car.year || null}, ${car.fuelType || null}, ${car.status || 'Activ'},
          ${car.category || null}, ${car.price ?? null}, ${car.mileage ?? null},
          ${car.transmission || null}, ${car.imageUrl || null}, ${car.description || null},
          ${car.specs || {}}, ${car.financingMonthly ?? null},
          ${car.isListed === true}, ${car.badge || 'Disponibil'}
        )
      `;
    }

    for (const driver of state.drivers || []) {
      await tx`
        INSERT INTO soferi (id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id)
        VALUES (
          ${driver.id}, ${driver.name}, ${driver.licenseCategory || null},
          ${driver.phone || null}, ${driver.licenseExpiry || null},
          ${driver.assignedCarId || null}
        )
      `;
    }

    for (const entry of state.service || []) {
      await tx`
        INSERT INTO service_entries (id, masina_id, data, descriere, cost, status)
        VALUES (
          ${entry.id}, ${entry.carId}, ${entry.date || null},
          ${entry.description || null}, ${entry.cost ?? 0}, ${entry.status || 'În curs'}
        )
      `;
    }

    for (const ins of state.insurances || []) {
      await tx`
        INSERT INTO asigurari (id, masina_id, tip, companie, cost, data_start, data_expirare)
        VALUES (
          ${ins.id}, ${ins.carId}, ${ins.type || null}, ${ins.company || null},
          ${ins.cost ?? 0}, ${ins.startDate || null}, ${ins.expiryDate || null}
        )
      `;
    }

    for (const vig of state.vignettes || []) {
      await tx`
        INSERT INTO viniete (id, masina_id, tara, durata, data_start, data_expirare, cost)
        VALUES (
          ${vig.id}, ${vig.carId}, ${vig.country || null}, ${vig.duration || null},
          ${vig.startDate || null}, ${vig.expiryDate || null}, ${vig.cost ?? 0}
        )
      `;
    }

    for (const tire of state.tires || []) {
      await tx`
        INSERT INTO anvelope (id, masina_id, sezon, dimensiune, marca, stare, locatie)
        VALUES (
          ${tire.id}, ${tire.carId}, ${tire.season || null}, ${tire.size || null},
          ${tire.brand || null}, ${tire.state || null}, ${tire.location || null}
        )
      `;
    }

    await tx`DELETE FROM utilizatori`;
    for (const user of state.users || []) {
      await tx`
        INSERT INTO utilizatori (username, parola, rol, driver_id, passkey)
        VALUES (
          ${user.username}, ${user.parola}, ${user.rol}, ${user.driverId || null}, ${user.passkey || null}
        )
      `;
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (!env.DATABASE_URL) {
      return json({ error: 'DATABASE_URL lipsește din configurare' }, 500);
    }

    const sql = postgres(env.DATABASE_URL, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        await sql`SELECT 1`;
        return json({ ok: true });
      }

      if (url.pathname === '/api/state' && request.method === 'GET') {
        return json(await loadState(sql));
      }

      if (url.pathname === '/api/state' && request.method === 'PUT') {
        const body = await request.json();
        await saveState(sql, body);
        return json({ ok: true });
      }

      if (url.pathname === '/api/cars/public' && request.method === 'GET') {
        const rows = await sql`
          SELECT * FROM masini
          WHERE listat_pe_site = true
          ORDER BY pret ASC NULLS LAST
        `;
        return json(rows.map(mapCar));
      }

      if (url.pathname === '/api/reset' && request.method === 'POST') {
        const seed = await import('./database/seed-data.js');
        await saveState(sql, seed.default);
        return json({ ok: true, message: 'Date demo reinițializate' });
      }

      return json({ error: 'Endpoint negăsit' }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || 'Eroare server' }, 500);
    } finally {
      ctx.waitUntil(sql.end({ timeout: 0 }));
    }
  },
};
