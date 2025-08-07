// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4EdKh-qyXqgyEYgGjfcO72EUxA2lcipQ",
    authDomain: "sara-96cfb.firebaseapp.com",
    projectId: "sara-96cfb",
    storageBucket: "sara-96cfb.firebasestorage.app",
    messagingSenderId: "707569060222",
    appId: "1:707569060222:web:b595cf338827ba35fa8b2f",
    measurementId: "G-CZWN5Y00D7"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); 
const db = firebase.firestore();
const analytics = firebase.analytics();

// Déclarer les variables pour les graphiques
let npkChart;
let tempHumidityChart;

// Références Firebase
let currentUser = null;
let userSettings = null;
let sensorReadingsRealtimeListener = null;
let chartsInitialized = false;

// Variable to store historical data fetched from Firestore
let historicalDataArray = [];

// Initialize Charts avec vérification des éléments
function initCharts() {
    // Vérifier si les éléments canvas existent
    const npkCanvas = document.getElementById('npk-chart');
    const tempHumidityCanvas = document.getElementById('temp-humidity-chart');
    
    if (!npkCanvas || !tempHumidityCanvas) {
        console.log("Les éléments canvas ne sont pas encore disponibles. Réessayez plus tard.");
        return;
    }
    
    // NPK Chart
    try {
        npkChart = new Chart(
            npkCanvas,
            {
                type: 'line',
                data: {
                    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                    datasets: [
                        {
                            label: 'Azote (N)',
                            data: [115, 118, 122, 125, 128, 125, 122, 120, 123, 128],
                            borderColor: '#4caf50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Phosphore (P)',
                            data: [38, 40, 45, 43, 42, 40, 38, 37, 39, 42],
                            borderColor: '#ff9800',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Potassium (K)',
                            data: [160, 165, 168, 170, 175, 172, 170, 168, 170, 175],
                            borderColor: '#2196f3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            }
        );
    } catch (e) {
        console.error("Erreur lors de la création du graphique NPK:", e);
    }
    
    // Temperature/Humidity Chart
    try {
        tempHumidityChart = new Chart(
            tempHumidityCanvas,
            {
                type: 'line',
                data: {
                    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                    datasets: [
                        {
                            label: 'Température (°C)',
                            data: [20.5, 21.7, 22.8, 23.5, 24.3, 23.8, 23.0, 22.5, 23.2, 24.3],
                            borderColor: '#f44336',
                            backgroundColor: 'rgba(244, 67, 54, 0.1)',
                            yAxisID: 'y',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Humidité (%)',
                            data: [72, 70, 68, 65, 63, 65, 67, 68, 66, 63],
                            borderColor: '#2196f3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            yAxisID: 'y1',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Température (°C)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            title: {
                                display: true,
                                text: 'Humidité (%)'
                            },
                            min: 50,
                            max: 80
                        }
                    }
                }
            }
        );
        
        chartsInitialized = true;
    } catch (e) {
        console.error("Erreur lors de la création du graphique température/humidité:", e);
    }
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Get page id
            const pageId = item.getAttribute('data-page');
            
            // Hide all pages
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === pageId) {
                    page.classList.add('active');
                    document.querySelector('.page-title').innerHTML = `
                        <i class="fas fa-${item.querySelector('i').classList[1].split('-')[1]}"></i>
                        ${item.querySelector('.nav-text').textContent}
                    `;
                }
            });
        });
    });
}

// Update status indicators based on values
function updateStatusIndicators(n, p, k, ph) {
    const nStatus = document.querySelector('#dashboard .card:nth-child(1) .card-status');
    const pStatus = document.querySelector('#dashboard .card:nth-child(2) .card-status');
    const kStatus = document.querySelector('#dashboard .card:nth-child(3) .card-status');
    const phStatus = document.querySelector('#dashboard .card:nth-child(6) .card-status');
    
    // Update nitrogen status
    if (n < 100) {
        nStatus.className = 'card-status status-danger';
        nStatus.textContent = 'Faible';
    } else if (n < 120) {
        nStatus.className = 'card-status status-warning';
        nStatus.textContent = 'Moyen';
    } else {
        nStatus.className = 'card-status status-optimal';
        nStatus.textContent = 'Optimal';
    }
    
    // Update phosphorus status
    if (p < 30) {
        pStatus.className = 'card-status status-danger';
        pStatus.textContent = 'Faible';
    } else if (p < 45) {
        pStatus.className = 'card-status status-warning';
        pStatus.textContent = 'Moyen';
    } else {
        pStatus.className = 'card-status status-optimal';
        pStatus.textContent = 'Optimal';
    }
    
    // Update potassium status
    if (k < 150) {
        kStatus.className = 'card-status status-danger';
        kStatus.textContent = 'Faible';
    } else if (k < 170) {
        kStatus.className = 'card-status status-warning';
        kStatus.textContent = 'Moyen';
    } else {
        kStatus.className = 'card-status status-optimal';
        kStatus.textContent = 'Optimal';
    }
    
    // Update pH status
    if (ph < 5.5 || ph > 7.5) {
        phStatus.className = 'card-status status-danger';
        phStatus.textContent = 'Inapproprié';
    } else if (ph < 6.0 || ph > 7.0) {
        phStatus.className = 'card-status status-warning';
        phStatus.textContent = 'Acceptable';
    } else {
        phStatus.className = 'card-status status-optimal';
        phStatus.textContent = 'Optimal';
    }
}

