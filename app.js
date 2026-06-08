// app.js - Logica Aplicației Management Parc Auto (Fleetly)
// Verificare autentificare secundară (fallback dacă guard-ul din <head> a fost ocolit)
const statusLogat = localStorage.getItem('statusLogat');
const rolUtilizator = localStorage.getItem('rolUtilizator');
const driverIdUtilizator = localStorage.getItem('driverIdUtilizator');

if (statusLogat !== 'da') {
    window.location.replace('login.html');
}
// Starea curentă a aplicației (localStorage + sincronizare PostgreSQL)
let useApi = false;
let state = {
    cars: JSON.parse(localStorage.getItem("fleet_cars")) || [],
    drivers: JSON.parse(localStorage.getItem("fleet_drivers")) || [],
    service: JSON.parse(localStorage.getItem("fleet_service")) || [],
    insurances: JSON.parse(localStorage.getItem("fleet_insurances")) || [],
    vignettes: JSON.parse(localStorage.getItem("fleet_vignettes")) || [],
    tires: JSON.parse(localStorage.getItem("fleet_tires")) || [],
    users: JSON.parse(localStorage.getItem("fleet_users")) || []
};

async function loadStateFromApi() {
    if (!window.FleetAPI) return false;
    try {
        useApi = await FleetAPI.ping();
        if (!useApi) return false;
        const data = await FleetAPI.getState();
        state = data;
        cacheStateLocally();
        return true;
    } catch (e) {
        console.warn("API indisponibil, folosesc localStorage:", e);
        useApi = false;
        return false;
    }
}

function cacheStateLocally() {
    localStorage.setItem("fleet_cars", JSON.stringify(state.cars));
    localStorage.setItem("fleet_drivers", JSON.stringify(state.drivers));
    localStorage.setItem("fleet_service", JSON.stringify(state.service));
    localStorage.setItem("fleet_insurances", JSON.stringify(state.insurances));
    localStorage.setItem("fleet_vignettes", JSON.stringify(state.vignettes));
    localStorage.setItem("fleet_tires", JSON.stringify(state.tires));
    localStorage.setItem("fleet_users", JSON.stringify(state.users || []));
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadStateFromApi();
    initApp();
});

// Identificăm mașina alocată clientului dacă e logat ca și client
let clientCarId = null;
function updateClientCarId() {
    if (rolUtilizator === 'client' && driverIdUtilizator) {
        const activeDriver = state.drivers.find(d => d.id === driverIdUtilizator);
        if (activeDriver) {
            clientCarId = activeDriver.assignedCarId;
        } else {
            clientCarId = null;
        }
    } else {
        clientCarId = null;
    }
}
updateClientCarId();

function updateClientCarButton() {
    const btn = document.getElementById("btn-client-car");
    if (!btn) return;
    
    if (clientCarId) {
        btn.innerHTML = `<i class="fa-solid fa-pen"></i> Editează Mașina Ta`;
        btn.onclick = () => editCar(clientCarId);
    } else {
        btn.innerHTML = `<i class="fa-solid fa-plus"></i> Adaugă Mașina Ta`;
        btn.onclick = () => openClientCarModal();
    }
}

function openClientCarModal() {
    // Reset/Setup modal for adding a client car
    document.getElementById("modal-car-title").textContent = "Adaugă Mașina Ta";
    document.getElementById("car-id").value = "";
    document.getElementById("car-plate").value = "";
    document.getElementById("car-brand").value = "";
    document.getElementById("car-model").value = "";
    document.getElementById("car-year").value = new Date().getFullYear();
    document.getElementById("car-fuel").value = "Benzină";
    document.getElementById("car-status").value = "Activ";
    
    if (document.getElementById("car-listed")) document.getElementById("car-listed").checked = false;
    
    openModal("modal-car");
}

// Salvare stare în localStorage + PostgreSQL
function saveState() {
    updateClientCarId();
    cacheStateLocally();

    if (useApi && window.FleetAPI) {
        FleetAPI.saveState(state).catch((e) => {
            console.error("Eroare sincronizare API:", e);
            alert("Modificarea a fost salvată local, dar sincronizarea cu baza de date a eșuat.");
        });
    }

    updateDashboard();
    populateTables();
}

// Inițializare aplicație
function initApp() {
    setupNavigation();
    updateDashboard();
    populateTables();
    setupFilters();
    populateSelectDropdowns();
}

// ----------------------------------------------------
// 1. NAVIGARE (TAB-uri)
// ----------------------------------------------------
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".tab-content");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Eliminăm clasa activă de la toate butoanele
            navItems.forEach(nav => nav.classList.remove("active"));
            // Adăugăm clasa activă pe cel selectat
            item.classList.add("active");

            // Schimbăm tab-ul activ în conținut
            const targetTab = item.getAttribute("data-tab");
            sections.forEach(section => {
                if (section.id === targetTab) {
                    section.classList.add("active");
                } else {
                    section.classList.remove("active");
                }
            });
        });
    });
}

// Helper pentru generare ID unic
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

// Helper formatare dată (ex: 2026-05-27 -> 27.05.2026)
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("ro-RO");
}

