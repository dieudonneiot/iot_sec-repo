// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAtBs1DjOspomLr7StY3us2F6sKkqwxu6w",
    authDomain: "agrosmart-35284.firebaseapp.com",
    databaseURL: "https://agrosmart-35284-default-rtdb.firebaseio.com",
    projectId: "agrosmart-35284",
    storageBucket: "agrosmart-35284.appspot.com",
    messagingSenderId: "841659274599",
    appId: "1:841659274599:web:8f5ada0bde5da4b9858bc2",
    measurementId: "G-VDDJ3WM272"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const analytics = firebase.analytics();

// Déclarer les variables pour les graphiques
let npkChart;
let tempHumidityChart;

// Références Firebase
let currentUser = null;
let userSettings = null;
let sensorReadingsListener = null;
let chartsInitialized = false;

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

// Load user data
function loadUserData() {
    showLoading(true);
    
    // Simulate loading user data
    document.getElementById('user-name').textContent = currentUser.email.split('@')[0];
    document.getElementById('user-avatar').textContent = 
        document.getElementById('user-name').textContent.substring(0, 2).toUpperCase();
    
    // Setup real-time data listener
    setupSensorReadingsListener();
    
    // Show application UI
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('app-ui').style.display = 'block';
    
    // Initialiser les graphiques maintenant que l'UI est visible
    if (!chartsInitialized) {
        initCharts();
    }
    
    // Charger les données supplémentaires
    fetchWeatherData();
    fetchMarketPrices();
    loadCropHistory();
    
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
            if (sensorReadingsListener) {
                sensorReadingsListener();
                sensorReadingsListener = null;
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
        alert('Paramètres enregistrés avec succès!');
    });
}

// Écouter les données des capteurs en temps réel
function setupSensorReadingsListener() {
    if (!currentUser) return;
    
    // Chemin pour les données du capteur dans Realtime Database
    const sensorRef = database.ref('sensorReadings');
    
    // Écoute des ajouts/modifications
    sensorRef.orderByChild('timestamp').limitToLast(1).on('value', (snapshot) => {
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
        }
    });
}

// Mettre à jour l'interface avec les données des capteurs
function updateSensorUI(data) {
    if (!data) return;
    
    // Mettre à jour les valeurs des cartes
    if (data.nitrogen !== undefined) {
        document.getElementById('nitrogen-value').textContent = `${data.nitrogen} mg/kg`;
    }
    if (data.phosphorus !== undefined) {
        document.getElementById('phosphorus-value').textContent = `${data.phosphorus} mg/kg`;
    }
    if (data.potassium !== undefined) {
        document.getElementById('potassium-value').textContent = `${data.potassium} mg/kg`;
    }
    if (data.temperature !== undefined) {
        document.getElementById('temperature-value').textContent = `${data.temperature.toFixed(1)}°C`;
    }
    if (data.humidity !== undefined) {
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
    }
    if (data.ph !== undefined) {
        document.getElementById('ph-value').textContent = data.ph.toFixed(1);
    }
    
    // Mettre à jour les indicateurs de statut
    if (data.nitrogen !== undefined && data.phosphorus !== undefined && 
        data.potassium !== undefined && data.ph !== undefined) {
        updateStatusIndicators(data.nitrogen, data.phosphorus, data.potassium, data.ph);
    }
    
    // Mettre à jour l'historique
    updateHistoryTable(data);
}

