// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB6AUBnK_7Vy2ABWI2JMo3ebG_Sljr8XlY",
    authDomain: "cyber-campus-2706f.firebaseapp.com",
    databaseURL: "https://cyber-campus-2706f-default-rtdb.firebaseio.com",
    projectId: "cyber-campus-2706f",
    storageBucket: "cyber-campus-2706f.appspot.com",
    messagingSenderId: "719410601264",
    appId: "1:719410601264:web:44fd2e3757721866303cf5",
    measurementId: "G-CEEFJP5LYZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginContainer = document.getElementById('loginContainer');
const signupContainer = document.getElementById('signupContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const salesForm = document.getElementById('salesForm');
const salesTable = document.getElementById('salesTable');
const totalSalesElement = document.getElementById('totalSales');
const averageSalesElement = document.getElementById('averageSales');
const userInfoElement = document.getElementById('userInfo');
const toggleAnalysisButton = document.getElementById('toggleAnalysisButton');
const toggleSalesButton = document.getElementById('toggleSalesButton');
const analysisSection = document.getElementById('analysisSection');
const salesDetailsSection = document.getElementById('salesDetailsSection');
const signupButton = document.getElementById('signupButton');
const loginFromSignup = document.getElementById('loginFromSignup');
let salesChart;
let currentUser;
let salesData = [];
let stockData = [];

// Set default date and time to now
document.getElementById('dateTime').value = new Date().toISOString().slice(0, 16);

// Ticket prices
const ticketPrices = {
    "1H": 100,
    "2H": 200,
    "3H": 250,
    "1J": 300,
    "3J": 600,
    "7J": 1200,
    "30J": 4000,
    "1G": 100,
    "5G": 400,
    "10G": 700,
    "25G": 1500,
    "1H Pro": 250,
    "2H Pro": 450,
    "3H Pro": 600,
    "1J Pro": 600,
    "3J Pro": 1200,
    "7J Pro": 2400,
    "30J Pro": 8000
};

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    database.ref('users/' + username).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            // User exists, check password
            if (snapshot.val().password === password) {
                loginSuccess(username);
            } else {
                alert('Mot de passe incorrect');
            }
        } else {
            alert('Utilisateur introuvable');
        }
    });
});

signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;

    database.ref('users/' + username).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            alert('Ce nom d\'utilisateur est déjà utilisé.');
        } else {
            database.ref('users/' + username).set({
                password: password
            }).then(() => {
                alert('Inscription réussie ! Connectez-vous.');
                signupContainer.style.display = 'none';
                loginContainer.style.display = 'block';
            }).catch((error) => {
                console.error('Error creating user:', error);
                alert('Erreur lors de la création du compte');
            });
        }
    });
});

signupButton.addEventListener('click', function() {
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
});

loginFromSignup.addEventListener('click', function() {
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});

function loginSuccess(username) {
    currentUser = username;
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    userInfoElement.textContent = `Utilisateur: ${username}`;
    updateTable();
    updateStockTables();
    updateAnalysis();
}

// Fetch last entry's stock final for the selected product
document.getElementById('product').addEventListener('change', function() {
    const product = this.value;
    database.ref('sales/' + currentUser).orderByChild('product').equalTo(product).limitToLast(1).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const lastEntry = Object.values(snapshot.val())[0];
            document.getElementById('SI').value = lastEntry.SF || 0;
        } else {
            document.getElementById('SI').value = 0;
        }
    });
    updatePV();
});

// Auto-calculate SF and set PV
document.getElementById('V').addEventListener('input', updateSF);
document.getElementById('APP').addEventListener('input', updateSF);

function updateSF() {
    const si = parseInt(document.getElementById('SI').value) || 0;
    const app = parseInt(document.getElementById('APP').value) || 0;
    const v = parseInt(document.getElementById('V').value) || 0;
    document.getElementById('SF').value = si + app - v;
}

function updatePV() {
    const product = document.getElementById('product').value;
    document.getElementById('PV').value = ticketPrices[product] || 0;
}

salesForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const newEntry = {
        dateTime: document.getElementById('dateTime').value,
        product: document.getElementById('product').value,
        SI: parseInt(document.getElementById('SI').value) || 0,
        APP: parseInt(document.getElementById('APP').value) || 0,
        V: parseInt(document.getElementById('V').value) || 0,
        SF: parseInt(document.getElementById('SF').value) || 0,
        PV: parseFloat(document.getElementById('PV').value) || 0
    };
    
    // Save to Firebase
    database.ref('sales/' + currentUser).push(newEntry).then(() => {
        updateTable();
        updateStockTables();
        updateAnalysis();
        salesForm.reset();
        document.getElementById('dateTime').value = new Date().toISOString().slice(0, 16);
    }).catch(error => {
        console.error("Erreur lors de l'ajout de l'entrée :", error);
        alert("Une erreur est survenue lors de l'ajout de l'entrée.");
    });
});

function updateTable() {
    const tbody = salesTable.querySelector('tbody');
    tbody.innerHTML = '';
    database.ref('sales/' + currentUser).once('value').then((snapshot) => {
        salesData = [];
        snapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val();
            entry.total = (entry.V * entry.PV).toFixed(2);
            salesData.push(entry);
        });
        renderTable(salesData);
        setupSearch();
        setupSort(salesTable);
    });
}

function updateStockTables() {
    const tables = {
        lite: document.getElementById('stockTableLite'),
        daily: document.getElementById('stockTableDaily'),
        proLite: document.getElementById('stockTableProLite'),
        proDaily: document.getElementById('stockTableProDaily'),
        data: document.getElementById('stockTableData')
    };

    Object.values(tables).forEach(table => {
        table.querySelector('tbody').innerHTML = '';
    });

    database.ref('sales/' + currentUser).once('value').then((snapshot) => {
        const latestStocks = {};
        snapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val();
            if (!latestStocks[entry.product] || new Date(entry.dateTime) > new Date(latestStocks[entry.product].dateTime)) {
                latestStocks[entry.product] = entry;
            }
        });
        
        Object.values(latestStocks).forEach((entry) => {
            let table;
            if (['1H', '2H', '3H'].includes(entry.product)) {
                table = tables.lite;
            } else if (['1J', '3J', '7J', '30J'].includes(entry.product)) {
                table = tables.daily;
            } else if (['1H Pro', '2H Pro', '3H Pro'].includes(entry.product)) {
                table = tables.proLite;
            } else if (['1J Pro', '3J Pro', '7J Pro', '30J Pro'].includes(entry.product)) {
                table = tables.proDaily;
            } else if (['1G', '5G', '10G', '25G'].includes(entry.product)) {
                table = tables.data;
            }

            if (table) {
                const row = table.querySelector('tbody').insertRow();
                row.insertCell(0).textContent = entry.product;
                row.insertCell(1).textContent = entry.SF;
                row.insertCell(2).textContent = new Date(entry.dateTime).toLocaleString();
            }
        });
        
        Object.values(tables).forEach(table => {
            setupSort(table);
        });
    });
}

// Fonction pour exporter les données vers Excel
function exportToExcel() {
    // Créer un nouveau classeur
    const wb = XLSX.utils.book_new();
    
    // Convertir les données du tableau en une feuille de calcul
    const ws = XLSX.utils.table_to_sheet(document.getElementById('salesTable'));
    
    // Ajouter la feuille au classeur
    XLSX.utils.book_append_sheet(wb, ws, "Ventes");
    
    // Générer le fichier Excel et le télécharger
    XLSX.writeFile(wb, "ventes_wifi_zone.xlsx");
}

// Ajouter un écouteur d'événements au bouton d'exportation
document.getElementById('exportExcel').addEventListener('click', exportToExcel);


