// Încarcă și afișează mașinile de pe site din baza de date
let publicCars = [];
let publicCarDatabase = {};

function formatPrice(price) {
  return Number(price).toLocaleString('ro-RO') + ' €';
}

function formatMileage(km) {
  return Number(km).toLocaleString('ro-RO') + ' km';
}

function carDisplayName(car) {
  return `${car.brand} ${car.model}`;
}

function fuelIcon(fuel) {
  if (!fuel) return 'fa-solid fa-gas-pump';
  const f = fuel.toLowerCase();
  if (f.includes('electric')) return 'fa-solid fa-bolt';
  if (f.includes('hybrid') || f.includes('hibrid')) return 'fa-solid fa-leaf';
  return 'fa-solid fa-fire-flame-simple';
}

function buildCarCard(car) {
  const name = carDisplayName(car);
  const card = document.createElement('div');
  card.className = 'car-card';
  card.dataset.brand = name;
  card.dataset.category = car.category || '';
  card.dataset.fuel = car.fuelType || '';
  card.dataset.price = car.price || '';
  card.dataset.carId = car.id;

  card.innerHTML = `
    <div class="car-img-wrapper">
      <span class="car-badge available">${car.badge || 'Disponibil'}</span>
      <img src="${car.imageUrl || 'images/luxury_silver_sedan.png'}" alt="${name}">
    </div>
    <div class="car-content">
      <div class="car-header">
        <div>
          <h3 class="car-title">${name}</h3>
          <span class="car-category">${car.category || ''}</span>
        </div>
        <div class="car-price-block">
          <span class="car-price">${formatPrice(car.price)}</span>
          <div class="car-price-period">TVA inclus</div>
        </div>
      </div>
      <div class="car-specs">
        <div class="spec-info"><i class="fa-solid fa-calendar"></i> ${car.year || '-'}</div>
        <div class="spec-info"><i class="fa-solid fa-gauge"></i> ${car.mileage ? formatMileage(car.mileage) : '-'}</div>
        <div class="spec-info"><i class="fa-solid fa-gears"></i> ${car.transmission || 'Automat'}</div>
        <div class="spec-info"><i class="${fuelIcon(car.fuelType)}"></i> ${car.fuelType || '-'}</div>
      </div>
      <div class="car-footer">
        <div class="car-financing">
          Finanțare estimată:
          <strong>de la ${car.financingMonthly ? formatPrice(car.financingMonthly).replace(' €', '') : '-'} € / lună</strong>
        </div>
        <button class="btn btn-accent" type="button" data-car-id="${car.id}">Detalii &amp; Test Drive</button>
      </div>
    </div>
  `;

  card.querySelector('button').addEventListener('click', () => showCarDetails(car.id));
  return card;
}

function renderPublicCars(containerId, countId) {
  const container = document.getElementById(containerId);
  const countEl = document.getElementById(countId);
  if (!container) return;

  container.querySelectorAll('.car-card').forEach((el) => el.remove());

  publicCars.forEach((car) => {
    container.insertBefore(buildCarCard(car), document.getElementById('no-results'));
  });

  const totalEl = document.getElementById('car-count-total');
  if (countEl) countEl.textContent = String(publicCars.length);
  if (totalEl) totalEl.textContent = String(publicCars.length);

  const noResults = document.getElementById('no-results');
  if (noResults) {
    noResults.style.display = publicCars.length === 0 ? 'block' : 'none';
  }
}

function showCarDetails(carId) {
  const car = publicCarDatabase[carId];
  if (!car) return;

  const title = carDisplayName(car);
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-desc').innerText = car.description || '';
  document.getElementById('modal-img').src = car.imageUrl || '';
  document.getElementById('inquiry-car-name').value = title;

  const specsContainer = document.getElementById('modal-specs');
  specsContainer.innerHTML = '';

  const specs = {
    'An Fabricație': car.year,
    Kilometraj: car.mileage ? formatMileage(car.mileage) : '-',
    Combustibil: car.fuelType,
    Transmisie: car.transmission,
    ...(car.specs || {}),
  };

  for (const [label, val] of Object.entries(specs)) {
    if (val == null || val === '') continue;
    const row = document.createElement('div');
    row.className = 'modal-spec-row';
    row.innerHTML = `<span>${label}</span><span>${val}</span>`;
    specsContainer.appendChild(row);
  }

  document.getElementById('car-modal').classList.add('active');
}

function getFallbackCars() {
  return window.FLEET_PUBLIC_FALLBACK || [];
}

async function initPublicCars(containerId, countId) {
  publicCars = [];

  try {
    if (window.FleetAPI && await FleetAPI.ping()) {
      const fromApi = await FleetAPI.getPublicCars();
      if (Array.isArray(fromApi) && fromApi.length > 0) {
        publicCars = fromApi;
      }
    }
  } catch (e) {
    console.warn('API indisponibil, folosesc date locale', e);
  }

  if (!publicCars.length) {
    publicCars = getFallbackCars();
  }

  publicCarDatabase = {};
  publicCars.forEach((car) => {
    publicCarDatabase[car.id] = car;
  });

  renderPublicCars(containerId, countId);
}

window.showCarDetails = showCarDetails;
window.initPublicCars = initPublicCars;
window.getPublicCars = () => publicCars;