function updateCharts(data) {
    if (!npkChart || !tempHumidityChart) return;
    
    // Ajouter les nouvelles données
    npkChart.data.datasets[0].data.push(data.nitrogen);
    npkChart.data.datasets[1].data.push(data.phosphorus);
    npkChart.data.datasets[2].data.push(data.potassium);
    
    tempHumidityChart.data.datasets[0].data.push(data.temperature);
    tempHumidityChart.data.datasets[1].data.push(data.humidity);
    
    // Mettre à jour les labels (temps)
    const now = new Date();
    const timeLabel = now.getHours() + ':' + now.getMinutes();
    npkChart.data.labels.push(timeLabel);
    tempHumidityChart.data.labels.push(timeLabel);
    
    // Limiter à 10 points
    const maxPoints = 10;
    if (npkChart.data.labels.length > maxPoints) {
        npkChart.data.labels.shift();
        npkChart.data.datasets.forEach(ds => ds.data.shift());
    }
    
    if (tempHumidityChart.data.labels.length > maxPoints) {
        tempHumidityChart.data.labels.shift();
        tempHumidityChart.data.datasets.forEach(ds => ds.data.shift());
    }
    
    // Actualiser les graphiques
    npkChart.update();
    tempHumidityChart.update();
}

// Show authentication error
function showAuthError(message, elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Show/hide loading spinner
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Reset authentication forms
function resetAuthForms() {
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('register-error').style.display = 'none';
}

// Load settings from Firebase
function loadSettings(userId) {
    const settingsDocRef = db.collection('users').doc(userId).collection('settings').doc('userSettings');
    settingsDocRef.get().then((doc) => {
        if (doc.exists) {
            userSettings = doc.data();
            // Populate settings form fields
            document.getElementById('language').value = userSettings.general?.language || '';
            document.getElementById('unit-system').value = userSettings.general?.unitSystem || '';
            document.getElementById('notification-frequency').value = userSettings.general?.notificationFrequency || '';

            document.getElementById('latitude').value = userSettings.location?.latitude || '';
            document.getElementById('longitude').value = userSettings.location?.longitude || '';
            document.getElementById('altitude').value = userSettings.location?.altitude || '';
            document.getElementById('soil-type').value = userSettings.location?.soilType || '';

            document.getElementById('target-nitrogen').value = userSettings.soil?.targetNitrogen || '';
            document.getElementById('target-phosphorus').value = userSettings.soil?.targetPhosphorus || '';
            document.getElementById('target-potassium').value = userSettings.soil?.targetPotassium || '';
            document.getElementById('target-ph').value = userSettings.soil?.targetPh || '';

            console.log("User settings loaded:", userSettings);
        } else {
            console.log("No user settings found. Using default values.");
        }
    }).catch((error) => {
        console.error("Error loading user settings:", error);
    });
}

// Load user data
function loadUserData() {
    showLoading(true);
    
    // Simulate loading user data
    document.getElementById('user-name').textContent = currentUser.email.split('@')[0];
    document.getElementById('user-avatar').textContent = 
        document.getElementById('user-name').textContent.substring(0, 2).toUpperCase();
    
    // Load user settings and apply filters if on history page
    loadSettings(currentUser.uid);
    // Setup real-time data listener
    setupSensorReadingsListener();
    
    // Show application UI
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('app-ui').style.display = 'block';
    
    // Initialiser les graphiques maintenant que l'UI est visible
    if (!chartsInitialized) {
        initCharts();
    }
    
    // Charger les données supplémentaires (will be updated later)
    fetchWeatherData();
    fetchMarketPrices();
    applyFilters(); // Apply filters and load history data
    
    showLoading(false);
}

// Gestion des onglets de paramètres
function setupSettingsTabs() {
    const tabContainer = document.querySelector('.settings-container');
    if (!tabContainer) return;
    
    const tabs = tabContainer.querySelector('.tab-header').querySelectorAll('.tab');
    const tabPanes = tabContainer.querySelector('.tab-content').querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            
            const tabId = this.getAttribute('data-tab');
            const tabPane = document.getElementById(`${tabId}-tab`);
            if (tabPane) {
                tabPane.classList.add('active');
            }
        });
    });
}

// Géolocalisation
function setupGeolocation() {
    document.getElementById('get-location').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Récupérer l'altitude si disponible
                const altitude = position.coords.altitude || 0;
                document.getElementById('altitude').value = Math.round(altitude);
                
                // Afficher les coordonnées
                alert(`Position enregistrée: Latitude ${lat.toFixed(6)}, Longitude ${lng.toFixed(6)}`);
            }, error => {
                console.error('Erreur de géolocalisation:', error);
                alert('Impossible d\'obtenir votre position. Veuillez entrer manuellement.');
            });
        } else {
            alert('La géolocalisation n\'est pas prise en charge par votre navigateur.');
        }
    });
}

// Firebase Authentication
function setupAuth() {
    // Toggle between login and register forms
    document.getElementById('show-register').addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('auth-error').style.display = 'none';
    });
    
    document.getElementById('show-login').addEventListener('click', () => {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-error').style.display = 'none';
    });
    
    // Login
    document.getElementById('login-btn').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showAuthError('Veuillez remplir tous les champs', 'auth-error');
            return;
        }
        
        showLoading(true);
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                currentUser = userCredential.user;
                document.getElementById('login-form').style.display = 'none';
                loadUserData();
            })
            .catch((error) => {
                showAuthError(error.message, 'auth-error');
                showLoading(false);
            });
    });
    
    // Register
    document.getElementById('register-btn').addEventListener('click', () => {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        if (!name || !email || !password || !confirm) {
            showAuthError('Veuillez remplir tous les champs', 'register-error');
            return;
        }
        
        if (password !== confirm) {
            showAuthError('Les mots de passe ne correspondent pas', 'register-error');
            return;
        }
        
        showLoading(true);
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                currentUser = userCredential.user;
                document.getElementById('register-form').style.display = 'none';
                loadUserData();
            })
            .catch((error) => {
                showAuthError(error.message, 'register-error');
                showLoading(false);
            });
    });
    
    // Logout
    document.querySelector('.logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            currentUser = null;
            document.getElementById('auth-ui').style.display = 'block';
            document.getElementById('app-ui').style.display = 'none';
            resetAuthForms();
            
            // Remove listeners
            if (sensorReadingsRealtimeListener) {
                sensorReadingsRealtimeListener();
                sensorReadingsRealtimeListener = null;
            }
        });
    });
    
    // Check auth state
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            document.getElementById('auth-ui').style.display = 'block';
            document.getElementById('app-ui').style.display = 'none';
            resetAuthForms();
        }
    });
}