// Fonction pour supprimer une entrée et actualiser les données
function deleteEntry(key) {
    database.ref(`sales/${currentUser}/${key}`).once('value')
        .then((snapshot) => {
            const deletedEntry = snapshot.val();
            return database.ref(`sales/${currentUser}/${key}`).remove()
                .then(() => {
                    console.log("Entrée supprimée avec succès");
                    return updateStockAfterDeletion(deletedEntry);
                });
        })
        .then(() => {
            // Mettre à jour l'interface utilisateur
            return updateTable();
        })
        .then(() => {
            updateStockTables();
            updateAnalysis();
        })
        .catch((error) => {
            console.error("Erreur lors de la suppression de l'entrée:", error);
        });
}

// Fonction pour mettre à jour le stock après une suppression
function updateStockAfterDeletion(deletedEntry) {
    return database.ref(`sales/${currentUser}`)
        .orderByChild('dateTime')
        .endAt(deletedEntry.dateTime)
        .limitToLast(2)
        .once('value')
        .then((snapshot) => {
            let entries = [];
            snapshot.forEach((childSnapshot) => {
                entries.push({key: childSnapshot.key, ...childSnapshot.val()});
            });
            entries.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            if (entries.length > 1 && entries[0].key !== deletedEntry.key) {
                const previousEntry = entries[1];
                const newStockFinal = previousEntry.SF + deletedEntry.V - deletedEntry.APP;
                
                return database.ref(`sales/${currentUser}/${previousEntry.key}`).update({SF: newStockFinal});
            }
            return Promise.resolve();
        });
}

// Modifier la fonction updateTable pour utiliser les données de Firebase
function updateTable() {
    return database.ref(`sales/${currentUser}`).once('value').then((snapshot) => {
        salesData = [];
        snapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val();
            entry.key = childSnapshot.key;
            entry.total = (entry.V * entry.PV).toFixed(2);
            salesData.push(entry);
        });
        renderTable(salesData);
        setupSearch();
        setupSort(salesTable);
    });
}

// Modifier la fonction renderTable pour utiliser la clé Firebase
function renderTable(data) {
    const tbody = salesTable.querySelector('tbody');
    tbody.innerHTML = '';
    data.forEach((entry) => {
        const row = tbody.insertRow();
        row.dataset.key = entry.key;
        row.insertCell(0).textContent = new Date(entry.dateTime).toLocaleString();
        row.insertCell(1).textContent = entry.product;
        row.insertCell(2).textContent = entry.SI;
        row.insertCell(3).textContent = entry.APP;
        row.insertCell(4).textContent = entry.V;
        row.insertCell(5).textContent = entry.SF;
        row.insertCell(6).textContent = entry.PV;
        row.insertCell(7).textContent = entry.total;
    });
    addDeleteIcons();
}

// Modifier la fonction addDeleteIcons pour utiliser la clé Firebase
function addDeleteIcons() {
    const rows = salesTable.querySelectorAll('tbody tr');
    rows.forEach((row) => {
        const deleteIcon = document.createElement('span');
        deleteIcon.innerHTML = '✖'; // Caractère "X"
        deleteIcon.className = 'delete-icon';
        deleteIcon.onclick = (e) => {
            e.stopPropagation(); // Empêche le déclenchement de l'événement sur la ligne
            showConfirmDialog(row.dataset.key);
        };
        row.querySelector('td:first-child').appendChild(deleteIcon);
    });
}

