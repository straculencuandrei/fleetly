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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