// Sauvegarder les paramètres
function setupSettingsSave() {
    document.getElementById('save-settings').addEventListener('click', () => {
        if (!currentUser) {
            console.error("Aucun utilisateur connecté. Impossible de sauvegarder les paramètres.");
            alert("Veuillez vous connecter pour sauvegarder les paramètres.");
            return;
        }

        const userId = currentUser.uid;
        const settingsDocRef = db.collection('users').doc(userId).collection('settings').doc('userSettings');
        
        // Gather settings data
        const settingsData = {
            general: {
                language: document.getElementById('language').value,
                unitSystem: document.getElementById('unit-system').value,
                notificationFrequency: document.getElementById('notification-frequency').value
            },
            location: {
                latitude: document.getElementById('latitude').value,
                longitude: document.getElementById('longitude').value,
                altitude: document.getElementById('altitude').value,
                soilType: document.getElementById('soil-type').value
            },
            soil: {
                targetNitrogen: document.getElementById('target-nitrogen').value,
                targetPhosphorus: document.getElementById('target-phosphorus').value,
                targetPotassium: document.getElementById('target-potassium').value,
                targetPh: document.getElementById('target-ph').value
            }
        };

        // Save settings to Firebase
        settingsDocRef.set(settingsData)
            .then(() => {
                alert('Paramètres enregistrés avec succès!');
            })
            .catch((error) => {
                console.error("Erreur lors de la sauvegarde des paramètres:", error);
                alert("Erreur lors de la sauvegarde des paramètres: " + error.message);
            });
    });
}

// Écouter les données des capteurs en temps réel
function setupSensorReadingsListener() {
    if (!currentUser) return;

    // Chemin pour les données du capteur dans Realtime Database
    const sensorRef = firebase.database().ref('sensorReadings');

    // Écoute des ajouts/modifications en temps réel
    sensorReadingsRealtimeListener = sensorRef.orderByChild('timestamp').limitToLast(1).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data) {
                // Obtenir la dernière lecture
                const lastKey = Object.keys(data)[0];
                const latestReading = data[lastKey];
                
                // Mettre à jour l'interface
                updateSensorUI(latestReading);
                
                // Mettre à jour les graphiques
                if (chartsInitialized) {
                    updateCharts(latestReading);
                }
            } else {
                console.log("Pas de données temps réel disponibles.");
            }
        }
    });
}

// Mettre à jour l'interface avec les données des capteurs
function updateSensorUI(data) {
    if (!data) return;
    
    // Mettre à jour les valeurs des cartes
    if (data.nitrogen !== undefined) {
        document.getElementById('nitrogen-value').textContent = `${data.nitrogen || '-'}`;
    }
    if (data.phosphorus !== undefined) {
        document.getElementById('phosphorus-value').textContent = `${data.phosphorus || '-'}`;
    }
    if (data.potassium !== undefined) {
        document.getElementById('potassium-value').textContent = `${data.potassium || '-'}`;
    }
    if (data.temperature !== undefined) {
        document.getElementById('temperature-value').textContent = `${data.temperature.toFixed(1)}°C`;
    }
    if (data.humidity !== undefined) {
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
    }
    if (data.ph !== undefined) {
        document.getElementById('ph-value').textContent = data.ph !== undefined ? data.ph.toFixed(1) : '-';
    }
    
    // Mettre à jour les indicateurs de statut
    if (data.nitrogen !== undefined && data.phosphorus !== undefined && 
        data.potassium !== undefined && data.ph !== undefined) {
        updateStatusIndicators(data.nitrogen, data.phosphorus, data.potassium, data.ph);
    }
}

// Déterminer la classe de statut
function getStatusClass(data) {
    // Logique simplifiée pour déterminer le statut
    if (data.nitrogen < 100 || data.phosphorus < 30 || data.potassium < 150 || data.ph < 5.5 || data.ph > 7.5) {
        return 'danger';
    } else if (data.nitrogen < 120 || data.phosphorus < 45 || data.potassium < 170 || data.ph < 6.0 || data.ph > 7.0) {
        return 'warning';
    }
    return 'optimal';
}

// Déterminer le texte de statut
function getStatusText(data) {
    const statusClass = getStatusClass(data);
    return statusClass === 'danger' ? 'Critique' : 
    statusClass === 'warning' ? 'Acceptable' : 'Optimal';
}

// Fonctions pour la phase 2 - Données externes
function fetchWeatherData() {
    // Placeholder for actual API call
}

function fetchMarketPrices() {
    const container = document.getElementById('market-prices');
    // Placeholder for actual API call
}

function applyFilters() {
    const periodFilter = document.getElementById('filter-period').value;
    const parameterFilter = document.getElementById('filter-parameter').value;
    const zoneFilter = document.getElementById('filter-zone').value;

    loadCropHistory(periodFilter, parameterFilter, zoneFilter);
}

// Load historical sensor data from Firestore
function loadCropHistory(period, parameter, zone) {
    const historyBody = document.getElementById('history-body');
    if (!historyBody) return;

    historyBody.innerHTML = '';

    if (!currentUser) return;
    let query = db.collection('users').doc(currentUser.uid).collection('sensorReadings');
    
    // Apply period filter
    const now = Date.now();
    let startTime;
    switch (period) {
        case 'Toute la période':
            query = query.limit(500);
            break;
        case '7 derniers jours':
            startTime = now - (7 * 24 * 60 * 60 * 1000);
            break;
        case '30 derniers jours':
            startTime = now - (30 * 24 * 60 * 60 * 1000);
            break;
        case '3 derniers mois':
            startTime = now - (90 * 24 * 60 * 60 * 1000);
            break;
        case '6 derniers mois':
            startTime = now - (180 * 24 * 60 * 60 * 1000);
            break;
        case '1 année':
            startTime = now - (365 * 24 * 60 * 60 * 1000);
            break;
    }

    if (startTime) {
        query = query.where('timestamp', '>=', startTime);
    }

    // Order by timestamp
    query = query.orderBy('timestamp', 'desc');

    // Apply zone filter
    if (zone && zone !== 'Toutes les zones') {
        query = query.where('zone', '==', zone);
    }

    const selectedParameter = parameter;

    query.get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                historicalDataArray = snapshot.docs.map(doc => doc.data());
                // Apply client-side parameter filtering
                if (selectedParameter !== 'Tous les paramètres') {
                    const dataField = selectedParameter.toLowerCase().split(' ')[0];
                    historicalDataArray = historicalDataArray.filter(data => data[dataField] !== undefined);
                }
                // Add statusText field for sorting
                historicalDataArray.forEach(item => {
                    item.statusText = getStatusText(item);
                });

                displayHistoryTable(historicalDataArray);
            } else {
                console.log('Aucune donnée historique trouvée pour les filtres sélectionnés.');
                historicalDataArray = [];
                displayHistoryTable([]);
            }
        })
        .catch((error) => {
            console.error('Erreur lors du chargement des données historiques:', error);
            historicalDataArray = [];
            displayHistoryTable([]);
        });
}

