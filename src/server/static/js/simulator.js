// Глобальные переменные
let metricsChart;
let parametersChart;
const history = {
    timestamps: [],
    eta: [],
    energy: [],
    anode: [],
    temperature: [],
    concentration: []
};

// Журнал экспериментов для сохранения
const experimentsHistory = [];

// Токен аутентификации
let authToken = localStorage.getItem('authToken') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Функция для выполнения запроса к API с обработкой ошибок
async function apiRequest(url, options = {}) {
    try {
        // Добавляем токен в заголовки, если он есть
        if (authToken) {
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(url, options);
        
        // Обработка ошибок авторизации
        if (response.status === 401) {
            // Токен недействителен, очищаем данные
            authToken = null;
            currentUser = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            document.getElementById('auth-buttons').style.display = 'block';
            document.getElementById('user-info').style.display = 'none';
            showWarning('warning', 'Сессия истекла. Пожалуйста, войдите снова.');
            return null;
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Ошибка при запросе к ${url}:`, error);
        showWarning('danger', `Ошибка сервера: ${error.message}`);
        return null;
    }
}

// Функция для выполнения запроса к API для симуляции
async function simulateProcess(params) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    };
    
    return await apiRequest('/api/simulate', options);
}

// Функция обновления состояния индикаторов
function updateStatusIndicators(eta, voltage, temperature, concentration) {
    // Определение цвета для выхода по току
    const etaIndicator = document.getElementById('eta-card').querySelector('.status-indicator');
    if (eta >= 90) {
        etaIndicator.className = 'status-indicator status-green';
    } else if (eta >= 80) {
        etaIndicator.className = 'status-indicator status-yellow';
    } else {
        etaIndicator.className = 'status-indicator status-red';
    }
    
    // Расчет и определение цвета для удельного расхода энергии
    const energy = calculateEnergyConsumption(voltage, eta);
    const energyIndicator = document.getElementById('energy-card').querySelector('.status-indicator');
    if (energy <= 14000) {
        energyIndicator.className = 'status-indicator status-green';
    } else if (energy <= 15000) {
        energyIndicator.className = 'status-indicator status-yellow';
    } else {
        energyIndicator.className = 'status-indicator status-red';
    }
    
    // Расчет и определение цвета для расхода анода
    const anode = calculateAnodeConsumption(eta);
    const anodeIndicator = document.getElementById('anode-card').querySelector('.status-indicator');
    if (anode <= 340) {
        anodeIndicator.className = 'status-indicator status-green';
    } else if (anode <= 360) {
        anodeIndicator.className = 'status-indicator status-yellow';
    } else {
        anodeIndicator.className = 'status-indicator status-red';
    }
    
    // Обновление цвета электролита в зависимости от температуры
    const electrolyte = document.getElementById('electrolyte');
    if (temperature < 950) {
        electrolyte.style.background = 'linear-gradient(to bottom, #7f1d1d, #450a0a)';
        electrolyte.style.opacity = '0.9';
    } else if (temperature > 970) {
        electrolyte.style.background = 'linear-gradient(to bottom, #dc2626, #991b1b)';
        electrolyte.style.opacity = '0.9';
    } else if (temperature > 965) {
        electrolyte.style.background = 'linear-gradient(to bottom, #f97316, #c2410c)';
        electrolyte.style.opacity = '0.85';
    } else if (temperature < 955) {
        electrolyte.style.background = 'linear-gradient(to bottom, #1e3a8a, #1e40af)';
        electrolyte.style.opacity = '0.85';
    } else {
        electrolyte.style.background = 'linear-gradient(to bottom, #1e3a8a, #0f172a)';
        electrolyte.style.opacity = '0.8';
    }
    
    // Обновление уровня алюминия в зависимости от силы тока
    const current = parseFloat(document.getElementById('current-value').textContent);
    const aluminumLayer = document.getElementById('aluminum-layer');
    const aluminumHeight = Math.min(80, 20 + (current - 200) / 50);
    aluminumLayer.style.height = `${aluminumHeight}px`;
}

// Вспомогательные функции для локальных расчетов (только для визуализации)
function calculateEnergyConsumption(voltage, eta) {
    const g_Al = 0.3356; // Электрохимический эквивалент алюминия (г/А·ч)
    return Math.round((voltage * 1000) / (g_Al * (eta / 100)));
}

function calculateAnodeConsumption(eta) {
    return Math.round(334 / (eta / 100));
}

// Функция отображения предупреждений
function showWarning(type, message) {
    const warningElement = type === 'danger' ? 
        document.getElementById('danger-warning') : 
        document.getElementById('warning-warning');
    
    if (message) {
        warningElement.textContent = message;
    }
    
    warningElement.classList.add('show');
    setTimeout(() => {
        warningElement.classList.remove('show');
    }, 5000);
}

// Функция обработки критических сбоев
function handleCriticalFailure(isFailure, failureType) {
    const failureOverlay = document.getElementById('failure-overlay');
    const failureText = document.getElementById('failure-text');
    
    if (isFailure) {
        failureOverlay.classList.add('active');
        failureText.textContent = failureType;
        // Создаем "искры" при анодном эффекте
        if (failureType.includes('Анодный Эффект')) {
            createSparks();
        }
    } else {
        failureOverlay.classList.remove('active');
    }
}

// Функция создания искр
function createSparks() {
    const electrolyzer = document.querySelector('.electrolyzer');
    // Очищаем предыдущие искры
    document.querySelectorAll('.spark').forEach(spark => spark.remove());
    
    const rect = electrolyzer.getBoundingClientRect();
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const spark = document.createElement('div');
            spark.className = 'spark';
            // Случайное положение около анода
            const left = rect.left + rect.width * 0.4 + Math.random() * rect.width * 0.2;
            const top = rect.top + 50 + Math.random() * 100;
            spark.style.left = `${left - rect.left}px`;
            spark.style.top = `${top - rect.top}px`;
            electrolyzer.appendChild(spark);
            
            // Анимация искры
            spark.style.opacity = '1';
            spark.style.transform = `translate(${Math.random() * 40 - 20}px, ${-Math.random() * 60}px) scale(${1 + Math.random() * 2})`;
            
            setTimeout(() => {
                spark.remove();
            }, 1000);
        }, i * 100);
    }
}

// Функция создания ионов
function createIon(type) {
    const electrolyzer = document.querySelector('.electrolyzer');
    const rect = electrolyzer.getBoundingClientRect();
    const ion = document.createElement('div');
    ion.className = `ion ion-${type}`;
    
    if (type === 'al') {
        // Ионы алюминия движутся к катоду (вниз)
        const left = rect.left + 50 + Math.random() * (rect.width - 100);
        const top = rect.top + 50 + Math.random() * 100;
        ion.style.left = `${left - rect.left}px`;
        ion.style.top = `${top - rect.top}px`;
        ion.style.animation = `move-ion 6s infinite linear`;
    } else {
        // Ионы кислорода движутся к аноду (вверх)
        const left = rect.left + 50 + Math.random() * (rect.width - 100);
        const top = rect.top + 200 + Math.random() * 150;
        ion.style.left = `${left - rect.left}px`;
        ion.style.top = `${top - rect.top}px`;
        ion.style.animation = `move-ion 4s infinite linear reverse`;
    }
    
    electrolyzer.appendChild(ion);
    
    // Удаляем ион через некоторое время
    setTimeout(() => {
        if (ion.parentNode) {
            ion.parentNode.removeChild(ion);
        }
    }, 8000);
}

// Функция создания пузырьков CO2
function createBubble() {
    const electrolyzer = document.querySelector('.electrolyzer');
    const rect = electrolyzer.getBoundingClientRect();
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Пузырьки поднимаются от анода
    const left = rect.left + rect.width * 0.4 + Math.random() * rect.width * 0.2;
    const top = rect.top + 80 + Math.random() * 40;
    bubble.style.left = `${left - rect.left}px`;
    bubble.style.top = `${top - rect.top}px`;
    
    electrolyzer.appendChild(bubble);
    
    // Удаляем пузырек через некоторое время
    setTimeout(() => {
        if (bubble.parentNode) {
            bubble.parentNode.removeChild(bubble);
        }
    }, 3000);
}

// Функция обновления графиков
function updateCharts(eta, energy, anode, temperature, concentration) {
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Обновляем историю данных
    history.timestamps.push(now);
    history.eta.push(eta);
    history.energy.push(energy);
    history.anode.push(anode);
    history.temperature.push(temperature);
    history.concentration.push(concentration);
    
    // Ограничиваем историю последними 20 точками
    if (history.timestamps.length > 20) {
        history.timestamps.shift();
        history.eta.shift();
        history.energy.shift();
        history.anode.shift();
        history.temperature.shift();
        history.concentration.shift();
    }
    
    if (metricsChart) {
        // Обновляем первый график (метрики эффективности)
        metricsChart.data.labels = history.timestamps;
        metricsChart.data.datasets[0].data = history.eta;
        metricsChart.data.datasets[1].data = history.energy.map(e => e / 1000); // Для масштаба
        metricsChart.data.datasets[2].data = history.anode.map(a => a / 10); // Для масштаба
        metricsChart.update();
    }
    
    if (parametersChart) {
        // Обновляем второй график (параметры)
        parametersChart.data.labels = history.timestamps;
        parametersChart.data.datasets[0].data = history.temperature;
        parametersChart.data.datasets[1].data = history.concentration;
        parametersChart.update();
    }
}

// Функция обновления всех расчетов через API
async function updateSimulation() {
    // Получаем текущие значения параметров
    const currentSlider = document.getElementById('current-slider');
    const voltageSlider = document.getElementById('voltage-slider');
    const temperatureSlider = document.getElementById('temperature-slider');
    const concentrationSlider = document.getElementById('concentration-slider');
    
    const current = parseInt(currentSlider.value);
    const voltage = parseFloat(voltageSlider.value) / 10;
    const temperature = parseInt(temperatureSlider.value);
    const concentration = parseFloat(concentrationSlider.value) / 10;
    
    // Обновляем отображение значений
    document.getElementById('current-value').textContent = `${current} кА`;
    document.getElementById('voltage-value').textContent = `${voltage.toFixed(1)} В`;
    document.getElementById('temperature-value').textContent = `${temperature} °C`;
    document.getElementById('concentration-value').textContent = `${concentration.toFixed(1)} %`;
    
    // Проверка критического напряжения (локальная проверка для быстрого отклика)
    if (voltage < 4.0) {
        showWarning('danger', 'Опасность короткого замыкания!');
    }
    
    // Выполнение запроса к API
    const result = await simulateProcess({
        current: current,
        voltage: voltage,
        temperature: temperature,
        concentration: concentration
    });
    
    if (result) {
        // Обновление отображения метрик
        document.getElementById('eta-value').textContent = `${result.eta}%`;
        document.getElementById('energy-value').textContent = `${result.energy_consumption}`;
        document.getElementById('anode-value').textContent = `${result.anode_consumption}`;
        
        // Обновление индикаторов состояния
        updateStatusIndicators(result.eta, voltage, temperature, concentration);
        
        // Обработка критических сбоев
        handleCriticalFailure(result.critical_failure, result.warning_message);
        
        // Обновление графиков
        updateCharts(
            result.eta, 
            result.energy_consumption, 
            result.anode_consumption, 
            temperature, 
            concentration
        );
        
        // Сохраняем эксперимент в историю для возможного сохранения
        const experimentLog = {
            timestamp: new Date().toISOString(),
            parameters: {
                current: current,
                voltage: voltage,
                temperature: temperature,
                concentration: concentration
            },
            results: result
        };
        experimentsHistory.push(experimentLog);
        
        // Вызов предупреждения при отклонении от оптимума
        if (result.warning_message && !result.critical_failure && voltage >= 4.0) {
            showWarning('warning', result.warning_message);
        } else if (result.eta < 85 || Math.abs(temperature - 960) > 5 || Math.abs(concentration - 4.0) > 0.8) {
            showWarning('warning', 'Параметры отклонены от оптимальных значений');
        }
    }
}

// Функция сохранения журнала экспериментов
async function saveExperimentHistory() {
    if (!authToken) {
        showWarning('warning', 'Для сохранения экспериментов необходимо войти в систему');
        return;
    }
    
    const experimentName = document.getElementById('experiment-name').value.trim();
    if (!experimentName) {
        showWarning('warning', 'Пожалуйста, введите название эксперимента');
        return;
    }
    
    if (experimentsHistory.length === 0) {
        showWarning('warning', 'Нет экспериментов для сохранения');
        return;
    }
    
    const saveButton = document.getElementById('save-experiment-btn');
    saveButton.disabled = true;
    saveButton.textContent = 'Сохранение...';
    
    const payload = {
    experiment_name: experimentName,
    experiments: experimentsHistory.map(exp => ({
        timestamp: exp.timestamp,
        parameters: exp.parameters,
        results: {
            eta: exp.results.eta,
            energy_consumption: exp.results.energy_consumption,
            anode_consumption: exp.results.anode_consumption,
            critical_failure: exp.results.critical_failure,
            warning_message: exp.results.warning_message,
            timestamp: exp.timestamp  // Добавляем timestamp внутрь results
        }
    }))
};
    
    const result = await apiRequest('/api/experiments/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
    
    saveButton.disabled = false;
    saveButton.textContent = 'Сохранить историю';
    
    if (result && result.success) {
        showWarning('warning', 'История экспериментов успешно сохранена!');
        // Очищаем историю после сохранения
        experimentsHistory.length = 0;
    }
}

// Функция загрузки списка экспериментов пользователя
async function loadUserExperiments() {
    if (!authToken) {
        showWarning('warning', 'Для просмотра экспериментов необходимо войти в систему');
        return;
    }
    
    const result = await apiRequest('/api/experiments');
    
    if (result) {
        displayExperimentsList(result.experiment_histories);
    }
}

// Функция отображения списка экспериментов
function displayExperimentsList(experiments) {
    const experimentsList = document.getElementById('experiments-list');
    
    if (experiments.length === 0) {
        experimentsList.innerHTML = '<p class="no-experiments">У вас пока нет сохраненных экспериментов.</p>';
        return;
    }
    
    let html = '';
    experiments.forEach(exp => {
        const date = new Date(exp.created_at);
        html += `
            <div class="experiment-item" data-id="${exp.id}">
                <div class="experiment-name">${exp.experiment_name}</div>
                <div class="experiment-date">Создан: ${date.toLocaleDateString()} в ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
    });
    
    experimentsList.innerHTML = html;
    
    // Добавляем обработчики кликов по экспериментам
    document.querySelectorAll('.experiment-item').forEach(item => {
        item.addEventListener('click', async () => {
            const experimentId = item.getAttribute('data-id');
            await loadExperimentDetails(experimentId);
        });
    });
}

// Функция загрузки деталей эксперимента
async function loadExperimentDetails(experimentId) {
    const result = await apiRequest(`/api/experiments/${experimentId}`);
    
    if (result) {
        displayExperimentDetails(result);
    }
}

// Функция отображения деталей эксперимента
function displayExperimentDetails(experiment) {
    const modal = document.getElementById('experiment-details-modal');
    const title = document.getElementById('experiment-details-title');
    const content = document.getElementById('experiment-details-content');
    
    title.textContent = experiment.experiment_name;
    
    // Формируем содержимое
    let html = `
        <div class="experiment-summary">
            <h3>Общая информация</h3>
            <p><strong>Количество экспериментов:</strong> ${experiment.experiments.length}</p>
            <p><strong>Первый эксперимент:</strong> ${new Date(experiment.experiments[0].timestamp).toLocaleString()}</p>
            <p><strong>Последний эксперимент:</strong> ${new Date(experiment.experiments[experiment.experiments.length-1].timestamp).toLocaleString()}</p>
        </div>
        
        <table class="experiment-table">
            <thead>
                <tr>
                    <th>Время</th>
                    <th>Выход по току (η)</th>
                    <th>Энергия (кВт·ч/т)</th>
                    <th>Анод (кг/т)</th>
                    <th>Температура (°C)</th>
                    <th>Глинозём (%)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    experiment.experiments.forEach(exp => {
        const date = new Date(exp.timestamp);
        const etaClass = exp.results.eta >= 90 ? 'experiment-eta-good' : 
                        exp.results.eta >= 80 ? 'experiment-eta-warning' : 'experiment-eta-bad';
        
        html += `
            <tr>
                <td>${date.toLocaleTimeString()}</td>
                <td class="${etaClass}">${exp.results.eta}%</td>
                <td>${exp.results.energy_consumption}</td>
                <td>${exp.results.anode_consumption}</td>
                <td>${exp.parameters.temperature}</td>
                <td>${exp.parameters.concentration}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    content.innerHTML = html;
    modal.style.display = 'flex';
}

// Функция регистрации пользователя
async function registerUser(username, password) {
    const result = await apiRequest('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    });
    
    return result;
}

// Функция входа пользователя
async function loginUser(username, password) {
    const result = await apiRequest('/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'username': username,
            'password': password,
            'grant_type': 'password'
        })
    });
    
    return result;
}