// Helper verificare dacă o dată este expirată sau expiră curând (în 30 de zile)
function checkExpiryStatus(expiryDateString) {
    if (!expiryDateString) return { label: "N/A", class: "badge-success", daysLeft: 999 };
    
    const expiry = new Date(expiryDateString);
    const today = new Date();
    // Resetare ore pentru precizie la zile
    today.setHours(0,0,0,0);
    expiry.setHours(0,0,0,0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { label: "Expirat", class: "badge-danger", daysLeft: diffDays };
    } else if (diffDays <= 30) {
        return { label: `Expiră în ${diffDays} zile`, class: "badge-warning", daysLeft: diffDays };
    } else {
        return { label: "Valid", class: "badge-success", daysLeft: diffDays };
    }
}

// ----------------------------------------------------
// 2. DASHBOARD - STATISTICI ȘI ALERTE
// ----------------------------------------------------
function updateDashboard() {
    // Afișează/ascunde cardul de onboarding pentru clienții fără mașină
    const onboardingEl = document.getElementById("client-onboarding");
    if (onboardingEl) {
        if (rolUtilizator === 'client' && !clientCarId) {
            onboardingEl.style.display = "flex";
        } else {
            onboardingEl.style.display = "none";
        }
    }
    
    // Actualizează butonul de acțiune al mașinii clientului
    if (rolUtilizator === 'client') {
        updateClientCarButton();
    }

    // Dacă utilizatorul curent este client, calculăm statisticile specifice clientului
    if (rolUtilizator === 'client') {
        const clientCar = state.cars.find(c => c.id === clientCarId);
        const clientDriver = state.drivers.find(d => d.id === driverIdUtilizator);
        
        // 1. Status Mașină
        const statusEl = document.getElementById("stat-client-car-status");
        if (statusEl) {
            statusEl.textContent = clientCar ? clientCar.status : "Nealocată";
            statusEl.className = "stat-value";
            if (clientCar) {
                if (clientCar.status === "Activ") statusEl.style.color = "var(--accent-emerald)";
                else if (clientCar.status === "În Service") statusEl.style.color = "var(--accent-amber)";
                else statusEl.style.color = "var(--accent-rose)";
            }
        }
        
        // 2. Valabilitate Permis proprie
        const licenseEl = document.getElementById("stat-client-license-days");
        if (licenseEl && clientDriver) {
            const status = checkExpiryStatus(clientDriver.licenseExpiry);
            licenseEl.textContent = status.label;
            licenseEl.className = "stat-value";
            if (status.daysLeft < 0) licenseEl.style.color = "var(--accent-rose)";
            else if (status.daysLeft <= 30) licenseEl.style.color = "var(--accent-amber)";
            else licenseEl.style.color = "var(--accent-emerald)";
        } else if (licenseEl) {
            licenseEl.textContent = "N/A";
        }
        
        // 3. RCA mașină proprie
        const rcaEl = document.getElementById("stat-client-rca-status");
        if (rcaEl) {
            const rca = state.insurances.find(i => i.carId === clientCarId && i.type === "RCA");
            if (rca) {
                const status = checkExpiryStatus(rca.expiryDate);
                rcaEl.textContent = status.label;
                rcaEl.className = "stat-value";
                if (status.daysLeft < 0) rcaEl.style.color = "var(--accent-rose)";
                else if (status.daysLeft <= 30) rcaEl.style.color = "var(--accent-amber)";
                else rcaEl.style.color = "var(--accent-emerald)";
            } else {
                rcaEl.textContent = "Lipsă RCA";
                rcaEl.style.color = "var(--accent-rose)";
            }
        }
        
        // 4. Vinietă mașină proprie
        const vigEl = document.getElementById("stat-client-vignette-status");
        if (vigEl) {
            const vig = state.vignettes.find(v => v.carId === clientCarId && v.country === "România");
            if (vig) {
                const status = checkExpiryStatus(vig.expiryDate);
                vigEl.textContent = status.label;
                vigEl.className = "stat-value";
                if (status.daysLeft < 0) vigEl.style.color = "var(--accent-rose)";
                else if (status.daysLeft <= 30) vigEl.style.color = "var(--accent-amber)";
                else vigEl.style.color = "var(--accent-emerald)";
            } else {
                vigEl.textContent = "Lipsă Vinietă";
                vigEl.style.color = "var(--accent-rose)";
            }
        }
    } else {
        // Cifre admin existente
        document.getElementById("stat-total-cars").textContent = state.cars.length;
        document.getElementById("stat-total-drivers").textContent = state.drivers.length;
        
        const serviceCars = state.cars.filter(c => c.status === "În Service").length;
        document.getElementById("stat-cars-service").textContent = serviceCars;
        
        const totalServiceCost = state.service.reduce((sum, item) => sum + Number(item.cost || 0), 0);
        document.getElementById("stat-total-cost").textContent = totalServiceCost.toLocaleString("ro-RO");
    }

    // ALERTE (Asigurări, Viniete, Permise Șoferi) - filtrate după caz
    const alertsListContainer = document.getElementById("dashboard-alerts");
    alertsListContainer.innerHTML = "";
    let alertCount = 0;

    // A. Alerte Asigurări
    state.insurances.forEach(ins => {
        if (rolUtilizator === 'client' && ins.carId !== clientCarId) return;
        const car = state.cars.find(c => c.id === ins.carId);
        const plate = car ? car.plateNumber : "Mașină necunoscută";
        const status = checkExpiryStatus(ins.expiryDate);
        
        if (status.daysLeft <= 30) {
            alertCount++;
            const isExpired = status.daysLeft < 0;
            const alertHtml = `
                <div class="alert-item ${isExpired ? '' : 'warning'}">
                    <div class="alert-icon">
                        <i class="fa-solid ${isExpired ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">Asigurare ${ins.type} - ${plate}</div>
                        <div class="alert-desc">${isExpired ? 'Polița a expirat' : 'Polița expiră curând'} pe data de: <strong>${formatDate(ins.expiryDate)}</strong> (${ins.company})</div>
                    </div>
                </div>
            `;
            alertsListContainer.insertAdjacentHTML("beforeend", alertHtml);
        }
    });

    // B. Alerte Viniete
    state.vignettes.forEach(vig => {
        if (rolUtilizator === 'client' && vig.carId !== clientCarId) return;
        const car = state.cars.find(c => c.id === vig.carId);
        const plate = car ? car.plateNumber : "Mașină necunoscută";
        const status = checkExpiryStatus(vig.expiryDate);
        
        if (status.daysLeft <= 30) {
            alertCount++;
            const isExpired = status.daysLeft < 0;
            const alertHtml = `
                <div class="alert-item ${isExpired ? '' : 'warning'}">
                    <div class="alert-icon">
                        <i class="fa-solid ${isExpired ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">Vinietă ${vig.country} - ${plate}</div>
                        <div class="alert-desc">${isExpired ? 'A expirat' : 'Expiră curând'} la data: <strong>${formatDate(vig.expiryDate)}</strong></div>
                    </div>
                </div>
            `;
            alertsListContainer.insertAdjacentHTML("beforeend", alertHtml);
        }
    });

    // C. Alerte Permise Șoferi
    state.drivers.forEach(driver => {
        if (rolUtilizator === 'client' && driver.id !== driverIdUtilizator) return;
        const status = checkExpiryStatus(driver.licenseExpiry);
        if (status.daysLeft <= 30) {
            alertCount++;
            const isExpired = status.daysLeft < 0;
            const alertHtml = `
                <div class="alert-item ${isExpired ? '' : 'warning'}">
                    <div class="alert-icon">
                        <i class="fa-solid ${isExpired ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">Permis șofer - ${driver.name}</div>
                        <div class="alert-desc">${isExpired ? 'Permis expirat' : 'Permisul expiră în curând'} pe: <strong>${formatDate(driver.licenseExpiry)}</strong></div>
                    </div>
                </div>
            `;
            alertsListContainer.insertAdjacentHTML("beforeend", alertHtml);
        }
    });

    // Actualizare număr alerte
    document.getElementById("alerts-count").textContent = `${alertCount} Alerte active`;
    if (alertCount === 0) {
        alertsListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i>
                <p>Nicio alertă! Toate documentele sunt valabile.</p>
            </div>
        `;
    }

    // PANOU ACTIVITATE PARC (Stadiu Service activ)
    const activityContainer = document.getElementById("dashboard-activity");
    activityContainer.innerHTML = "";
    
    const activeServices = state.service.filter(s => {
        const matchesStatus = s.status === "În curs";
        const matchesCar = rolUtilizator !== 'client' || s.carId === clientCarId;
        return matchesStatus && matchesCar;
    });
    
    if (activeServices.length > 0) {
        activeServices.forEach(ser => {
            const car = state.cars.find(c => c.id === ser.carId);
            const plate = car ? car.plateNumber : "Necunoscut";
            const activityHtml = `
                <div class="alert-item info">
                    <div class="alert-icon">
                        <i class="fa-solid fa-wrench"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">Mașină în service: ${plate}</div>
                        <div class="alert-desc">${ser.description} (Intrat pe: ${formatDate(ser.date)})</div>
                    </div>
                </div>
            `;
            activityContainer.insertAdjacentHTML("beforeend", activityHtml);
        });
    } else {
        activityContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-square-poll-horizontal" style="color: var(--accent-blue);"></i>
                <p>Nicio mașină în service în acest moment.</p>
            </div>
        `;
    }
}