// Function to sort historical data table
function sortTable(columnIndex, sortOrder) {
    if (!historicalDataArray || historicalDataArray.length === 0) {
        return;
    }

    const columnKeys = [
        'timestamp', 'nitrogen', 'phosphorus', 'potassium', 
        'temperature', 'humidity', 'ph', 'statusText'
    ];

    const sortKey = columnKeys[columnIndex];

    historicalDataArray.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        let comparison = 0;
        if (aValue === undefined || bValue === undefined) {
            if (aValue === undefined && bValue !== undefined) comparison = -1;
            else if (aValue !== undefined && bValue === undefined) comparison = 1;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else {
            comparison = aValue - bValue;
        }

        if (sortOrder === 'desc') {
            comparison *= -1;
        }

        return comparison;
    });

    displayHistoryTable(historicalDataArray);
}

// Function to display historical data in the table
function displayHistoryTable(data) {
    const historyBody = document.getElementById('history-body');
    if (!historyBody) return;

    historyBody.innerHTML = '';

    data.forEach(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.nitrogen !== undefined ? item.nitrogen + ' mg/kg' : '-'}</td>
            <td>${item.phosphorus !== undefined ? item.phosphorus + ' mg/kg' : '-'}</td>
            <td>${item.potassium !== undefined ? item.potassium + ' mg/kg' : '-'}</td>
            <td>${item.temperature !== undefined ? item.temperature.toFixed(1) + '°C' : '-'}</td>
            <td>${item.humidity !== undefined ? item.humidity + '%' : '-'}</td>
            <td>${item.ph !== undefined ? item.ph.toFixed(1) : '-'}</td>
            <td><span class="status-indicator status-${getStatusClass(item)}"></span> ${getStatusText(item)}</td>
        `;
        historyBody.appendChild(row);
    });
}

function setupExternalDataIntegration() {
    document.getElementById('connect-weather').addEventListener('click', () => {
        // Placeholder for actual API connection
    });
    
    document.getElementById('connect-market').addEventListener('click', () => {
        // Placeholder for actual API connection
    });
    
    document.getElementById('connect-satellite').addEventListener('click', () => {
        // Placeholder for actual API connection
    });
    
    // Boutons de test
    document.getElementById('test-weather').addEventListener('click', () => {
        fetchWeatherData();
    });
    
    document.getElementById('test-market').addEventListener('click', () => {
        fetchMarketPrices();
    });
}

function setupWaterSettings() {
    const waterLevelSlider = document.getElementById('water-level');
    const waterLevelValue = document.getElementById('water-level-value');
    
    waterLevelSlider.addEventListener('input', () => {
        waterLevelValue.textContent = waterLevelSlider.value + ' m';
    });
    
    // Sélection du système d'irrigation
    const irrigationOptions = document.querySelectorAll('.system-option');
    irrigationOptions.forEach(option => {
        option.addEventListener('click', () => {
            irrigationOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

function setupAISettings() {
    // Sélection du niveau de risque
    const riskLevels = document.querySelectorAll('.risk-level');
    riskLevels.forEach(level => {
        level.addEventListener('click', () => {
            riskLevels.forEach(l => l.classList.remove('active'));
            level.classList.add('active');
        });
    });
}

// Phase 3 - Fonctionnalités professionnelles
function setupProfessionalFeatures() {
    // Add event listeners to professional feature buttons
    document.getElementById('simulate-scenarios').addEventListener('click', runScenarioSimulator);
    document.getElementById('plan-rotation').addEventListener('click', createRotationPlan);
    document.getElementById('phytosanitary-assistant').addEventListener('click', startPhytosanitaryAssistant);
    document.getElementById('optimize-resources').addEventListener('click', optimizeResources);
    document.getElementById('economic-dashboard').addEventListener('click', openEconomicDashboard);
}

// Initialize the application

// Placeholder functions for professional features
function createRotationPlan() {
    const yearsInput = document.getElementById('rotation-years-input');
    const cropsSelect = document.getElementById('rotation-crops-select');
    const outputDiv = document.getElementById('rotation-plan-output');

    const numberOfYears = parseInt(yearsInput.value);
    const selectedOptions = Array.from(cropsSelect.selectedOptions);
    const crops = selectedOptions.map(option => option.value);

    if (isNaN(numberOfYears) || numberOfYears <= 0) {
        alert('Veuillez entrer un nombre d\'années valide.');
        displayRotationPlan([]); // Clear the table
        return;
    }

    if (crops.length === 0) {
        alert('Veuillez sélectionner au moins une culture.');
        displayRotationPlan([]); // Clear the table
        return;
    }

    const rotationPlanData = [];
    for (let i = 0; i < numberOfYears; i++) {
 rotationPlanData.push({ year: i + 1, crop: crops[i % crops.length] });
    }

 displayRotationPlan(rotationPlanData);
}
function startPhytosanitaryAssistant() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour utiliser l'assistant phytosanitaire.");
        return;
    }

    // Get input values
    const selectedCrop = document.getElementById('phytosanitary-crop-select').value;
    const problemDescription = document.getElementById('phytosanitary-problem-description').value.trim();

    const resultsDiv = document.getElementById('phytosanitary-results');
    resultsDiv.innerHTML = '<h3>Résultats de l\'assistant phytosanitaire</h3>'; // Clear previous results and add a heading

    // Basic validation
    if (!selectedCrop || selectedCrop === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner une culture.</p>";
        return;
    }

    if (!problemDescription) {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez décrire le problème observé.</p>";
        return;
    }

    // --- Placeholder Diagnosis and Recommendation Logic ---
    // In a real application, this would involve:
    // - Analyzing the problem description (text analysis).
    // - Considering the selected crop.
    // - Potentially integrating with sensor data (e.g., nutrient levels, humidity).
    // - Accessing a knowledge base of pests/diseases and symptoms.
    // - Using AI models for more accurate diagnosis.

    let diagnosis = "Analyse en cours...";
    let recommendation = "Veuillez patienter.";

    // Very basic keyword matching for placeholder diagnosis
    if (problemDescription.toLowerCase().includes('feuilles jaunes')) {
        diagnosis = "Possible carence en azote ou problème d'humidité.";
        recommendation = "Vérifiez les niveaux d'azote du sol et l'arrosage.";
    } else if (problemDescription.toLowerCase().includes('taches sur les feuilles')) {
        diagnosis = "Possible infection fongique.";
        recommendation = "Envisagez l'application d'un fongicide adapté à la culture.";
    } else if (problemDescription.toLowerCase().includes('insectes')) {
        diagnosis = "Présence de ravageurs.";
        recommendation = "Identifiez l'insecte pour un traitement spécifique.";
    } else {
        diagnosis = "Problème indéterminé pour le moment.";
        recommendation = "Collectez plus d'informations ou consultez un expert local.";
    }

    // --- Update Output Display ---
    resultsDiv.innerHTML += `
        <p><strong>Culture sélectionnée:</strong> ${selectedCrop}</p>
        <p><strong>Problème décrit:</strong> ${problemDescription}</p>
        <h4>Diagnostic potentiel:</h4>
        <p>${diagnosis}</p>
        <h4>Recommandation:</h4>
        <p>${recommendation}</p>
    `;

    // In a real implementation, you would replace this placeholder logic
}
function optimizeResources() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour utiliser l'optimiseur de ressources.");
    }
 alert('Optimiseur de ressources fonction sera bientôt disponible!');
 return;
}

function openEconomicDashboard() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour accéder au tableau de bord économique.");
        return;
    }

    // Get references to output elements
    const costsOutputDiv = document.getElementById('estimated-costs-output');
    const revenueOutputDiv = document.getElementById('estimated-revenue-output');
    const profitabilityOutputDiv = document.getElementById('estimated-profitability-output');

    // Clear previous content
    costsOutputDiv.innerHTML = '';
    revenueOutputDiv.innerHTML = '';
    profitabilityOutputDiv.innerHTML = '';

    // --- Basic Placeholder Calculations ---
    const estimatedCosts = 500; // Example fixed cost
    const estimatedRevenue = 1200; // Example fixed revenue
    const estimatedProfitability = estimatedRevenue - estimatedCosts;

    // --- Update Output Display ---
 costsOutputDiv.innerHTML = `Coûts estimés: ${estimatedCosts} €`;
    revenueOutputDiv.innerHTML = `Revenus estimés: ${estimatedRevenue} €`;
    profitabilityOutputDiv.innerHTML = `Rentabilité estimée: ${estimatedProfitability} €`;

    // Call the function to fetch and display market prices
 fetchMarketPrices();
}

document.addEventListener('DOMContentLoaded', () => {
 setTimeout(initCharts, 1000);
    setupNavigation();
 setupAuth();
    setupSettingsTabs();
    setupGeolocation();
 setupSettingsSave();
 setupExternalDataIntegration();
 setupWaterSettings();
 setupAISettings();
 setupProfessionalFeatures();

    // Add event listeners to table headers for sorting
 const tableHeaders = document.querySelectorAll('.history-table thead th');
    tableHeaders.forEach((header, index) => {
 header.addEventListener('click', () => {
            if (currentSortColumn === index) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = index;
                currentSortOrder = 'asc';
            }

            tableHeaders.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
 header.classList.add(`sorted-${currentSortOrder}`);
 sortTable(currentSortColumn, currentSortOrder);
 });
    });
});

// Placeholder functions for professional features
function createRotationPlan() {
    const yearsInput = document.getElementById('rotation-years-input');
    const cropsSelect = document.getElementById('rotation-crops-select');
    const outputDiv = document.getElementById('rotation-plan-output');

    const numberOfYears = parseInt(yearsInput.value);
    const selectedOptions = Array.from(cropsSelect.selectedOptions);
    const crops = selectedOptions.map(option => option.value);

    if (isNaN(numberOfYears) || numberOfYears <= 0) {
        alert('Veuillez entrer un nombre d\'années valide.');
 displayRotationPlan([]); // Clear the table
 return;
    }

    if (crops.length === 0) {
        alert('Veuillez sélectionner au moins une culture.');
 displayRotationPlan([]); // Clear the table
 return;
    }

    const rotationPlanData = [];
    for (let i = 0; i < numberOfYears; i++) {
 rotationPlanData.push({ year: i + 1, crop: crops[i % crops.length] });
    }

 displayRotationPlan(rotationPlanData);
}
function startPhytosanitaryAssistant() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour utiliser l'assistant phytosanitaire.");
        return;
    }

    // Get input values
    const selectedCrop = document.getElementById('phytosanitary-crop-select').value;
    const problemDescription = document.getElementById('phytosanitary-problem-description').value.trim();

    const resultsDiv = document.getElementById('phytosanitary-results');
    resultsDiv.innerHTML = '<h3>Résultats de l\'assistant phytosanitaire</h3>'; // Clear previous results and add a heading

    // Basic validation
    if (!selectedCrop || selectedCrop === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner une culture.</p>";
        return;
    }

    if (!problemDescription) {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez décrire le problème observé.</p>";
        return;
    }

    // --- Placeholder Diagnosis and Recommendation Logic ---
    // In a real application, this would involve:
    // - Analyzing the problem description (text analysis).
    // - Considering the selected crop.
    // - Potentially integrating with sensor data (e.g., nutrient levels, humidity).
    // - Accessing a knowledge base of pests/diseases and symptoms.
    // - Using AI models for more accurate diagnosis.

    let diagnosis = "Analyse en cours...";
    let recommendation = "Veuillez patienter.";

    // Very basic keyword matching for placeholder diagnosis
    if (problemDescription.toLowerCase().includes('feuilles jaunes')) {
        diagnosis = "Possible carence en azote ou problème d'humidité.";
        recommendation = "Vérifiez les niveaux d'azote du sol et l'arrosage.";
    } else if (problemDescription.toLowerCase().includes('taches sur les feuilles')) {
        diagnosis = "Possible infection fongique.";
        recommendation = "Envisagez l'application d'un fongicide adapté à la culture.";
    } else if (problemDescription.toLowerCase().includes('insectes')) {
        diagnosis = "Présence de ravageurs.";
        recommendation = "Identifiez l'insecte pour un traitement spécifique.";
    } else {
        diagnosis = "Problème indéterminé pour le moment.";
        recommendation = "Collectez plus d'informations ou consultez un expert local.";
    }

    // --- Update Output Display ---
    resultsDiv.innerHTML += `
        <p><strong>Culture sélectionnée:</strong> ${selectedCrop}</p>
        <p><strong>Problème décrit:</strong> ${problemDescription}</p>
        <h4>Diagnostic potentiel:</h4>
        <p>${diagnosis}</p>
        <h4>Recommandation:</h4>
        <p>${recommendation}</p>
    `;

    // In a real implementation, you would replace this placeholder logic
}
function optimizeResources() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour utiliser l'optimiseur de ressources.");
        return;
    }

    // Get input values
    const selectedGoal = document.getElementById('optimizer-goal-select').value;
    const selectedCrop = document.getElementById('optimizer-crop-select').value;

    const resultsDiv = document.getElementById('optimizer-results');
    resultsDiv.innerHTML = '<h3>Suggestions d\'optimisation</h3>'; // Clear previous results and add a heading

    // Basic validation
    if (!selectedGoal || selectedGoal === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner un objectif d'optimisation.</p>";
        return;
    }

    if (!selectedCrop || selectedCrop === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner une culture.</p>";
        return;
    }

    // --- Placeholder Optimization Logic ---
    let suggestion = "Analyse en cours...";

    if (selectedGoal === 'Minimiser l\'utilisation d\'eau') {
        suggestion = `Pour la culture de ${selectedCrop}, réduisez l'arrosage en fonction des prévisions météo et de l'humidité du sol.`;
    } else if (selectedGoal === 'Minimiser le coût des engrais') {
        suggestion = `Pour la culture de ${selectedCrop}, basez l'application d'engrais sur les besoins réels du sol (voir données des capteurs) et évitez les excès.`;
    } else if (selectedGoal === 'Maximiser le rendement') {
         suggestion = `Pour la culture de ${selectedCrop}, assurez des niveaux optimaux de nutriments et d'humidité du sol tout au long du cycle de croissance.`;
    } else {
        suggestion = "Aucune suggestion spécifique pour cet objectif et cette culture pour le moment.";
    }
    // --- Update Output Display ---
 resultsDiv.innerHTML += `<p><strong>Objectif:</strong> ${selectedGoal}</p><p><strong>Culture:</strong> ${selectedCrop}</p><p><strong>Suggestion:</strong> ${suggestion}</p>`;
}
function openEconomicDashboard() { alert('Tableau de bord économique fonction sera bientôt disponible!'); }

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initCharts, 1000);
    setupNavigation();
    setupAuth();
    setupSettingsTabs();
    setupGeolocation();
    setupSettingsSave();
    setupExternalDataIntegration();
    setupWaterSettings();
    setupAISettings();
    setupProfessionalFeatures();
    // openEconomicDashboard(); { alert('Tableau de bord économique fonction sera bientôt disponible!'); } // Removed duplicate call and alert
    
    // Add event listeners to table headers for sorting
    const tableHeaders = document.querySelectorAll('.history-table thead th');
    tableHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            if (currentSortColumn === index) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = index;
                currentSortOrder = 'asc';
            }

            tableHeaders.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
            header.classList.add(`sorted-${currentSortOrder}`);
            sortTable(currentSortColumn, currentSortOrder);
        });
    });
});