// Функция выхода пользователя
function logoutUser() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    document.getElementById('auth-buttons').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('save-experiment-section').style.display = 'none';
    showWarning('warning', 'Вы успешно вышли из системы');
}

// Функция инициализации аутентификации
function initAuth() {
    // Проверяем, есть ли сохраненный токен
    if (authToken && currentUser) {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('username-display').textContent = currentUser.username;
        
        // Показываем раздел сохранения экспериментов для авторизованных пользователей
        document.getElementById('save-experiment-section').style.display = 'block';
        
        // Загружаем список экспериментов
        loadUserExperiments();
    }
    
    // Обработчики для кнопок аутентификации
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'flex';
    });
    
    document.getElementById('register-btn').addEventListener('click', () => {
        document.getElementById('register-modal').style.display = 'flex';
    });
    
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    
    document.getElementById('experiments-btn').addEventListener('click', () => {
        if (authToken) {
            loadUserExperiments();
            document.getElementById('experiments-modal').style.display = 'flex';
        } else {
            showWarning('warning', 'Для просмотра экспериментов необходимо войти в систему');
        }
    });
    
    // Обработчики для модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.parentElement.parentElement.style.display = 'none';
        });
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Обработчик формы регистрации
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        const result = await registerUser(username, password);
        
        if (result && result.access_token) {
            // Сохраняем токен и информацию о пользователе
            authToken = result.access_token;
            currentUser = { username };
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Закрываем модальное окно
            document.getElementById('register-modal').style.display = 'none';
            
            // Обновляем интерфейс
            document.getElementById('auth-buttons').style.display = 'none';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('username-display').textContent = username;
            document.getElementById('save-experiment-section').style.display = 'block';
            
            showWarning('warning', 'Регистрация успешна! Добро пожаловать!');
        }
    });
    
    // Обработчик формы входа
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        const result = await loginUser(username, password);
        
        if (result && result.access_token) {
            // Сохраняем токен и информацию о пользователе
            authToken = result.access_token;
            currentUser = { username };
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Закрываем модальное окно
            document.getElementById('login-modal').style.display = 'none';
            
            // Обновляем интерфейс
            document.getElementById('auth-buttons').style.display = 'none';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('username-display').textContent = username;
            document.getElementById('save-experiment-section').style.display = 'block';
            
            showWarning('warning', 'Вход успешен! Добро пожаловать!');
            
            // Загружаем список экспериментов
            loadUserExperiments();
        }
    });
    
    // Переключение между формами
    document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('register-modal').style.display = 'flex';
    });
    
    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('login-modal').style.display = 'flex';
    });
    
    // Обработчик кнопки сохранения эксперимента
    document.getElementById('save-experiment-btn').addEventListener('click', saveExperimentHistory);
}