// Mettre à jour le tableau historique
function updateHistoryTable(data) {
    const historyBody = document.getElementById('history-body');
    
    // Créer une nouvelle ligne pour la donnée actuelle
    const date = new Date();
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${data.nitrogen} mg/kg</td>
        <td>${data.phosphorus} mg/kg</td>
        <td>${data.potassium} mg/kg</td>
        <td>${data.temperature.toFixed(1)}°C</td>
        <td>${data.humidity}%</td>
        <td>${data.ph.toFixed(1)}</td>
        <td><span class="status-indicator status-${getStatusClass(data)}"></span> ${getStatusText(data)}</td>
    `;
    
    // Ajouter la nouvelle ligne en haut du tableau
    historyBody.insertBefore(row, historyBody.firstChild);
    
    // Limiter à 30 entrées
    if (historyBody.children.length > 30) {
        historyBody.removeChild(historyBody.lastChild);
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
    // Simuler des données météo
    const weatherData = {
        temperature: 24 + Math.floor(Math.random() * 4) - 2, // Entre 22-26°C
        description: ['Ensoleillé', 'Partiellement nuageux', 'Nuageux'][Math.floor(Math.random() * 3)],
        humidity: 60 + Math.floor(Math.random() * 10), // Entre 60-70%
        wind: 10 + Math.floor(Math.random() * 8), // Entre 10-18 km/h
        precipitation: Math.floor(Math.random() * 20), // 0-20%
        uv: ['Faible', 'Modéré', 'Élevé'][Math.floor(Math.random() * 3)]
    };
    
    // Mettre à jour l'interface
    document.getElementById('current-temp').textContent = `${weatherData.temperature}°C`;
    document.getElementById('weather-desc').textContent = weatherData.description;
    document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
    document.getElementById('wind-speed').textContent = `${weatherData.wind} km/h`;
    document.getElementById('precipitation').textContent = `${weatherData.precipitation}%`;
    document.getElementById('uv-index').textContent = weatherData.uv;
    
    // Mettre à jour l'icône météo
    const weatherIcon = document.querySelector('.weather-icon i');
    if (weatherData.description.includes('Ensoleillé')) {
        weatherIcon.className = 'fas fa-sun';
    } else if (weatherData.description.includes('nuageux')) {
        weatherIcon.className = 'fas fa-cloud';
    } else {
        weatherIcon.className = 'fas fa-cloud-sun';
    }
}

function fetchMarketPrices() {
    // Simuler des prix de marché
    const crops = [
        { name: 'Blé', price: 210, change: (Math.random() - 0.5) * 5 },
        { name: 'Maïs', price: 185, change: (Math.random() - 0.5) * 4 },
        { name: 'Soja', price: 480, change: (Math.random() - 0.5) * 6 },
        { name: 'Tournesol', price: 390, change: (Math.random() - 0.5) * 5 },
        { name: 'Colza', price: 420, change: (Math.random() - 0.5) * 4 },
        { name: 'Orge', price: 195, change: (Math.random() - 0.5) * 3 }
    ];
    
    const container = document.getElementById('market-prices');
    container.innerHTML = '';
    
    crops.forEach(crop => {
        const changeClass = crop.change >= 0 ? 'change-up' : 'change-down';
        const changeIcon = crop.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        const priceItem = document.createElement('div');
        priceItem.className = 'price-item';
        priceItem.innerHTML = `
            <div class="price-crop">${crop.name}</div>
            <div class="price-value">${crop.price} €/t</div>
            <div class="price-change ${changeClass}">
                <i class="fas ${changeIcon}"></i> ${Math.abs(crop.change).toFixed(1)}%
            </div>
        `;
        container.appendChild(priceItem);
    });
}

function loadCropHistory() {
    const historyData = [
        { year: 2023, crop: 'Blé', yield: 65 },
        { year: 2022, crop: 'Maïs', yield: 85 },
        { year: 2021, crop: 'Soja', yield: 35 },
        { year: 2020, crop: 'Jachère', yield: 0 },
        { year: 2019, crop: 'Orge', yield: 60 }
    ];
    
    const container = document.getElementById('crop-history');
    container.innerHTML = '';
    
    historyData.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'historical-item';
        historyItem.innerHTML = `
            <div class="historical-year">${item.year}</div>
            <div class="historical-crop">${item.crop}</div>
            <div class="historical-yield">${item.yield > 0 ? item.yield + ' q/ha' : '-'}</div>
        `;
        container.appendChild(historyItem);
    });
}

function setupExternalDataIntegration() {
    // Boutons pour les API externes
    document.getElementById('connect-weather').addEventListener('click', () => {
        const apiKey = document.getElementById('weather-api-key').value;
        if (apiKey) {
            document.getElementById('weather-status').className = 'api-status';
            alert('Service météo connecté avec succès!');
        } else {
            alert('Veuillez entrer une clé API valide');
        }
    });
    
    document.getElementById('connect-market').addEventListener('click', () => {
        const apiKey = document.getElementById('market-api-key').value;
        if (apiKey) {
            document.getElementById('market-status').className = 'api-status';
            alert('Données de marché connectées avec succès!');
        } else {
            alert('Veuillez entrer une clé API valide');
        }
    });
    
    document.getElementById('connect-satellite').addEventListener('click', () => {
        const apiKey = document.getElementById('satellite-api-key').value;
        if (apiKey) {
            document.getElementById('satellite-status').className = 'api-status';
            alert('Données satellitaires connectées avec succès!');
        } else {
            alert('Veuillez entrer une clé API valide');
        }
    });
    
    // Boutons de test
    document.getElementById('test-weather').addEventListener('click', () => {
        fetchWeatherData();
        alert('Données météo test récupérées avec succès!');
    });
    
    document.getElementById('test-market').addEventListener('click', () => {
        fetchMarketPrices();
        alert('Prix de marché test récupérés avec succès!');
    });
    
    document.getElementById('test-satellite').addEventListener('click', () => {
        alert('Données satellitaires test récupérées avec succès!');
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
    // Boutons pour les fonctionnalités professionnelles
    const featureButtons = document.querySelectorAll('.feature-btn');
    featureButtons.forEach(button => {
        button.addEventListener('click', () => {
            const featureName = button.closest('.feature-card').querySelector('h4').textContent;
            alert(`Fonctionnalité "${featureName}" sera bientôt disponible!`);
        });
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser les graphiques plus tard, après le chargement complet
    setTimeout(initCharts, 1000);
    
    setupNavigation();
    setupAuth();
    setupSettingsTabs();
    setupGeolocation();
    setupSettingsSave();
    
    // Phase 2 - Nouveaux modules
    setupExternalDataIntegration();
    setupWaterSettings();
    setupAISettings();
    
    // Phase 3 - Fonctionnalités professionnelles
    setupProfessionalFeatures();
    
    // Set initial status indicators
    updateStatusIndicators(128, 42, 175, 6.1);
});// Add your JavaScript code here