function runScenarioSimulator() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour lancer une simulation.");
        return;
    }

    // Get input values
    const selectedCrop = document.getElementById('simulator-crop-select').value;
    const nitrogenChange = parseFloat(document.getElementById('simulator-nitrogen-input').value) || 0;
    const phChange = parseFloat(document.getElementById('simulator-ph-input').value) || 0;
    const temperatureChange = parseFloat(document.getElementById('simulator-temperature-input').value) || 0;
    const humidityChange = parseFloat(document.getElementById('simulator-humidity-input').value) || 0;
    const rainfallChange = parseFloat(document.getElementById('simulator-rainfall-input').value) || 0; // Assuming this is a percentage change

    const resultsDiv = document.getElementById('simulation-results');
    resultsDiv.innerHTML = '<h3>Résultats de la simulation</h3>'; // Clear previous results and add a heading

    // --- Placeholder Simulation Logic ---
    // In a real application, you would fetch the current sensor data
    // and apply these changes to simulate the new conditions.
    // Then, you would use a model or calculations to estimate the impact.

    // For now, let\'s use some placeholder original values
    const originalData = {
        nitrogen: 120, // Placeholder original nitrogen
        ph: 6.5,      // Placeholder original pH
        temperature: 25, // Placeholder original temperature
        humidity: 60,  // Placeholder original humidity
        rainfall: 10   // Placeholder original rainfall (e.g., daily average in mm)
    };

    const simulatedData = {
        nitrogen: originalData.nitrogen + nitrogenChange,
        ph: originalData.ph + phChange,
        temperature: originalData.temperature + temperatureChange,
        humidity: originalData.humidity + humidityChange,
        rainfall: originalData.rainfall * (1 + rainfallChange / 100) // Example: apply percentage change
    };

    // Placeholder estimated impact (replace with your logic)
    const estimatedImpact = {
        nitrogen: simulatedData.nitrogen > 150 ? "Positive" : (simulatedData.nitrogen < 100 ? "Negative" : "Neutral"),
        ph: simulatedData.ph >= 6.0 && simulatedData.ph <= 7.0 ? "Positive" : "Negative",
        temperature: simulatedData.temperature > 30 || simulatedData.temperature < 15 ? "Negative" : "Positive",
        humidity: simulatedData.humidity > 70 || simulatedData.humidity < 50 ? "Negative" : "Positive",
        rainfall: simulatedData.rainfall > 15 ? "Positive" : (simulatedData.rainfall < 5 ? "Negative" : "Neutral")
    };

    // --- Update Output Display ---
    resultsDiv.innerHTML += `
        <p><strong>Culture sélectionnée:</strong> ${selectedCrop}</p>
        <h4>Changements simulés et impacts estimés:</h4>
        <ul>
            <li>
                <strong>Azote (N):</strong>
                Original: ${originalData.nitrogen}, Simulé: ${simulatedData.nitrogen.toFixed(1)}
                Impact: ${estimatedImpact.nitrogen}
            </li>
            <li>
                <strong>pH:</strong>
                Original: ${originalData.ph}, Simulé: ${simulatedData.ph.toFixed(1)}
                Impact: ${estimatedImpact.ph}
            </li>
            <li>
                <strong>Température:</strong>
                Original: ${originalData.temperature}°C, Simulé: ${simulatedData.temperature.toFixed(1)}°C
                Impact: ${estimatedImpact.temperature}
            </li>
             <li>
                <strong>Humidité:</strong>
                Original: ${originalData.humidity}%, Simulé: ${simulatedData.humidity.toFixed(1)}%
                Impact: ${estimatedImpact.humidity}
            </li>
             <li>
                <strong>Précipitations:</strong>
                Original: ${originalData.rainfall} mm, Simulé: ${simulatedData.rainfall.toFixed(1)} mm
                Impact: ${estimatedImpact.rainfall}
            </li>
        </ul>
    `;

    // In a real implementation, you would fetch actual current sensor data
    // const currentSensorData = /* Fetch from Firebase Realtime Database or Firestore */;
    // Then use currentSensorData instead of placeholder originalData
}

