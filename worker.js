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
