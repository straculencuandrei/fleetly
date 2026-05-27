// Date mock inițiale pentru a popula aplicația la prima rulare
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
    { id: "i4", carId: "c4", type: "RCA", company: "Allianz Direct", cost: 1100, startDate: "2026-05-25", expiryDate: "2026-06-25" } // expira curand
];

const initialVignettes = [
    { id: "v1", carId: "c1", country: "România", duration: "1 An", startDate: "2025-08-01", expiryDate: "2026-08-01", cost: 140 },
    { id: "v2", carId: "c2", country: "România", duration: "1 An", startDate: "2025-11-20", expiryDate: "2026-11-20", cost: 140 },
    { id: "v3", carId: "c3", country: "Ungaria", duration: "10 Zile", startDate: "2026-05-24", expiryDate: "2026-06-03", cost: 80 },
    { id: "v4", carId: "c4", country: "România", duration: "30 Zile", startDate: "2026-04-28", expiryDate: "2026-05-28", cost: 35 } // expira maine
];

const initialTires = [
    { id: "t1", carId: "c1", season: "Vară", size: "185/65 R15", brand: "Michelin", state: "Excelent", location: "Pe mașină" },
    { id: "t2", carId: "c1", season: "Iarnă", size: "185/65 R15", brand: "Continental", state: "Uzat", location: "Depozit" },
    { id: "t3", carId: "c2", season: "All-Season", size: "205/55 R16", brand: "Bridgestone", state: "Bun", location: "Pe mașină" },
    { id: "t4", carId: "c3", season: "Vară", size: "195/65 R15", brand: "Hankook", state: "Nou", location: "Pe mașină" },
    { id: "t5", carId: "c4", season: "Iarnă", size: "205/55 R16", brand: "Nokian", state: "Excelent", location: "Pe mașină" }
];

// Inițializare în localStorage dacă nu există deja
function initializeStorage() {
    if (!localStorage.getItem("fleet_cars")) {
        localStorage.setItem("fleet_cars", JSON.stringify(initialCars));
    }
    if (!localStorage.getItem("fleet_drivers")) {
        localStorage.setItem("fleet_drivers", JSON.stringify(initialDrivers));
    }
    if (!localStorage.getItem("fleet_service")) {
        localStorage.setItem("fleet_service", JSON.stringify(initialService));
    }
    if (!localStorage.getItem("fleet_insurances")) {
        localStorage.setItem("fleet_insurances", JSON.stringify(initialInsurances));
    }
    if (!localStorage.getItem("fleet_vignettes")) {
        localStorage.setItem("fleet_vignettes", JSON.stringify(initialVignettes));
    }
    if (!localStorage.getItem("fleet_tires")) {
        localStorage.setItem("fleet_tires", JSON.stringify(initialTires));
    }
}

initializeStorage();