function optimizeResources() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour utiliser l'optimiseur de ressources.");
        return;
    }

    // Get input values
    const selectedGoal = document.getElementById('optimizer-goal-select').value;
    const selectedCrop = document.getElementById('optimizer-crop-select').value;

    const resultsDiv = document.getElementById('optimizer-results');
    resultsDiv.innerHTML = '<h3>Suggestions d\'optimisation</h3>'; // Clear previous results and add a heading

    // Basic validation
    if (!selectedGoal || selectedGoal === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner un objectif d'optimisation.</p>";
        return;
    }

    if (!selectedCrop || selectedCrop === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner une culture.</p>";
        return;
    }

    // --- Placeholder Optimization Logic ---
    let suggestion = "Analyse en cours...";

    if (selectedGoal === 'Minimiser l\'utilisation d\'eau') {
        suggestion = `Pour la culture de ${selectedCrop}, réduisez l'arrosage en fonction des prévisions météo et de l'humidité du sol.`;
    } else if (selectedGoal === 'Minimiser le coût des engrais') {
        suggestion = `Pour la culture de ${selectedCrop}, basez l'application d'engrais sur les besoins réels du sol (voir données des capteurs) et évitez les excès.`;
    } else if (selectedGoal === 'Maximiser le rendement') {
         suggestion = `Pour la culture de ${selectedCrop}, assurez des niveaux optimaux de nutriments et d'humidité du sol tout au long du cycle de croissance.`;
    } else {
        suggestion = "Aucune suggestion spécifique pour cet objectif et cette culture pour le moment.";
    }
    // --- Update Output Display ---
    resultsDiv.innerHTML += `<p><strong>Objectif:</strong> ${selectedGoal}</p><p><strong>Culture:</strong> ${selectedCrop}</p><p><strong>Suggestion:</strong> ${suggestion}</p>`;
}

