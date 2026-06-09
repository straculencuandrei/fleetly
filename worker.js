// worker.js - Fleetly Cloudflare Worker
// Handles /api/* routes via Hyperdrive + PostgreSQL
// Falls through to static HTML assets for everything else

import { Client } from 'pg';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Global CORS preflight handler
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // Route API calls
    if (url.pathname === '/api/login' && request.method === 'POST') {
      return handleLogin(request, env, ctx);
    }

    if (url.pathname === '/api/register' && request.method === 'POST') {
      return handleRegister(request, env, ctx);
    }

    if (url.pathname === '/api/cars/public' && request.method === 'GET') {
      return handleGetPublicCars(request, env, ctx);
    }

    if (url.pathname === '/api/cars/register' && request.method === 'POST') {
      return handleRegisterCar(request, env, ctx);
    }

    // GET /api/cars/all - fetch all cars for the admin panel
    if (url.pathname === '/api/cars/all' && request.method === 'GET') {
      return handleGetAllCars(request, env, ctx);
    }

    // POST /api/cars/delete - delete a car by id
    if (url.pathname === '/api/cars/delete' && request.method === 'POST') {
      return handleDeleteCar(request, env, ctx);
    }

    // POST /api/cars/update - update a car's data/status
    if (url.pathname === '/api/cars/update' && request.method === 'POST') {
      return handleUpdateCar(request, env, ctx);
    }

    // ─────────────────────────────────────────────
    // DRIVERS (SOFERI) ROUTES
    // ─────────────────────────────────────────────
    if (url.pathname === '/api/drivers/all' && request.method === 'GET') {
      return handleGetAllDrivers(request, env, ctx);
    }
    if (url.pathname === '/api/drivers/add' && request.method === 'POST') {
      return handleAddDriver(request, env, ctx);
    }
    if (url.pathname === '/api/drivers/update' && request.method === 'POST') {
      return handleUpdateDriver(request, env, ctx);
    }
    if (url.pathname === '/api/drivers/delete' && request.method === 'POST') {
      return handleDeleteDriver(request, env, ctx);
    }

    // ─────────────────────────────────────────────
    // SERVICE ROUTES
    // ─────────────────────────────────────────────
    if (url.pathname === '/api/service/all' && request.method === 'GET') {
      return handleGetAllService(request, env, ctx);
    }
    if (url.pathname === '/api/service/add' && request.method === 'POST') {
      return handleAddService(request, env, ctx);
    }
    if (url.pathname === '/api/service/update' && request.method === 'POST') {
      return handleUpdateService(request, env, ctx);
    }
    if (url.pathname === '/api/service/delete' && request.method === 'POST') {
      return handleDeleteService(request, env, ctx);
    }

    // ─────────────────────────────────────────────
    // INSURANCES (ASIGURARI) ROUTES
    // ─────────────────────────────────────────────
    if (url.pathname === '/api/insurances/all' && request.method === 'GET') {
      return handleGetAllInsurances(request, env, ctx);
    }
    if (url.pathname === '/api/insurances/add' && request.method === 'POST') {
      return handleAddInsurance(request, env, ctx);
    }
    if (url.pathname === '/api/insurances/update' && request.method === 'POST') {
      return handleUpdateInsurance(request, env, ctx);
    }
    if (url.pathname === '/api/insurances/delete' && request.method === 'POST') {
      return handleDeleteInsurance(request, env, ctx);
    }

    // ─────────────────────────────────────────────
    // VIGNETTES (VINIETE) ROUTES
    // ─────────────────────────────────────────────
    if (url.pathname === '/api/vignettes/all' && request.method === 'GET') {
      return handleGetAllVignettes(request, env, ctx);
    }
    if (url.pathname === '/api/vignettes/add' && request.method === 'POST') {
      return handleAddVignette(request, env, ctx);
    }
    if (url.pathname === '/api/vignettes/update' && request.method === 'POST') {
      return handleUpdateVignette(request, env, ctx);
    }
    if (url.pathname === '/api/vignettes/delete' && request.method === 'POST') {
      return handleDeleteVignette(request, env, ctx);
    }

    // ─────────────────────────────────────────────
    // TIRES (ANVELOPE) ROUTES
    // ─────────────────────────────────────────────
    if (url.pathname === '/api/tires/all' && request.method === 'GET') {
      return handleGetAllTires(request, env, ctx);
    }
    if (url.pathname === '/api/tires/add' && request.method === 'POST') {
      return handleAddTires(request, env, ctx);
    }
    if (url.pathname === '/api/tires/update' && request.method === 'POST') {
      return handleUpdateTires(request, env, ctx);
    }
    if (url.pathname === '/api/tires/delete' && request.method === 'POST') {
      return handleDeleteTires(request, env, ctx);
    }

    // Everything else → serve static assets (HTML, CSS, JS, images)
    return env.ASSETS.fetch(request);
  }
};

