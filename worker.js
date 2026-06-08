// worker.js - Fleetly Cloudflare Worker
// Handles /api/* routes via Hyperdrive + PostgreSQL
// Falls through to static HTML assets for everything else

import { Client } from 'pg';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route API calls
    if (url.pathname === '/api/login' && request.method === 'POST') {
      return handleLogin(request, env, ctx);
    }

    if (url.pathname === '/api/login' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    if (url.pathname === '/api/register' && request.method === 'POST') {
      return handleRegister(request, env, ctx);
    }

    if (url.pathname === '/api/register' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    if (url.pathname === '/api/cars/public' && request.method === 'GET') {
      return handleGetPublicCars(request, env, ctx);
    }

    if (url.pathname === '/api/cars/public' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    if (url.pathname === '/api/cars/register' && request.method === 'POST') {
      return handleRegisterCar(request, env, ctx);
    }

    if (url.pathname === '/api/cars/register' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // GET /api/cars/all - fetch all cars for the admin panel
    if (url.pathname === '/api/cars/all' && request.method === 'GET') {
      return handleGetAllCars(request, env, ctx);
    }
    if (url.pathname === '/api/cars/all' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // POST /api/cars/delete - delete a car by id
    if (url.pathname === '/api/cars/delete' && request.method === 'POST') {
      return handleDeleteCar(request, env, ctx);
    }
    if (url.pathname === '/api/cars/delete' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // POST /api/cars/update - update a car's data/status
    if (url.pathname === '/api/cars/update' && request.method === 'POST') {
      return handleUpdateCar(request, env, ctx);
    }
    if (url.pathname === '/api/cars/update' && request.method === 'OPTIONS') {
      return corsPreflightResponse();
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
// Helpers
// ─────────────────────────────────────────────
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