// Function to display the rotation plan in the table
function displayRotationPlan(planData) {
    const planTbody = document.getElementById('rotation-plan-tbody');
    if (!planTbody) return;

    planTbody.innerHTML = ''; // Clear previous plan

    planData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.year}</td>
            <td>${item.crop}</td>
        `;
        planTbody.appendChild(row);
    });
}

    // Get input values
    const selectedGoal = document.getElementById('optimizer-goal-select').value;
    const selectedCrop = document.getElementById('optimizer-crop-select').value;

    const resultsDiv = document.getElementById('optimizer-results');
    resultsDiv.innerHTML = '<h3>Suggestions d\'optimisation</h3>'; // Clear previous results and add a heading

    // Basic validation
    if (!selectedGoal || selectedGoal === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner un objectif d'optimisation.</p>";
        return;
    }

    if (!selectedCrop || selectedCrop === "") {
        resultsDiv.innerHTML += "<p style='color: red;'>Veuillez sélectionner une culture.</p>";
        return;
    }

    // --- Placeholder Optimization Logic ---
    let suggestion = "Analyse en cours...";

    if (selectedGoal === 'Minimiser l\'utilisation d\'eau') {
        suggestion = `Pour la culture de ${selectedCrop}, réduisez l'arrosage en fonction des prévisions météo et de l'humidité du sol.`;
    } else if (selectedGoal === 'Minimiser le coût des engrais') {
        suggestion = `Pour la culture de ${selectedCrop}, basez l'application d'engrais sur les besoins réels du sol (voir données des capteurs) et évitez les excès.`;
    } else if (selectedGoal === 'Maximiser le rendement') {
         suggestion = `Pour la culture de ${selectedCrop}, assurez des niveaux optimaux de nutriments et d'humidité du sol tout au long du cycle de croissance.`;
    } else {
        suggestion = "Aucune suggestion spécifique pour cet objectif et cette culture pour le moment.";
    }
    // --- Update Output Display ---
    resultsDiv.innerHTML += `<p><strong>Objectif:</strong> ${selectedGoal}</p><p><strong>Culture:</strong> ${selectedCrop}</p><p><strong>Suggestion:</strong> ${suggestion}</p>`;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initCharts, 1000);
    setupNavigation();
    setupAuth();
    setupSettingsTabs();
    setupGeolocation();
    setupSettingsSave();
    setupExternalDataIntegration();
    setupWaterSettings();
    setupAISettings();
    setupProfessionalFeatures();
    openEconomicDashboard(); { alert('Tableau de bord économique fonction sera bientôt disponible!'); }
    
    // Add event listeners to table headers for sorting
    const tableHeaders = document.querySelectorAll('.history-table thead th');
    tableHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            if (currentSortColumn === index) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = index;
                currentSortOrder = 'asc';
            }

            tableHeaders.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
            header.classList.add(`sorted-${currentSortOrder}`);
            sortTable(currentSortColumn, currentSortOrder);
        });
    });
});