// ─────────────────────────────────────────────
// POST /api/login
// Body: { username: string, password: string }
// Returns: { success, rol, driverId } or { success: false, error }
// ─────────────────────────────────────────────
async function handleLogin(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { username, password } = body ?? {};

  if (!username || !password) {
    return jsonResponse({ success: false, error: 'Username and password required' }, 400);
  }

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT id, username, rol, driver_id
       FROM public.fleet_users
       WHERE username = $1 AND password_hash = $2
       LIMIT 1`,
      [username.trim(), password]
    );

    // Close connection in the background after response is sent
    ctx.waitUntil(client.end());

    if (result.rows.length === 0) {
      return jsonResponse({ success: false, error: 'Invalid username or password' }, 401);
    }

    const user = result.rows[0];
    return jsonResponse({
      success: true,
      rol: user.rol,
      driverId: user.driver_id ?? null,
    });

  } catch (err) {
    console.error('DB error:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Database error. Please try again.' }, 500);
  }
}


// ─────────────────────────────────────────────
// POST /api/register
// Body: { username, password, fullName }
// ─────────────────────────────────────────────
async function handleRegister(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { username, password, fullName } = body ?? {};

  if (!username || !password || !fullName) {
    return jsonResponse({ success: false, error: 'Toate campurile sunt obligatorii (utilizator, parola, nume complet)' }, 400);
  }

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // Check if user already exists
    const checkUser = await client.query(
      `SELECT id FROM public.fleet_users WHERE username = $1 LIMIT 1`,
      [username.trim()]
    );

    if (checkUser.rows.length > 0) {
      await client.end();
      return jsonResponse({ success: false, error: 'Acest nume de utilizator este deja folosit' }, 400);
    }

    // Generate driver ID
    const driverId = 'd_' + Math.random().toString(36).substring(2, 11);

    // Try to insert driver details in database if the table exists (fallback if not)
    try {
      const expiryDate = new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await client.query(
        `INSERT INTO public.soferi (id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [driverId, fullName.trim(), 'B', '', expiryDate, null]
      );
    } catch (driverErr) {
      console.warn('Driver table insert skipped or failed:', driverErr.message);
    }

    // Insert new user
    await client.query(
      `INSERT INTO public.fleet_users (username, password_hash, rol, driver_id)
       VALUES ($1, $2, $3, $4)`,
      [username.trim(), password, 'client', driverId]
    );

    ctx.waitUntil(client.end());

    return jsonResponse({
      success: true,
      message: 'Cont creat cu succes'
    });

  } catch (err) {
    console.error('DB error during registration:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}


// ─────────────────────────────────────────────
// GET /api/cars/public
// ─────────────────────────────────────────────
async function handleGetPublicCars(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT * FROM public.masini
       WHERE listat_pe_site = true
       ORDER BY pret ASC NULLS LAST`
    );

    ctx.waitUntil(client.end());

    const mapped = result.rows.map(row => ({
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
      specs: typeof row.specificatii === 'string' ? JSON.parse(row.specificatii) : (row.specificatii || {}),
      financingMonthly: row.rata_finantare != null ? Number(row.rata_finantare) : null,
      isListed: row.listat_pe_site,
      badge: row.badge,
    }));

    return jsonResponse(mapped);

  } catch (err) {
    console.error('DB error during getPublicCars:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}


// ─────────────────────────────────────────────
// POST /api/cars/register
// Body: { plateNumber, brand, model, year, fuelType, driverId }
// ─────────────────────────────────────────────
async function handleRegisterCar(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { plateNumber, brand, model, year, fuelType, driverId, status } = body ?? {};

  if (!plateNumber || !brand || !model || !year || !fuelType) {
    return jsonResponse({ success: false, error: 'Toate campurile sunt obligatorii (numar inmatriculare, marca, model, an, combustibil)' }, 400);
  }

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // Check if plate number already exists
    const checkPlate = await client.query(
      `SELECT id FROM public.masini WHERE nr_inmatriculare = $1 LIMIT 1`,
      [plateNumber.trim().toUpperCase()]
    );

    if (checkPlate.rows.length > 0) {
      await client.end();
      return jsonResponse({ success: false, error: 'O masina cu acest numar de inmatriculare este deja inregistrata' }, 400);
    }

    const carId = 'c_' + Math.random().toString(36).substring(2, 11);

    // Insert new car
    await client.query(
      `INSERT INTO public.masini (id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status, listat_pe_site)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [carId, plateNumber.trim().toUpperCase(), brand.trim(), model.trim(), Number(year), fuelType, status || 'Activ', true]
    );

    // Link car to the driver/client if driverId is provided
    if (driverId) {
      await client.query(
        `UPDATE public.soferi SET masina_alocata_id = $1 WHERE id = $2`,
        [carId, driverId]
      );
    }

    ctx.waitUntil(client.end());

    return jsonResponse({
      success: true,
      message: 'Masina a fost inregistrata cu succes in baza de date!',
      car: {
        id: carId,
        plateNumber: plateNumber.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year),
        fuelType,
        status: 'Activ'
      }
    });

  } catch (err) {
    console.error('DB error during car registration:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// GET /api/cars/all
// Returns all cars (id, plate, brand, model, year, fuel, status)
// ─────────────────────────────────────────────
async function handleGetAllCars(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, nr_inmatriculare, marca, model, an_fabricatie, tip_combustibil, status
       FROM public.masini
       ORDER BY id DESC`
    );
    ctx.waitUntil(client.end());

    return jsonResponse(result.rows.map(row => ({
      id: row.id,
      plateNumber: row.nr_inmatriculare || '',
      brand: row.marca,
      model: row.model,
      year: row.an_fabricatie,
      fuelType: row.tip_combustibil,
      status: row.status || 'Activ',
    })));

  } catch (err) {
    console.error('DB error during getAllCars:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}


// ─────────────────────────────────────────────
// POST /api/cars/delete
// Body: { id }
// ─────────────────────────────────────────────
async function handleDeleteCar(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { id } = body ?? {};
  if (!id) return jsonResponse({ success: false, error: 'ID-ul masinii este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    // Deconectam soferii asociati
    await client.query(
      `UPDATE public.soferi SET masina_alocata_id = NULL WHERE masina_alocata_id = $1`,
      [id]
    );
    // Stergem masina
    const result = await client.query(`DELETE FROM public.masini WHERE id = $1`, [id]);
    ctx.waitUntil(client.end());

    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Masina nu a fost gasita in baza de date' }, 404);
    }
    return jsonResponse({ success: true, message: 'Masina a fost stearsa cu succes' });

  } catch (err) {
    console.error('DB error during deleteCar:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}


// ─────────────────────────────────────────────
// POST /api/cars/update
// Body: { id, plateNumber, brand, model, year, fuelType, status }
// ─────────────────────────────────────────────
async function handleUpdateCar(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { id, plateNumber, brand, model, year, fuelType, status } = body ?? {};
  if (!id || !plateNumber || !brand || !model || !year || !fuelType) {
    return jsonResponse({ success: false, error: 'Campuri obligatorii lipsa' }, 400);
  }

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(
      `UPDATE public.masini
       SET nr_inmatriculare = $2, marca = $3, model = $4,
           an_fabricatie = $5, tip_combustibil = $6, status = $7
       WHERE id = $1`,
      [id, plateNumber.trim().toUpperCase(), brand.trim(), model.trim(), Number(year), fuelType, status || 'Activ']
    );
    ctx.waitUntil(client.end());

    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Masina nu a fost gasita in baza de date' }, 404);
    }
    return jsonResponse({ success: true, message: 'Masina a fost actualizata cu succes' });

  } catch (err) {
    console.error('DB error during updateCar:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// SOFERI (DRIVERS) CRUD HANDLERS
// ─────────────────────────────────────────────
async function handleGetAllDrivers(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id
       FROM public.soferi
       ORDER BY nume ASC`
    );
    ctx.waitUntil(client.end());
    return jsonResponse(result.rows.map(row => ({
      id: row.id,
      name: row.nume,
      licenseCategory: row.categorii_permis || '',
      phone: row.telefon || '',
      licenseExpiry: formatDate(row.data_expirare_permis),
      assignedCarId: row.masina_alocata_id || null
    })));
  } catch (err) {
    console.error('DB error during getAllDrivers:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}

async function handleAddDriver(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { name, licenseCategory, phone, licenseExpiry, assignedCarId } = body ?? {};
  if (!name) return jsonResponse({ success: false, error: 'Numele soferului este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const driverId = 'd_' + Math.random().toString(36).substring(2, 11);
    await client.query(
      `INSERT INTO public.soferi (id, nume, categorii_permis, telefon, data_expirare_permis, masina_alocata_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [driverId, name.trim(), licenseCategory || '', phone || '', licenseExpiry || null, assignedCarId || null]
    );
    ctx.waitUntil(client.end());
    return jsonResponse({
      success: true,
      message: 'Sofer adaugat cu succes',
      driver: { id: driverId, name, licenseCategory, phone, licenseExpiry, assignedCarId }
    });
  } catch (err) {
    console.error('DB error during addDriver:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleUpdateDriver(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id, name, licenseCategory, phone, licenseExpiry, assignedCarId } = body ?? {};
  if (!id || !name) return jsonResponse({ success: false, error: 'ID si Nume sunt campuri obligatorii' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE public.soferi
       SET nume = $2, categorii_permis = $3, telefon = $4, data_expirare_permis = $5, masina_alocata_id = $6
       WHERE id = $1`,
      [id, name.trim(), licenseCategory || '', phone || '', licenseExpiry || null, assignedCarId || null]
    );
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Soferul nu a fost gasit in baza de date' }, 404);
    }
    return jsonResponse({ success: true, message: 'Sofer actualizat cu succes' });
  } catch (err) {
    console.error('DB error during updateDriver:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleDeleteDriver(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id } = body ?? {};
  if (!id) return jsonResponse({ success: false, error: 'ID-ul soferului este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    // Stergem referinta din fleet_users daca exista
    await client.query(`UPDATE public.fleet_users SET driver_id = NULL WHERE driver_id = $1`, [id]);
    const result = await client.query(`DELETE FROM public.soferi WHERE id = $1`, [id]);
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Soferul nu a fost gasit in baza de date' }, 404);
    }
    return jsonResponse({ success: true, message: 'Sofer sters cu succes' });
  } catch (err) {
    console.error('DB error during deleteDriver:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// SERVICE CRUD HANDLERS
// ─────────────────────────────────────────────
async function handleGetAllService(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, masina_id, data, descriere, cost, status
       FROM public.service
       ORDER BY data DESC`
    );
    ctx.waitUntil(client.end());
    return jsonResponse(result.rows.map(row => ({
      id: row.id,
      carId: row.masina_id,
      date: formatDate(row.data),
      description: row.descriere || '',
      cost: row.cost != null ? Number(row.cost) : null,
      status: row.status || 'În curs'
    })));
  } catch (err) {
    console.error('DB error during getAllService:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}

async function handleAddService(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { carId, date, description, cost, status } = body ?? {};
  if (!carId || !date) return jsonResponse({ success: false, error: 'Masina si Data sunt obligatorii' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const serviceId = 's_' + Math.random().toString(36).substring(2, 11);
    await client.query(
      `INSERT INTO public.service (id, masina_id, data, descriere, cost, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [serviceId, carId, date, description || '', cost != null ? Number(cost) : null, status || 'În curs']
    );
    ctx.waitUntil(client.end());
    return jsonResponse({
      success: true,
      message: 'Fisa service adaugata cu succes',
      service: { id: serviceId, carId, date, description, cost, status }
    });
  } catch (err) {
    console.error('DB error during addService:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleUpdateService(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id, carId, date, description, cost, status } = body ?? {};
  if (!id || !carId || !date) return jsonResponse({ success: false, error: 'Campuri obligatorii lipsa' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE public.service
       SET masina_id = $2, data = $3, descriere = $4, cost = $5, status = $6
       WHERE id = $1`,
      [id, carId, date, description || '', cost != null ? Number(cost) : null, status || 'În curs']
    );
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Inregistrarea nu a fost gasita' }, 404);
    }
    return jsonResponse({ success: true, message: 'Fisa service actualizata cu succes' });
  } catch (err) {
    console.error('DB error during updateService:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleDeleteService(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id } = body ?? {};
  if (!id) return jsonResponse({ success: false, error: 'ID-ul inregistrarii este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(`DELETE FROM public.service WHERE id = $1`, [id]);
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Fisa service nu a fost gasita' }, 404);
    }
    return jsonResponse({ success: true, message: 'Fisa service stearsa cu succes' });
  } catch (err) {
    console.error('DB error during deleteService:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// INSURANCES (ASIGURARI) CRUD HANDLERS
// ─────────────────────────────────────────────
async function handleGetAllInsurances(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, masina_id, tip, companie, cost, data_inceput, data_expirare
       FROM public.asigurari
       ORDER BY data_expirare ASC`
    );
    ctx.waitUntil(client.end());
    return jsonResponse(result.rows.map(row => ({
      id: row.id,
      carId: row.masina_id,
      type: row.tip || '',
      company: row.companie || '',
      cost: row.cost != null ? Number(row.cost) : null,
      startDate: formatDate(row.data_inceput),
      expiryDate: formatDate(row.data_expirare)
    })));
  } catch (err) {
    console.error('DB error during getAllInsurances:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}

async function handleAddInsurance(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { carId, type, company, cost, startDate, expiryDate } = body ?? {};
  if (!carId || !type || !expiryDate) return jsonResponse({ success: false, error: 'Masina, Tipul si Data Expirarii sunt obligatorii' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const insId = 'i_' + Math.random().toString(36).substring(2, 11);
    await client.query(
      `INSERT INTO public.asigurari (id, masina_id, tip, companie, cost, data_inceput, data_expirare)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [insId, carId, type, company || '', cost != null ? Number(cost) : null, startDate || null, expiryDate]
    );
    ctx.waitUntil(client.end());
    return jsonResponse({
      success: true,
      message: 'Asigurare adaugata cu succes',
      insurance: { id: insId, carId, type, company, cost, startDate, expiryDate }
    });
  } catch (err) {
    console.error('DB error during addInsurance:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleUpdateInsurance(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id, carId, type, company, cost, startDate, expiryDate } = body ?? {};
  if (!id || !carId || !type || !expiryDate) return jsonResponse({ success: false, error: 'Campuri obligatorii lipsa' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE public.asigurari
       SET masina_id = $2, tip = $3, companie = $4, cost = $5, data_inceput = $6, data_expirare = $7
       WHERE id = $1`,
      [id, carId, type, company || '', cost != null ? Number(cost) : null, startDate || null, expiryDate]
    );
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Asigurarea nu a fost gasita' }, 404);
    }
    return jsonResponse({ success: true, message: 'Asigurare actualizata cu succes' });
  } catch (err) {
    console.error('DB error during updateInsurance:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleDeleteInsurance(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id } = body ?? {};
  if (!id) return jsonResponse({ success: false, error: 'ID-ul asigurarii este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(`DELETE FROM public.asigurari WHERE id = $1`, [id]);
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Asigurarea nu a fost gasita' }, 404);
    }
    return jsonResponse({ success: true, message: 'Asigurare stearsa cu succes' });
  } catch (err) {
    console.error('DB error during deleteInsurance:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// VIGNETTES (VINIETE) CRUD HANDLERS
// ─────────────────────────────────────────────
async function handleGetAllVignettes(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, masina_id, tara, durata, data_inceput, data_expirare, cost
       FROM public.viniete
       ORDER BY data_expirare ASC`
    );
    ctx.waitUntil(client.end());
    return jsonResponse(result.rows.map(row => ({
      id: row.id,
      carId: row.masina_id,
      country: row.tara || '',
      duration: row.durata || '',
      startDate: formatDate(row.data_inceput),
      expiryDate: formatDate(row.data_expirare),
      cost: row.cost != null ? Number(row.cost) : null
    })));
  } catch (err) {
    console.error('DB error during getAllVignettes:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}

async function handleAddVignette(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { carId, country, duration, startDate, expiryDate, cost } = body ?? {};
  if (!carId || !country || !expiryDate) return jsonResponse({ success: false, error: 'Masina, Tara si Data Expirarii sunt obligatorii' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const vigId = 'v_' + Math.random().toString(36).substring(2, 11);
    await client.query(
      `INSERT INTO public.viniete (id, masina_id, tara, durata, data_inceput, data_expirare, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [vigId, carId, country, duration || '', startDate || null, expiryDate, cost != null ? Number(cost) : null]
    );
    ctx.waitUntil(client.end());
    return jsonResponse({
      success: true,
      message: 'Vinieta adaugata cu succes',
      vignette: { id: vigId, carId, country, duration, startDate, expiryDate, cost }
    });
  } catch (err) {
    console.error('DB error during addVignette:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleUpdateVignette(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id, carId, country, duration, startDate, expiryDate, cost } = body ?? {};
  if (!id || !carId || !country || !expiryDate) return jsonResponse({ success: false, error: 'Campuri obligatorii lipsa' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE public.viniete
       SET masina_id = $2, tara = $3, durata = $4, data_inceput = $5, data_expirare = $6, cost = $7
       WHERE id = $1`,
      [id, carId, country, duration || '', startDate || null, expiryDate, cost != null ? Number(cost) : null]
    );
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Vinieta nu a fost gasita' }, 404);
    }
    return jsonResponse({ success: true, message: 'Vinieta actualizata cu succes' });
  } catch (err) {
    console.error('DB error during updateVignette:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleDeleteVignette(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id } = body ?? {};
  if (!id) return jsonResponse({ success: false, error: 'ID-ul vinietei este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(`DELETE FROM public.viniete WHERE id = $1`, [id]);
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Vinieta nu a fost gasita' }, 404);
    }
    return jsonResponse({ success: true, message: 'Vinieta stearsa cu succes' });
  } catch (err) {
    console.error('DB error during deleteVignette:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// TIRES (ANVELOPE) CRUD HANDLERS
// ─────────────────────────────────────────────
async function handleGetAllTires(request, env, ctx) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, masina_id, sezon, dimensiune, marca, stare, locatie
       FROM public.anvelope
       ORDER BY id DESC`
    );
    ctx.waitUntil(client.end());
    return jsonResponse(result.rows.map(row => ({
      id: row.id,
      carId: row.masina_id,
      season: row.sezon || '',
      size: row.dimensiune || '',
      brand: row.marca || '',
      state: row.stare || '',
      location: row.locatie || ''
    })));
  } catch (err) {
    console.error('DB error during getAllTires:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ error: 'Database error: ' + err.message }, 500);
  }
}

async function handleAddTires(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { carId, season, size, brand, state, location } = body ?? {};
  if (!carId || !season) return jsonResponse({ success: false, error: 'Masina si Sezonul sunt obligatorii' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const tireId = 't_' + Math.random().toString(36).substring(2, 11);
    await client.query(
      `INSERT INTO public.anvelope (id, masina_id, sezon, dimensiune, marca, stare, locatie)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tireId, carId, season, size || '', brand || '', state || '', location || '']
    );
    ctx.waitUntil(client.end());
    return jsonResponse({
      success: true,
      message: 'Set anvelope adaugat cu succes',
      tires: { id: tireId, carId, season, size, brand, state, location }
    });
  } catch (err) {
    console.error('DB error during addTires:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleUpdateTires(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id, carId, season, size, brand, state, location } = body ?? {};
  if (!id || !carId || !season) return jsonResponse({ success: false, error: 'Campuri obligatorii lipsa' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE public.anvelope
       SET masina_id = $2, sezon = $3, dimensiune = $4, marca = $5, stare = $6, locatie = $7
       WHERE id = $1`,
      [id, carId, season, size || '', brand || '', state || '', location || '']
    );
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Setul de anvelope nu a fost gasit' }, 404);
    }
    return jsonResponse({ success: true, message: 'Set anvelope actualizat cu succes' });
  } catch (err) {
    console.error('DB error during updateTires:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

async function handleDeleteTires(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const { id } = body ?? {};
  if (!id) return jsonResponse({ success: false, error: 'ID-ul setului de anvelope este obligatoriu' }, 400);

  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(`DELETE FROM public.anvelope WHERE id = $1`, [id]);
    ctx.waitUntil(client.end());
    if (result.rowCount === 0) {
      return jsonResponse({ success: false, error: 'Setul de anvelope nu a fost gasit' }, 404);
    }
    return jsonResponse({ success: true, message: 'Set anvelope sters cu succes' });
  } catch (err) {
    console.error('DB error during deleteTires:', err.message);
    ctx.waitUntil(client.end().catch(() => { }));
    return jsonResponse({ success: false, error: 'Eroare baza de date: ' + err.message }, 500);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDate(d) {
  if (!d) return null;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return d;
  return dateObj.toISOString().split('T')[0];
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