// ----------------------------------------------------
// 3. POPULARE TABELE DATE
// ----------------------------------------------------
function populateTables() {
    populateCarsTable();
    populateDriversTable();
    populateServiceTable();
    populateInsurancesTable();
    populateVignettesTable();
    populateTiresTable();
}

// dropdowns dinamice pentru formularele adaugă/editează
function populateSelectDropdowns() {
    const carDropdowns = ["driver-car", "service-car", "insurance-car", "vignette-car", "tires-car"];
    
    carDropdowns.forEach(dropdownId => {
        const select = document.getElementById(dropdownId);
        if (!select) return;
        
        // Salvăm prima opțiune implicită
        const firstOption = select.options[0] ? select.options[0].outerHTML : '';
        select.innerHTML = firstOption;
        
        state.cars.forEach(car => {
            // Dacă e client, adăugăm doar mașina alocată
            if (rolUtilizator === 'client' && car.id !== clientCarId) {
                return;
            }
            const opt = document.createElement("option");
            opt.value = car.id;
            opt.textContent = `${car.plateNumber} (${car.brand} ${car.model})`;
            select.appendChild(opt);
        });
    });
}

// A. Tabela Mașini
function populateCarsTable() {
    const tbody = document.getElementById("cars-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchQuery = document.getElementById("search-cars").value.toLowerCase();
    const statusFilter = document.getElementById("filter-car-status").value;

    if (rolUtilizator === 'client' && !clientCarId) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;">
                <i class="fa-solid fa-car"></i>
            </div>
            <h3 style="margin-bottom: 8px; color: var(--text-primary);">Nu ai adăugat nicio mașină încă</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 14px;">Adaugă mașina ta personală pentru a putea să-i monitorizezi asigurările, vinietele și reviziile.</p>
            <button class="btn btn-primary" onclick="openClientCarModal()">
                <i class="fa-solid fa-plus"></i> Adaugă Mașina Ta
            </button>
        </td></tr>`;
        return;
    }

    const filteredCars = state.cars.filter(car => {
        if (rolUtilizator === 'client' && car.id !== clientCarId) {
            return false;
        }
        const matchesSearch = car.plateNumber.toLowerCase().includes(searchQuery) ||
                              car.brand.toLowerCase().includes(searchQuery) ||
                              car.model.toLowerCase().includes(searchQuery);
        const matchesStatus = statusFilter === "" || car.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (filteredCars.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nicio mașină găsită.</td></tr>`;
        return;
    }

    filteredCars.forEach(car => {
        let badgeClass = "badge-success";
        if (car.status === "În Service") badgeClass = "badge-warning";
        if (car.status === "Inactiv") badgeClass = "badge-danger";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${car.plateNumber}</strong></td>
            <td>${car.brand} ${car.model}${car.isListed ? ' <span class="badge badge-info" title="Listat pe site">Site</span>' : ''}</td>
            <td>${car.year}</td>
            <td>${car.fuelType}</td>
            <td><span class="badge ${badgeClass}">${car.status}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon" onclick="editCar('${car.id}')" title="Editează"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteCar('${car.id}')" title="Șterge"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// B. Tabela Șoferi
function populateDriversTable() {
    const tbody = document.getElementById("drivers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchQuery = document.getElementById("search-drivers").value.toLowerCase();

    const filteredDrivers = state.drivers.filter(driver => {
        return driver.name.toLowerCase().includes(searchQuery) || 
               driver.phone.includes(searchQuery);
    });

    if (filteredDrivers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Niciun șofer găsit.</td></tr>`;
        return;
    }

    filteredDrivers.forEach(driver => {
        const car = state.cars.find(c => c.id === driver.assignedCarId);
        const carText = car ? `<strong>${car.plateNumber}</strong> (${car.brand})` : `<span style="color: var(--text-muted)">Nealocată</span>`;
        const expiryStatus = checkExpiryStatus(driver.licenseExpiry);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${driver.name}</strong></td>
            <td><span class="badge badge-info">${driver.licenseCategory}</span></td>
            <td>${driver.phone}</td>
            <td>${formatDate(driver.licenseExpiry)} <span class="badge ${expiryStatus.class}" style="margin-left: 8px;">${expiryStatus.label}</span></td>
            <td>${carText}</td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon" onclick="editDriver('${driver.id}')" title="Editează"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteDriver('${driver.id}')" title="Șterge"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// C. Tabela Service
function populateServiceTable() {
    const tbody = document.getElementById("service-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchQuery = document.getElementById("search-service").value.toLowerCase();

    const filteredServices = state.service.filter(s => {
        if (rolUtilizator === 'client' && s.carId !== clientCarId) {
            return false;
        }
        const car = state.cars.find(c => c.id === s.carId);
        const plate = car ? car.plateNumber.toLowerCase() : "";
        return plate.includes(searchQuery) || s.description.toLowerCase().includes(searchQuery);
    });

    if (filteredServices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nicio intervenție găsită.</td></tr>`;
        return;
    }

    filteredServices.forEach(ser => {
        const car = state.cars.find(c => c.id === ser.carId);
        const plateText = car ? `<strong>${car.plateNumber}</strong>` : `<span style="color: var(--text-rose)">Ștearsă</span>`;
        const badgeClass = ser.status === "Finalizat" ? "badge-success" : "badge-warning";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${plateText}</td>
            <td>${formatDate(ser.date)}</td>
            <td>${ser.description}</td>
            <td><strong>${Number(ser.cost).toLocaleString("ro-RO")} Lei</strong></td>
            <td><span class="badge ${badgeClass}">${ser.status}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon" onclick="editService('${ser.id}')" title="Editează"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteService('${ser.id}')" title="Șterge"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// D. Tabela Asigurări
function populateInsurancesTable() {
    const tbody = document.getElementById("insurances-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filteredInsurances = state.insurances.filter(ins => {
        return rolUtilizator !== 'client' || ins.carId === clientCarId;
    });

    if (filteredInsurances.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nicio asigurare configurată.</td></tr>`;
        return;
    }

    filteredInsurances.forEach(ins => {
        const car = state.cars.find(c => c.id === ins.carId);
        const plateText = car ? `<strong>${car.plateNumber}</strong>` : `<span style="color: var(--text-rose)">Ștearsă</span>`;
        const status = checkExpiryStatus(ins.expiryDate);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${plateText}</td>
            <td><span class="badge badge-info">${ins.type}</span></td>
            <td>${ins.company}</td>
            <td><strong>${Number(ins.cost).toLocaleString("ro-RO")} Lei</strong></td>
            <td>${formatDate(ins.startDate)}</td>
            <td>${formatDate(ins.expiryDate)}</td>
            <td><span class="badge ${status.class}">${status.label}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon" onclick="editInsurance('${ins.id}')" title="Editează"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteInsurance('${ins.id}')" title="Șterge"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// E. Tabela Viniete
function populateVignettesTable() {
    const tbody = document.getElementById("vignettes-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filteredVignettes = state.vignettes.filter(vig => {
        return rolUtilizator !== 'client' || vig.carId === clientCarId;
    });

    if (filteredVignettes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nicio vinietă achiziționată.</td></tr>`;
        return;
    }

    filteredVignettes.forEach(vig => {
        const car = state.cars.find(c => c.id === vig.carId);
        const plateText = car ? `<strong>${car.plateNumber}</strong>` : `<span style="color: var(--text-rose)">Ștearsă</span>`;
        const status = checkExpiryStatus(vig.expiryDate);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${plateText}</td>
            <td><strong>${vig.country}</strong></td>
            <td>${vig.duration}</td>
            <td>${formatDate(vig.startDate)}</td>
            <td>${formatDate(vig.expiryDate)}</td>
            <td><strong>${Number(vig.cost).toLocaleString("ro-RO")} Lei</strong></td>
            <td><span class="badge ${status.class}">${status.label}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon" onclick="editVignette('${vig.id}')" title="Editează"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteVignette('${vig.id}')" title="Șterge"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// F. Tabela Anvelope
function populateTiresTable() {
    const tbody = document.getElementById("tires-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filteredTires = state.tires.filter(set => {
        return rolUtilizator !== 'client' || set.carId === clientCarId;
    });

    if (filteredTires.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Nicio anvelopă înregistrată.</td></tr>`;
        return;
    }

    filteredTires.forEach(set => {
        const car = state.cars.find(c => c.id === set.carId);
        const plateText = car ? `<strong>${car.plateNumber}</strong>` : `<span style="color: var(--text-rose)">Ștearsă</span>`;
        
        let stateClass = "badge-success";
        if (set.state === "Uzat") stateClass = "badge-danger";
        if (set.state === "Bun") stateClass = "badge-info";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${plateText}</td>
            <td><span class="badge badge-info">${set.season}</span></td>
            <td>${set.size}</td>
            <td>${set.brand}</td>
            <td><span class="badge ${stateClass}">${set.state}</span></td>
            <td>${set.location}</td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon" onclick="editTires('${set.id}')" title="Editează"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteTires('${set.id}')" title="Șterge"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ----------------------------------------------------
// 4. FUNCTII DE FILTRARE ȘI CĂUTARE
// ----------------------------------------------------
function setupFilters() {
    // Căutare Mașini
    document.getElementById("search-cars").addEventListener("input", populateCarsTable);
    document.getElementById("filter-car-status").addEventListener("change", populateCarsTable);

    // Căutare Șoferi
    document.getElementById("search-drivers").addEventListener("input", populateDriversTable);

    // Căutare Service
    document.getElementById("search-service").addEventListener("input", populateServiceTable);
}

// ----------------------------------------------------
// 5. OPERAȚIUNI MODAL & SALVARE DATE (C.R.U.D.)
// ----------------------------------------------------
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        
        // Curățare formular la închidere
        const form = modal.querySelector("form");
        if (form) form.reset();
        
        // Resetare id ascuns dacă e caz de editare
        const idInput = modal.querySelector("input[type='hidden']");
        if (idInput) idInput.value = "";
    }
}

// A. Salvare Mașină (Adăugare / Editare)
function saveCar(e) {
    e.preventDefault();
    const id = document.getElementById("car-id").value;
    const plate = document.getElementById("car-plate").value.trim().toUpperCase();
    const brand = document.getElementById("car-brand").value.trim();
    const model = document.getElementById("car-model").value.trim();
    const year = Number(document.getElementById("car-year").value);
    const fuel = document.getElementById("car-fuel").value;
    const status = document.getElementById("car-status").value;
    const isListed = document.getElementById("car-listed")?.checked || false;
    const category = document.getElementById("car-category")?.value.trim() || null;
    const price = document.getElementById("car-price")?.value ? Number(document.getElementById("car-price").value) : null;
    const mileage = document.getElementById("car-mileage")?.value ? Number(document.getElementById("car-mileage").value) : null;
    const existing = id ? state.cars.find(c => c.id === id) : null;

    const carData = {
        id: id || generateId(),
        plateNumber: plate,
        brand,
        model,
        year,
        fuelType: fuel,
        status,
        isListed,
        category,
        price,
        mileage,
        transmission: existing?.transmission || (isListed ? "Automat" : null),
        imageUrl: existing?.imageUrl || null,
        description: existing?.description || null,
        specs: existing?.specs || {},
        financingMonthly: existing?.financingMonthly || (price ? Math.round(price / 78) : null),
        badge: existing?.badge || "Disponibil",
    };

    if (id) {
        const idx = state.cars.findIndex(c => c.id === id);
        if (idx !== -1) state.cars[idx] = carData;
    } else {
        state.cars.push(carData);
    }

    if (rolUtilizator === 'client' && driverIdUtilizator) {
        const activeDriver = state.drivers.find(d => d.id === driverIdUtilizator);
        if (activeDriver) {
            activeDriver.assignedCarId = carData.id;
            clientCarId = carData.id;
        }
    }

    saveState();
    populateSelectDropdowns();
    closeModal("modal-car");
}

function editCar(id) {
    const car = state.cars.find(c => c.id === id);
    if (!car) return;

    document.getElementById("modal-car-title").textContent = "Editează Mașină";
    document.getElementById("car-id").value = car.id;
    document.getElementById("car-plate").value = car.plateNumber;
    document.getElementById("car-brand").value = car.brand;
    document.getElementById("car-model").value = car.model;
    document.getElementById("car-year").value = car.year;
    document.getElementById("car-fuel").value = car.fuelType;
    document.getElementById("car-status").value = car.status;
    if (document.getElementById("car-listed")) document.getElementById("car-listed").checked = !!car.isListed;
    if (document.getElementById("car-category")) document.getElementById("car-category").value = car.category || "";
    if (document.getElementById("car-price")) document.getElementById("car-price").value = car.price || "";
    if (document.getElementById("car-mileage")) document.getElementById("car-mileage").value = car.mileage || "";

    openModal("modal-car");
}

function deleteCar(id) {
    if (confirm("Sigur doriți să ștergeți această mașină? Toate asocierile vor fi afectate.")) {
        state.cars = state.cars.filter(c => c.id !== id);
        
        // Deconectăm șoferii asociați cu această mașină
        state.drivers.forEach(d => {
            if (d.assignedCarId === id) d.assignedCarId = "";
        });

        saveState();
        populateSelectDropdowns();
    }
}

// B. Salvare Șofer (Adăugare / Editare)
function saveDriver(e) {
    e.preventDefault();
    const id = document.getElementById("driver-id").value;
    const name = document.getElementById("driver-name").value.trim();
    const license = document.getElementById("driver-license").value.trim();
    const phone = document.getElementById("driver-phone").value.trim();
    const expiry = document.getElementById("driver-expiry").value;
    const carId = document.getElementById("driver-car").value;

    if (id) {
        // Editare
        const idx = state.drivers.findIndex(d => d.id === id);
        if (idx !== -1) {
            state.drivers[idx] = { id, name, licenseCategory: license, phone, licenseExpiry: expiry, assignedCarId: carId };
        }
    } else {
        // Adăugare
        state.drivers.push({
            id: generateId(),
            name,
            licenseCategory: license,
            phone,
            licenseExpiry: expiry,
            assignedCarId: carId
        });
    }

    saveState();
    closeModal("modal-driver");
}

function editDriver(id) {
    const drv = state.drivers.find(d => d.id === id);
    if (!drv) return;

    document.getElementById("modal-driver-title").textContent = "Editează Șofer";
    document.getElementById("driver-id").value = drv.id;
    document.getElementById("driver-name").value = drv.name;
    document.getElementById("driver-license").value = drv.licenseCategory;
    document.getElementById("driver-phone").value = drv.phone;
    document.getElementById("driver-expiry").value = drv.licenseExpiry;
    document.getElementById("driver-car").value = drv.assignedCarId;

    openModal("modal-driver");
}

function deleteDriver(id) {
    if (confirm("Doriți să ștergeți acest șofer?")) {
        state.drivers = state.drivers.filter(d => d.id !== id);
        saveState();
    }
}

// C. Salvare Serviciu/Service (Adăugare / Editare)
function saveService(e) {
    e.preventDefault();
    const id = document.getElementById("service-id").value;
    const carId = document.getElementById("service-car").value;
    const date = document.getElementById("service-date").value;
    const desc = document.getElementById("service-desc").value.trim();
    const cost = Number(document.getElementById("service-cost").value);
    const status = document.getElementById("service-status").value;

    if (id) {
        const idx = state.service.findIndex(s => s.id === id);
        if (idx !== -1) {
            state.service[idx] = { id, carId, date, description: desc, cost, status };
        }
    } else {
        state.service.push({
            id: generateId(),
            carId,
            date,
            description: desc,
            cost,
            status
        });
    }

    // Actualizează statusul mașinii în funcție de stadiul service-ului
    const car = state.cars.find(c => c.id === carId);
    if (car) {
        if (status === "În curs") {
            car.status = "În Service";
        } else if (car.status === "În Service") {
            // Dacă service-ul e gata, o punem înapoi Activă
            car.status = "Activ";
        }
    }

    saveState();
    closeModal("modal-service");
}

function editService(id) {
    const ser = state.service.find(s => s.id === id);
    if (!ser) return;

    document.getElementById("modal-service-title").textContent = "Editează Înregistrare Service";
    document.getElementById("service-id").value = ser.id;
    document.getElementById("service-car").value = ser.carId;
    document.getElementById("service-date").value = ser.date;
    document.getElementById("service-desc").value = ser.description;
    document.getElementById("service-cost").value = ser.cost;
    document.getElementById("service-status").value = ser.status;

    openModal("modal-service");
}

function deleteService(id) {
    if (confirm("Doriți să ștergeți această înregistrare din istoric?")) {
        state.service = state.service.filter(s => s.id !== id);
        saveState();
    }
}

// D. Salvare Asigurare (Adăugare / Editare)
function saveInsurance(e) {
    e.preventDefault();
    const id = document.getElementById("insurance-id").value;
    const carId = document.getElementById("insurance-car").value;
    const type = document.getElementById("insurance-type").value;
    const company = document.getElementById("insurance-company").value.trim();
    const cost = Number(document.getElementById("insurance-cost").value);
    const start = document.getElementById("insurance-start").value;
    const expiry = document.getElementById("insurance-expiry").value;

    if (id) {
        const idx = state.insurances.findIndex(i => i.id === id);
        if (idx !== -1) {
            state.insurances[idx] = { id, carId, type, company, cost, startDate: start, expiryDate: expiry };
        }
    } else {
        state.insurances.push({
            id: generateId(),
            carId,
            type,
            company,
            cost,
            startDate: start,
            expiryDate: expiry
        });
    }

    saveState();
    closeModal("modal-insurance");
}

function editInsurance(id) {
    const ins = state.insurances.find(i => i.id === id);
    if (!ins) return;

    document.getElementById("modal-insurance-title").textContent = "Editează Poliță";
    document.getElementById("insurance-id").value = ins.id;
    document.getElementById("insurance-car").value = ins.carId;
    document.getElementById("insurance-type").value = ins.type;
    document.getElementById("insurance-company").value = ins.company;
    document.getElementById("insurance-cost").value = ins.cost;
    document.getElementById("insurance-start").value = ins.startDate;
    document.getElementById("insurance-expiry").value = ins.expiryDate;

    openModal("modal-insurance");
}

function deleteInsurance(id) {
    if (confirm("Doriți să ștergeți această poliță?")) {
        state.insurances = state.insurances.filter(i => i.id !== id);
        saveState();
    }
}

// E. Salvare Vinietă (Adăugare / Editare)
function saveVignette(e) {
    e.preventDefault();
    const id = document.getElementById("vignette-id").value;
    const carId = document.getElementById("vignette-car").value;
    const country = document.getElementById("vignette-country").value.trim();
    const duration = document.getElementById("vignette-duration").value;
    const cost = Number(document.getElementById("vignette-cost").value);
    const start = document.getElementById("vignette-start").value;
    const expiry = document.getElementById("vignette-expiry").value;

    if (id) {
        const idx = state.vignettes.findIndex(v => v.id === id);
        if (idx !== -1) {
            state.vignettes[idx] = { id, carId, country, duration, cost, startDate: start, expiryDate: expiry };
        }
    } else {
        state.vignettes.push({
            id: generateId(),
            carId,
            country,
            duration,
            cost,
            startDate: start,
            expiryDate: expiry
        });
    }

    saveState();
    closeModal("modal-vignette");
}

function editVignette(id) {
    const vig = state.vignettes.find(v => v.id === id);
    if (!vig) return;

    document.getElementById("modal-vignette-title").textContent = "Editează Vinietă";
    document.getElementById("vignette-id").value = vig.id;
    document.getElementById("vignette-car").value = vig.carId;
    document.getElementById("vignette-country").value = vig.country;
    document.getElementById("vignette-duration").value = vig.duration;
    document.getElementById("vignette-cost").value = vig.cost;
    document.getElementById("vignette-start").value = vig.startDate;
    document.getElementById("vignette-expiry").value = vig.expiryDate;

    openModal("modal-vignette");
}

function deleteVignette(id) {
    if (confirm("Doriți să ștergeți această vinietă?")) {
        state.vignettes = state.vignettes.filter(v => v.id !== id);
        saveState();
    }
}

// F. Salvare Anvelope (Adăugare / Editare)
function saveTires(e) {
    e.preventDefault();
    const id = document.getElementById("tires-id").value;
    const carId = document.getElementById("tires-car").value;
    const season = document.getElementById("tires-season").value;
    const size = document.getElementById("tires-size").value.trim();
    const brand = document.getElementById("tires-brand").value.trim();
    const stateVal = document.getElementById("tires-state").value;
    const location = document.getElementById("tires-location").value;

    if (id) {
        const idx = state.tires.findIndex(t => t.id === id);
        if (idx !== -1) {
            state.tires[idx] = { id, carId, season, size, brand, state: stateVal, location };
        }
    } else {
        state.tires.push({
            id: generateId(),
            carId,
            season,
            size,
            brand,
            state: stateVal,
            location
        });
    }

    saveState();
    closeModal("modal-tires");
}

function editTires(id) {
    const set = state.tires.find(t => t.id === id);
    if (!set) return;

    document.getElementById("modal-tires-title").textContent = "Editează Set Anvelope";
    document.getElementById("tires-id").value = set.id;
    document.getElementById("tires-car").value = set.carId;
    document.getElementById("tires-season").value = set.season;
    document.getElementById("tires-size").value = set.size;
    document.getElementById("tires-brand").value = set.brand;
    document.getElementById("tires-state").value = set.state;
    document.getElementById("tires-location").value = set.location;

    openModal("modal-tires");
}

function deleteTires(id) {
    if (confirm("Doriți să ștergeți această înregistrare de anvelope?")) {
        state.tires = state.tires.filter(t => t.id !== id);
        saveState();
    }
}

// ----------------------------------------------------
// 6. LOGOUT ȘI REINIȚIALIZARE DATE (ADMIN)
// ----------------------------------------------------
function logout() {
    localStorage.removeItem('statusLogat');
    localStorage.removeItem('rolUtilizator');
    localStorage.removeItem('driverIdUtilizator');
    window.location.href = 'login.html';
}

async function resetDatabase() {
    if (!confirm("Sigur doriți să resetați baza de date la valorile demo inițiale? Toate modificările curente vor fi pierdute.")) {
        return;
    }

    if (useApi && window.FleetAPI) {
        try {
            await FleetAPI.resetDemo();
            window.location.reload();
            return;
        } catch (e) {
            console.error(e);
            alert("Reset API eșuat, se folosește reset local.");
        }
    }

    localStorage.removeItem("fleet_cars");
    localStorage.removeItem("fleet_drivers");
    localStorage.removeItem("fleet_service");
    localStorage.removeItem("fleet_insurances");
    localStorage.removeItem("fleet_vignettes");
    localStorage.removeItem("fleet_tires");
    localStorage.removeItem("fleet_users");

    if (typeof initializeStorage === "function") {
        initializeStorage();
    }

    window.location.reload();
}

// ----------------------------------------------------
// 7. RAPORTARE DEFECȚIUNE (CLIENT)
// ----------------------------------------------------
function reportIssue(e) {
    e.preventDefault();
    const date = document.getElementById("report-date").value;
    const desc = document.getElementById("report-desc").value.trim();

    if (!clientCarId) {
        alert("Nu aveți nicio mașină alocată pentru a putea raporta o defecțiune.");
        return;
    }

    // Adăugăm sesizarea de service cu cost 0 și status "În curs"
    state.service.push({
        id: generateId(),
        carId: clientCarId,
        date: date,
        description: "[Sesizare Client] " + desc,
        cost: 0,
        status: "În curs"
    });

    // Punem mașina în service
    const car = state.cars.find(c => c.id === clientCarId);
    if (car) {
        car.status = "În Service";
    }

    saveState();
    closeModal("modal-report-issue");
    
    // Resetăm input-urile din formular
    document.getElementById("form-report-issue").reset();
    
    alert("Defecțiunea a fost raportată cu succes! Mașina a fost plasată 'În Service'.");
}

document.addEventListener("DOMContentLoaded", () => {
    // Adăugăm clasa corespunzătoare rolului pe body
    document.body.classList.add(rolUtilizator === 'admin' ? 'role-admin' : 'role-client');

    if (rolUtilizator === 'client') {
        // Schimbăm titlul paginii pentru client portal
        const titlu = document.querySelector('.logo-text h1');
        if (titlu) {
            titlu.innerText = "Fleetly Portal";
        }
        
        // Redenumim dinamic meniurile din sidebar pentru utilizatorii client
        const carsLink = document.querySelector('[data-tab="cars"] span');
        if (carsLink) carsLink.textContent = "Mașina Mea";
        
        const serviceLink = document.querySelector('[data-tab="service"] span');
        if (serviceLink) serviceLink.textContent = "Istoric & Sesizări";

        // Ascundem opțiunile din dropdown din modale care nu corespund mașinii clientului
        // (astfel încât la adăugare anvelope/service clientul să aibă doar mașina sa preselectată)
        const carDropdowns = ["service-car", "insurance-car", "vignette-car", "tires-car"];
        carDropdowns.forEach(dropdownId => {
            const select = document.getElementById(dropdownId);
            if (select) {
                // Lăsăm doar opțiunea corespunzătoare mașinii sale
                for (let i = select.options.length - 1; i >= 0; i--) {
                    if (select.options[i].value !== "" && select.options[i].value !== clientCarId) {
                        select.remove(i);
                    }
                }
            }
        });
    }
});