// Modifier la fonction showConfirmDialog pour utiliser la clé Firebase
function showConfirmDialog(key) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <p>Êtes-vous sûr de vouloir supprimer cette entrée ?</p>
        <button id="confirmDelete">Confirmer</button>
        <button id="cancelDelete">Annuler</button>
    `;
    document.body.appendChild(dialog);

    document.getElementById('confirmDelete').onclick = () => {
        deleteEntry(key);
        document.body.removeChild(dialog);
    };
    document.getElementById('cancelDelete').onclick = () => {
        document.body.removeChild(dialog);
    };
}

function setupSearch() {
    const searchInputs = document.querySelectorAll('#searchInputs input');
    searchInputs.forEach(input => {
        input.addEventListener('input', () => {
            const filteredData = salesData.filter(entry => {
                return Object.keys(entry).every(key => {
                    const searchValue = document.getElementById(`search${key.charAt(0).toUpperCase() + key.slice(1)}`)?.value.toLowerCase() || '';
                    return entry[key].toString().toLowerCase().includes(searchValue);
                });
            });
            renderTable(filteredData);
            updateAnalysis(filteredData);
        });
    });
}

function setupSort(table) {
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            const data = table.id === 'salesTable' ? salesData : stockData;
            data.sort((a, b) => {
                if (a[sortKey] < b[sortKey]) return -1;
                if (a[sortKey] > b[sortKey]) return 1;
                return 0;
            });
            if (table.id === 'salesTable') {
                renderTable(data);
                updateAnalysis(data);
            } else {
                renderStockTable(data, table);
            }
        });
    });
}

function renderStockTable(data, table) {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    data.forEach((entry) => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = entry.product;
        row.insertCell(1).textContent = entry.SF;
        row.insertCell(2).textContent = new Date(entry.dateTime).toLocaleString();
    });
}

function updateAnalysis(data = salesData) {
    let totalSales = 0;
    let count = 0;
    const chartData = {
        labels: [],
        sales: [],
        prices: []
    };

    data.forEach((entry) => {
        totalSales += entry.V * entry.PV;
        count++;
        chartData.labels.push(new Date(entry.dateTime).toLocaleString());
        chartData.sales.push(entry.V);
        chartData.prices.push(entry.PV);
    });

    const averageSales = totalSales / count || 0;

    totalSalesElement.textContent = `Total des ventes: ${totalSales.toFixed(2)} FCFA`;
    averageSalesElement.textContent = `Moyenne des ventes par jour: ${averageSales.toFixed(2)} FCFA`;

    updateChart(chartData);
    updatePeriodAnalysis(data);
}

function updateChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ventes',
                data: data.sales,
                borderColor: 'rgb(0, 255, 255)',
                tension: 0.1
            }, {
                label: 'Prix de vente',
                data: data.prices,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgb(0, 255, 255)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgb(0, 255, 255)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgb(0, 255, 255)'
                    }
                }
            }
        }
    });
}

function updatePeriodAnalysis(data) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const weekData = data.filter(entry => new Date(entry.dateTime) >= oneWeekAgo);
    const monthData = data.filter(entry => new Date(entry.dateTime) >= oneMonthAgo);
    const threeMonthData = data.filter(entry => new Date(entry.dateTime) >= threeMonthsAgo);

    updatePeriodStats(weekData, 'week');
    updatePeriodStats(monthData, 'month');
    updatePeriodStats(threeMonthData, 'threeMonth');
}

function updatePeriodStats(data, period) {
    const totalSales = data.reduce((sum, entry) => sum + entry.V * entry.PV, 0);
    const averageSales = totalSales / data.length || 0;

    document.getElementById(`${period}TotalSales`).textContent = `Total des ventes: ${totalSales.toFixed(2)} FCFA`;
    document.getElementById(`${period}AverageSales`).textContent = `Moyenne des ventes par jour: ${averageSales.toFixed(2)} FCFA`;
}

toggleAnalysisButton.addEventListener('click', function() {
    if (analysisSection.style.display === 'none' || analysisSection.style.display === '') {
        analysisSection.style.display = 'block';
        salesDetailsSection.style.display = 'none';
        this.textContent = 'Masquer l\'analyse des ventes';
        toggleSalesButton.textContent = 'Détail des ventes';
    } else {
        analysisSection.style.display = 'none';
        this.textContent = 'Analyse des ventes';
    }
});

toggleSalesButton.addEventListener('click', function() {
    if (salesDetailsSection.style.display === 'none' || salesDetailsSection.style.display === '') {
        salesDetailsSection.style.display = 'block';
        analysisSection.style.display = 'none';
        this.textContent = 'Masquer le détail des ventes';
        toggleAnalysisButton.textContent = 'Analyse des ventes';
    } else {
        salesDetailsSection.style.display = 'none';
        this.textContent = 'Détail des ventes';
    }
});

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
let isDarkTheme = true;

function setTheme(dark) {
    if (dark) {
        root.classList.remove('light-theme');
        themeToggle.textContent = '🌙';
        themeToggle.setAttribute('aria-label', 'Activer le mode clair');
    } else {
        root.classList.add('light-theme');
        themeToggle.textContent = '☀️';
        themeToggle.setAttribute('aria-label', 'Activer le mode sombre');
    }
    isDarkTheme = dark;
    localStorage.setItem('darkTheme', dark);
}

themeToggle.addEventListener('click', () => {
    setTheme(!isDarkTheme);
});

// Fonction pour détecter et appliquer le thème du système
function applySystemTheme() {
    // Vérifie si le navigateur supporte la détection du thème système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
        // Vérifie si le thème système est sombre
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Applique le thème approprié
        setTheme(isDarkMode);
        
        // Écoute les changements de thème système
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            setTheme(e.matches);
        });
    } else {
        // Si la détection du thème système n'est pas supportée, utilise le thème sombre par défaut
        setTheme(true);
    }
}

// Appelle la fonction au chargement de la page
document.addEventListener('DOMContentLoaded', applySystemTheme);

// Date filtering for stock table
document.getElementById('filterStockDates').addEventListener('click', function() {
    const startDate = new Date(document.getElementById('stockStartDate').value);
    const endDate = new Date(document.getElementById('stockEndDate').value);
    updateStockTables(startDate, endDate);
});

// Date filtering for sales table
document.getElementById('filterSalesDates').addEventListener('click', function() {
    const startDate = new Date(document.getElementById('salesStartDate').value);
    const endDate = new Date(document.getElementById('salesEndDate').value);
    const filteredData = salesData.filter(entry => {
        const entryDate = new Date(entry.dateTime);
        return (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);
    });
    renderTable(filteredData);
    updateAnalysis(filteredData);
});

// ... (Code précédent)

function updateStockTables(startDate, endDate) {
    const tables = {
        lite: document.getElementById('stockTableLite'),
        daily: document.getElementById('stockTableDaily'),
        proLite: document.getElementById('stockTableProLite'),
        proDaily: document.getElementById('stockTableProDaily'),
        data: document.getElementById('stockTableData')
    };

    Object.values(tables).forEach(table => {
        table.querySelector('tbody').innerHTML = '';
    });

    database.ref('sales/' + currentUser).once('value').then((snapshot) => {
        const latestStocks = {};
        snapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val();
            const entryDate = new Date(entry.dateTime);
            if ((!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate)) {
                if (!latestStocks[entry.product] || entryDate > new Date(latestStocks[entry.product].dateTime)) {
                    latestStocks[entry.product] = entry;
                }
            }
        });
        
        Object.values(latestStocks).forEach((entry) => {
            let table;
            if (['1H', '2H', '3H'].includes(entry.product)) {
                table = tables.lite;
            } else if (['1J', '3J', '7J', '30J'].includes(entry.product)) {
                table = tables.daily;
            } else if (['1H Pro', '2H Pro', '3H Pro'].includes(entry.product)) {
                table = tables.proLite;
            } else if (['1J Pro', '3J Pro', '7J Pro', '30J Pro'].includes(entry.product)) {
                table = tables.proDaily;
            } else if (['1G', '5G', '10G', '25G'].includes(entry.product)) {
                table = tables.data;
            }

            if (table) {
                const row = table.querySelector('tbody').insertRow();
                row.insertCell(0).textContent = entry.product;
                row.insertCell(1).textContent = entry.SF;
                row.insertCell(2).textContent = new Date(entry.dateTime).toLocaleString();
            }
        });
        
        Object.values(tables).forEach(table => {
            setupSort(table);
        });
    });
}

// Initial setup
updateTable();
updateStockTables();

// Initialisation : cacher les deux sections au démarrage
analysisSection.style.display = 'none';
salesDetailsSection.style.display = 'none';

// Mise à jour initiale des tableaux et des analyses
updateTable();
updateStockTables();
updateAnalysis();

// Initialisation du thème basé sur les préférences sauvegardées
const savedTheme = localStorage.getItem('darkTheme');
if (savedTheme !== null) {
    setTheme(savedTheme === 'true');
}