function runScenarioSimulator() {
    if (!currentUser) {
        alert("Veuillez vous connecter pour lancer une simulation.");
        return;
    }

    // Get input values
    const selectedCrop = document.getElementById('simulator-crop-select').value;
    const nitrogenChange = parseFloat(document.getElementById('simulator-nitrogen-input').value) || 0;
    const phChange = parseFloat(document.getElementById('simulator-ph-input').value) || 0;
    const temperatureChange = parseFloat(document.getElementById('simulator-temperature-input').value) || 0;
    const humidityChange = parseFloat(document.getElementById('simulator-humidity-input').value) || 0;
    const rainfallChange = parseFloat(document.getElementById('simulator-rainfall-input').value) || 0; // Assuming this is a percentage change

    const resultsDiv = document.getElementById('simulation-results');
    resultsDiv.innerHTML = '<h3>Résultats de la simulation</h3>'; // Clear previous results and add a heading

    // --- Placeholder Simulation Logic ---
    // In a real application, you would fetch the current sensor data
    // and apply these changes to simulate the new conditions.
    // Then, you would use a model or calculations to estimate the impact.

    // For now, let's use some placeholder original values
    const originalData = {
        nitrogen: 120, // Placeholder original nitrogen
        ph: 6.5,      // Placeholder original pH
        temperature: 25, // Placeholder original temperature
        humidity: 60,  // Placeholder original humidity
        rainfall: 10   // Placeholder original rainfall (e.g., daily average in mm)
    };

    const simulatedData = {
        nitrogen: originalData.nitrogen + nitrogenChange,
        ph: originalData.ph + phChange,
        temperature: originalData.temperature + temperatureChange,
        humidity: originalData.humidity + humidityChange,
        rainfall: originalData.rainfall * (1 + rainfallChange / 100) // Example: apply percentage change
    };

    // Placeholder estimated impact (replace with your logic)
    const estimatedImpact = {
        nitrogen: simulatedData.nitrogen > 150 ? "Positive" : (simulatedData.nitrogen < 100 ? "Negative" : "Neutral"),
        ph: simulatedData.ph >= 6.0 && simulatedData.ph <= 7.0 ? "Positive" : "Negative",
        temperature: simulatedData.temperature > 30 || simulatedData.temperature < 15 ? "Negative" : "Positive",
        humidity: simulatedData.humidity > 70 || simulatedData.humidity < 50 ? "Negative" : "Positive",
        rainfall: simulatedData.rainfall > 15 ? "Positive" : (simulatedData.rainfall < 5 ? "Negative" : "Neutral")
    };

    // --- Update Output Display ---
    resultsDiv.innerHTML += `
        <p><strong>Culture sélectionnée:</strong> ${selectedCrop}</p>
        <h4>Changements simulés et impacts estimés:</h4>
        <ul>
            <li>
                <strong>Azote (N):</strong>
                Original: ${originalData.nitrogen}, Simulé: ${simulatedData.nitrogen.toFixed(1)}
                Impact: ${estimatedImpact.nitrogen}
            </li>
            <li>
                <strong>pH:</strong>
                Original: ${originalData.ph}, Simulé: ${simulatedData.ph.toFixed(1)}
                Impact: ${estimatedImpact.ph}
            </li>
            <li>
                <strong>Température:</strong>
                Original: ${originalData.temperature}°C, Simulé: ${simulatedData.temperature.toFixed(1)}°C
                Impact: ${estimatedImpact.temperature}
            </li>
             <li>
                <strong>Humidité:</strong>
                Original: ${originalData.humidity}%, Simulé: ${simulatedData.humidity.toFixed(1)}%
                Impact: ${estimatedImpact.humidity}
            </li>
             <li>
                <strong>Précipitations:</strong>
                Original: ${originalData.rainfall} mm, Simulé: ${simulatedData.rainfall.toFixed(1)} mm
                Impact: ${estimatedImpact.rainfall}
            </li>
        </ul>
    `;

    // In a real implementation, you would fetch actual current sensor data
    // const currentSensorData = /* Fetch from Firebase Realtime Database or Firestore */;
    // Then use currentSensorData instead of placeholder originalData
}

// Function to display the rotation plan in the table
function displayRotationPlan(planData) {
    const planTbody = document.getElementById('rotation-plan-tbody');
    if (!planTbody) return;

    planTbody.innerHTML = ''; // Clear previous plan

    planData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.year}</td>
            <td>${item.crop}</td>
        `;
        planTbody.appendChild(row);
    });
}

// Variables for sorting historical data
let currentSortColumn = -1;
let currentSortOrder = 'asc';