// Инициализация графиков
function initCharts() {
    const ctx1 = document.getElementById('metrics-chart').getContext('2d');
    metricsChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Выход по току (η), %',
                    data: [],
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.1)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                    fill: true
                },
                {
                    label: 'Удельный расход энергии, тыс. кВт·ч/т',
                    data: [],
                    borderColor: '#dd6b20',
                    backgroundColor: 'rgba(221, 107, 32, 0.1)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                    fill: true,
                    yAxisID: 'y1'
                },
                {
                    label: 'Расход анода, 10 кг/т',
                    data: [],
                    borderColor: '#3182ce',
                    backgroundColor: 'rgba(49, 130, 206, 0.1)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e2e8f0',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#ffd700',
                    bodyColor: '#e2e8f0',
                    borderColor: '#4a5568',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.2)'
                    }
                },
                y: {
                    position: 'left',
                    min: 60,
                    max: 95,
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.2)'
                    },
                    title: {
                        display: true,
                        text: 'Выход по току, %',
                        color: '#e2e8f0'
                    }
                },
                y1: {
                    position: 'right',
                    min: 12,
                    max: 16,
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Другие показатели (масштаб)',
                        color: '#e2e8f0'
                    }
                }
            }
        }
    });
    
    const ctx2 = document.getElementById('parameters-chart').getContext('2d');
    parametersChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Температура, °C',
                    data: [],
                    borderColor: '#e53e3e',
                    backgroundColor: 'rgba(229, 62, 62, 0.1)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                    fill: true
                },
                {
                    label: 'Концентрация глинозёма, %',
                    data: [],
                    borderColor: '#93c5fd',
                    backgroundColor: 'rgba(147, 197, 253, 0.1)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
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
                    labels: {
                        color: '#e2e8f0',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#ffd700',
                    bodyColor: '#e2e8f0',
                    borderColor: '#4a5568',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.2)'
                    }
                },
                y: {
                    position: 'left',
                    min: 0,
                    max: 100,
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.2)'
                    },
                    title: {
                        display: true,
                        text: 'Значения параметров',
                        color: '#e2e8f0'
                    }
                }
            }
        }
    });
}

// Инициализация симулятора
function initSimulator() {
    // Инициализация аутентификации
    initAuth();
    
    // Инициализация графиков
    initCharts();
    
    // Установка обработчиков событий для слайдеров
    const sliders = [
        'current-slider', 
        'voltage-slider', 
        'temperature-slider', 
        'concentration-slider'
    ];
    
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        slider.addEventListener('input', updateSimulation);
    });
    
    // Инициализация с оптимальными значениями
    updateSimulation();
    
    // Запуск анимации процесса
    setInterval(() => {
        // Создаем ионы алюминия (чаще)
        if (Math.random() > 0.3) {
            createIon('al');
        }
        // Создаем ионы кислорода (реже)
        if (Math.random() > 0.6) {
            createIon('o');
        }
        // Создаем пузырьки CO2 (зависит от концентрации глинозёма)
        const concentration = parseFloat(document.getElementById('concentration-value').textContent);
        if (concentration > 2.5 && Math.random() > 0.4) {
            createBubble();
        }
    }, 300);
    
    // Периодическое обновление данных
    setInterval(updateSimulation, 5000);
}

// Запуск симулятора при загрузке страницы
document.addEventListener('DOMContentLoaded', initSimulator);