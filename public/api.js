// Client API pentru sincronizare cu PostgreSQL via Cloudflare Worker
const FleetAPI = {
  base: '',

  async ping() {
    try {
      const res = await fetch(`${this.base}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async getState() {
    const res = await fetch(`${this.base}/api/state`);
    if (!res.ok) throw new Error('Nu s-au putut încărca datele');
    return res.json();
  },

  async saveState(state) {
    const res = await fetch(`${this.base}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error('Nu s-au putut salva datele');
    return res.json();
  },

  async getPublicCars() {
    const res = await fetch(`${this.base}/api/cars/public`);
    if (!res.ok) throw new Error('Nu s-au putut încărca mașinile');
    return res.json();
  },

  async resetDemo() {
    const res = await fetch(`${this.base}/api/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Reset eșuat');
    return res.json();
  },
};

window.FleetAPI = FleetAPI;
