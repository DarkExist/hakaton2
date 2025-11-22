// Глобальные переменные
let alloyComparisonChart;
let elementsImpactChart;
let authToken = localStorage.getItem('authToken') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let lastCalculationResult = null;

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
            document.getElementById('save-alloy-section').style.display = 'none';
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

// Функция отображения предупреждений
function showWarning(type, message) {
    const warningElement = document.getElementById(`${type}-warning`);
    if (message) {
        warningElement.textContent = message;
    }
    warningElement.classList.add('show');
    setTimeout(() => {
        warningElement.classList.remove('show');
    }, 5000);
}

// Функция проверки суммы компонентов
function calculateTotal() {
    const sliders = ['al', 'mg', 'si', 'cu', 'zn', 'mn', 'ti', 'fe', 'other'];
    let total = 0;
    
    sliders.forEach(element => {
        const value = parseFloat(document.getElementById(`${element}-slider`).value) / 10;
        total += value;
    });
    
    const totalElement = document.getElementById('total-value');
    totalElement.textContent = total.toFixed(1) + ' %';
    
    // Обновление цвета индикатора суммы
    if (Math.abs(total - 100) < 0.5) {
        totalElement.style.color = '#38a169'; // Зеленый
    } else if (Math.abs(total - 100) < 2) {
        totalElement.style.color = '#dd6b20'; // Желтый
    } else {
        totalElement.style.color = '#e53e3e'; // Красный
    }
    
    return total;
}

// Функция обновления отображения значений слайдеров
function updateSliderValues() {
    const sliders = ['al', 'mg', 'si', 'cu', 'zn', 'mn', 'ti', 'fe', 'other'];
    
    sliders.forEach(element => {
        const slider = document.getElementById(`${element}-slider`);
        const value = parseFloat(slider.value) / 10;
        document.getElementById(`${element}-value`).textContent = value.toFixed(1) + ' %';
    });
    
    calculateTotal();
}

// Функция сброса значений по умолчанию
function resetToDefaults() {
    // Базовый сплав 6061 (Al-Mg-Si)
    const defaultValues = {
        al: 975,   // 97.5%
        mg: 10,    // 1.0%
        si: 6,     // 0.6%
        cu: 4,     // 0.4%
        zn: 0,     // 0.0%
        mn: 0,     // 0.0%
        ti: 0,     // 0.0%
        fe: 3,     // 0.3%
        other: 2   // 0.2%
    };
    
    Object.entries(defaultValues).forEach(([element, value]) => {
        document.getElementById(`${element}-slider`).value = value;
    });
    
    updateSliderValues();
}

// Функция расчета свойств сплава
async function calculateAlloyProperties() {
    const total = calculateTotal();
    
    // Проверка суммы компонентов
    if (Math.abs(total - 100) > 2.0) {
        showWarning('danger', 'Сумма компонентов должна быть близка к 100%');
        return;
    } else if (Math.abs(total - 100) > 0.5) {
        showWarning('warning', 'Предупреждение: сумма компонентов не равна 100%. Результаты могут быть неточными.');
    }
    
    // Получение значений слайдеров
    const composition = {
        al: parseFloat(document.getElementById('al-slider').value) / 10,
        mg: parseFloat(document.getElementById('mg-slider').value) / 10,
        si: parseFloat(document.getElementById('si-slider').value) / 10,
        cu: parseFloat(document.getElementById('cu-slider').value) / 10,
        zn: parseFloat(document.getElementById('zn-slider').value) / 10,
        mn: parseFloat(document.getElementById('mn-slider').value) / 10,
        ti: parseFloat(document.getElementById('ti-slider').value) / 10,
        fe: parseFloat(document.getElementById('fe-slider').value) / 10,
        other: parseFloat(document.getElementById('other-slider').value) / 10
    };
    
    // Отправка запроса к API
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(composition)
    };
    
    const result = await apiRequest('/api/alloy-calculator', options);
    
    if (result) {
        lastCalculationResult = result;
        displayResults(result);
        updateCharts(result);
        showWarning('success', 'Расчет успешно выполнен!');
    }
}

// Функция отображения результатов
function displayResults(result) {
    // Переключение отображения placeholder и результатов
    document.getElementById('results-placeholder').style.display = 'none';
    document.getElementById('results-content').style.display = 'block';
    
    // Обновление значений свойств
    document.getElementById('tensile-strength-value').textContent = result.properties.tensile_strength;
    document.getElementById('yield-strength-value').textContent = result.properties.yield_strength;
    document.getElementById('elongation-value').textContent = result.properties.elongation;
    document.getElementById('hardness-value').textContent = result.properties.hardness;
    document.getElementById('density-value').textContent = result.properties.density;
    document.getElementById('thermal-conductivity-value').textContent = result.properties.thermal_conductivity;
    
    // Обновление характеристик
    document.getElementById('alloy-series-value').textContent = result.properties.alloy_series;
    document.getElementById('corrosion-resistance-value').textContent = result.properties.corrosion_resistance;
    document.getElementById('weldability-value').textContent = result.properties.weldability;
    
    // Обновление рекомендаций
    const recommendationsList = document.getElementById('recommendations-list');
    recommendationsList.innerHTML = '';
    
    result.properties.recommended_applications.forEach(app => {
        const li = document.createElement('li');
        li.textContent = app;
        recommendationsList.appendChild(li);
    });
    
    // Обновление цвета индикаторов в зависимости от значений
    updatePropertyIndicators(result);
}

// Функция обновления цветовых индикаторов свойств
function updatePropertyIndicators(result) {
    // Предел прочности
    const tensileElement = document.getElementById('tensile-strength-value').parentElement;
    if (result.properties.tensile_strength > 300) {
        tensileElement.className = 'result-card result-high';
    } else if (result.properties.tensile_strength > 150) {
        tensileElement.className = 'result-card result-medium';
    } else {
        tensileElement.className = 'result-card result-low';
    }
    
    // Коррозионная стойкость
    const corrosionValue = document.getElementById('corrosion-resistance-value').textContent;
    const corrosionElement = document.getElementById('corrosion-resistance-value');
    if (corrosionValue === 'Отличная') {
        corrosionElement.style.color = '#38a169';
    } else if (corrosionValue === 'Хорошая') {
        corrosionElement.style.color = '#4299e1';
    } else if (corrosionValue === 'Удовлетворительная') {
        corrosionElement.style.color = '#dd6b20';
    } else {
        corrosionElement.style.color = '#e53e3e';
    }
    
    // Свариваемость
    const weldabilityValue = document.getElementById('weldability-value').textContent;
    const weldabilityElement = document.getElementById('weldability-value');
    if (weldabilityValue === 'Отличная') {
        weldabilityElement.style.color = '#38a169';
    } else if (weldabilityValue === 'Хорошая') {
        weldabilityElement.style.color = '#4299e1';
    } else if (weldabilityValue === 'Удовлетворительная') {
        weldabilityElement.style.color = '#dd6b20';
    } else {
        weldabilityElement.style.color = '#e53e3e';
    }
}

// Функция обновления графиков
function updateCharts(result) {
    // Обновление графика сравнения со стандартными сплавами
    if (alloyComparisonChart) {
        const ctx = document.getElementById('alloy-comparison-chart').getContext('2d');
        alloyComparisonChart.destroy();
        
        const standardAlloys = [
            { name: '1100 (чистый Al)', tensile: 90, yield: 35, elongation: 20 },
            { name: '3003 (Al-Mn)', tensile: 120, yield: 50, elongation: 15 },
            { name: '5052 (Al-Mg)', tensile: 210, yield: 160, elongation: 12 },
            { name: '6061 (Al-Mg-Si)', tensile: 310, yield: 275, elongation: 12 },
            { name: '7075 (Al-Zn)', tensile: 570, yield: 505, elongation: 11 }
        ];
        
        const tensileData = standardAlloys.map(a => a.tensile);
        tensileData.push(result.properties.tensile_strength);
        
        const yieldData = standardAlloys.map(a => a.yield);
        yieldData.push(result.properties.yield_strength);
        
        const labels = standardAlloys.map(a => a.name);
        labels.push('Ваш сплав');
        
        alloyComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Предел прочности (МПа)',
                        data: tensileData,
                        backgroundColor: 'rgba(56, 161, 105, 0.7)',
                        borderColor: 'rgba(56, 161, 105, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Предел текучести (МПа)',
                        data: yieldData,
                        backgroundColor: 'rgba(49, 130, 206, 0.7)',
                        borderColor: 'rgba(49, 130, 206, 1)',
                        borderWidth: 1
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
                            color: '#e2e8f0'
                        }
                    },
                    tooltip: {
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
                        ticks: {
                            color: '#a0aec0'
                        },
                        grid: {
                            color: 'rgba(100, 116, 139, 0.2)'
                        },
                        title: {
                            display: true,
                            text: 'МПа',
                            color: '#e2e8f0'
                        }
                    }
                }
            }
        });
    }
    
    // Обновление графика влияния элементов
    if (elementsImpactChart) {
        const ctx = document.getElementById('elements-impact-chart').getContext('2d');
        elementsImpactChart.destroy();
        
        // Расчет влияния каждого элемента на прочность
        const elements = ['Mg', 'Si', 'Cu', 'Zn', 'Mn', 'Ti'];
        const coefficients = {
            'Mg': 28, 'Si': 15, 'Cu': 32, 'Zn': 25, 'Mn': 12, 'Ti': 2
        };
        
        const composition = result.composition;
        const impactData = elements.map(element => {
            const key = element.toLowerCase();
            const content = composition[key] || 0;
            const effectiveContent = Math.min(content, 5.0); // Эффект насыщения после 5%
            return coefficients[element] * effectiveContent;
        });
        
        const backgroundColors = [
            'rgba(56, 161, 105, 0.7)',
            'rgba(221, 107, 32, 0.7)',
            'rgba(229, 62, 62, 0.7)',
            'rgba(147, 197, 253, 0.7)',
            'rgba(199, 110, 211, 0.7)',
            'rgba(91, 172, 165, 0.7)'
        ];
        
        elementsImpactChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: elements,
                datasets: [{
                    label: 'Влияние на прочность (МПа)',
                    data: impactData,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
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
                        ticks: {
                            color: '#a0aec0'
                        },
                        grid: {
                            color: 'rgba(100, 116, 139, 0.2)'
                        },
                        title: {
                            display: true,
                            text: 'МПа',
                            color: '#e2e8f0'
                        }
                    }
                }
            }
        });
    }
}

// Функция сохранения результата расчета
async function saveAlloyResult() {
    if (!authToken) {
        showWarning('warning', 'Для сохранения результатов необходимо войти в систему');
        return;
    }
    
    const alloyName = document.getElementById('alloy-name').value.trim();
    if (!alloyName) {
        showWarning('warning', 'Пожалуйста, введите название сплава');
        return;
    }
    
    if (!lastCalculationResult) {
        showWarning('warning', 'Нет результатов для сохранения');
        return;
    }
    
    const saveButton = document.getElementById('save-alloy-btn');
    saveButton.disabled = true;
    saveButton.textContent = 'Сохранение...';
    
    // Формируем данные для сохранения
    const composition = lastCalculationResult.composition;
    const properties = lastCalculationResult.properties;
    
    const experimentData = {
        timestamp: new Date().toISOString(),
        parameters: {
            al: composition.al,
            mg: composition.mg,
            si: composition.si,
            cu: composition.cu,
            zn: composition.zn,
            mn: composition.mn,
            ti: composition.ti,
            fe: composition.fe,
            other: composition.other
        },
        results: {
            tensile_strength: properties.tensile_strength,
            yield_strength: properties.yield_strength,
            elongation: properties.elongation,
            hardness: properties.hardness,
            density: properties.density,
            thermal_conductivity: properties.thermal_conductivity,
            corrosion_resistance: properties.corrosion_resistance,
            weldability: properties.weldability,
            recommended_applications: properties.recommended_applications,
            alloy_series: properties.alloy_series,
            timestamp: new Date().toISOString()
        }
    };
    
    // Сохраняем в историю экспериментов
    const payload = {
        experiment_name: alloyName,
        experiments: [experimentData]
    };
    
    const result = await apiRequest('/api/experiments/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
    
    saveButton.disabled = false;
    saveButton.textContent = 'Сохранить сплав';
    
    if (result && result.success) {
        showWarning('success', 'Результаты успешно сохранены!');
        document.getElementById('alloy-name').value = '';
    }
}

// Функция экспорта в PDF
async function exportToPDF() {
    if (!lastCalculationResult) {
        showWarning('warning', 'Нет данных для экспорта');
        return;
    }
    
    try {
        // Создаем данные для экспорта
        const composition = lastCalculationResult.composition;
        const properties = lastCalculationResult.properties;
        const alloyName = document.getElementById('alloy-name').value.trim() || 'Безымянный сплав';
        
        const exportData = {
            alloy_name: alloyName,
            composition: composition,
            properties: properties
        };
        
        // Отправляем запрос на генерацию PDF
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exportData)
        };
        
        const response = await fetch('/api/alloy-calculator/export-pdf', options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Ошибка ${response.status}`);
        }
        
        // Загружаем PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alloy_${alloyName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showWarning('success', 'PDF успешно сгенерирован и скачан!');
    } catch (error) {
        console.error('Ошибка при экспорте в PDF:', error);
        showWarning('danger', `Ошибка при экспорте: ${error.message}`);
    }
}

// Инициализация аутентификации
function initAuth() {
    // Проверяем, есть ли сохраненный токен
    if (authToken && currentUser) {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('username-display').textContent = currentUser.username;
        // Показываем секцию сохранения для авторизованных пользователей
        document.getElementById('save-alloy-section').style.display = 'block';
    }
    
    // Обработчики для кнопок аутентификации
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'flex';
    });
    
    document.getElementById('register-btn').addEventListener('click', () => {
        document.getElementById('register-modal').style.display = 'flex';
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        document.getElementById('auth-buttons').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('save-alloy-section').style.display = 'none';
        showWarning('warning', 'Вы успешно вышли из системы');
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
        const result = await apiRequest('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
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
            document.getElementById('save-alloy-section').style.display = 'block';
            showWarning('success', 'Регистрация успешна! Добро пожаловать!');
        }
    });
    
    // Обработчик формы входа
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const result = await apiRequest('/api/token', {
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
            document.getElementById('save-alloy-section').style.display = 'block';
            showWarning('success', 'Вход успешен! Добро пожаловать!');
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
}

// Инициализация графиков
function initCharts() {
    // График сравнения со стандартными сплавами
    const ctx1 = document.getElementById('alloy-comparison-chart').getContext('2d');
    alloyComparisonChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['1100 (чистый Al)', '3003 (Al-Mn)', '5052 (Al-Mg)', '6061 (Al-Mg-Si)', '7075 (Al-Zn)'],
            datasets: [
                {
                    label: 'Предел прочности (МПа)',
                    data: [90, 120, 210, 310, 570],
                    backgroundColor: 'rgba(56, 161, 105, 0.7)',
                    borderColor: 'rgba(56, 161, 105, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Предел текучести (МПа)',
                    data: [35, 50, 160, 275, 505],
                    backgroundColor: 'rgba(49, 130, 206, 0.7)',
                    borderColor: 'rgba(49, 130, 206, 1)',
                    borderWidth: 1
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
                        color: '#e2e8f0'
                    }
                },
                tooltip: {
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
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.2)'
                    },
                    title: {
                        display: true,
                        text: 'МПа',
                        color: '#e2e8f0'
                    }
                }
            }
        }
    });
    
    // График влияния элементов
    const ctx2 = document.getElementById('elements-impact-chart').getContext('2d');
    elementsImpactChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Mg', 'Si', 'Cu', 'Zn', 'Mn', 'Ti'],
            datasets: [{
                label: 'Влияние на прочность (МПа)',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(56, 161, 105, 0.7)',
                    'rgba(221, 107, 32, 0.7)',
                    'rgba(229, 62, 62, 0.7)',
                    'rgba(147, 197, 253, 0.7)',
                    'rgba(199, 110, 211, 0.7)',
                    'rgba(91, 172, 165, 0.7)'
                ],
                borderColor: [
                    'rgba(56, 161, 105, 1)',
                    'rgba(221, 107, 32, 1)',
                    'rgba(229, 62, 62, 1)',
                    'rgba(147, 197, 253, 1)',
                    'rgba(199, 110, 211, 1)',
                    'rgba(91, 172, 165, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
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
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.2)'
                    },
                    title: {
                        display: true,
                        text: 'МПа',
                        color: '#e2e8f0'
                    }
                }
            }
        }
    });
}

// Инициализация калькулятора сплавов
function initAlloyCalculator() {
    // Инициализация аутентификации
    initAuth();
    
    // Инициализация графиков
    initCharts();
    
    // Установка обработчиков событий для слайдеров
    const sliders = ['al', 'mg', 'si', 'cu', 'zn', 'mn', 'ti', 'fe', 'other'];
    sliders.forEach(element => {
        const slider = document.getElementById(`${element}-slider`);
        slider.addEventListener('input', () => {
            updateSliderValues();
        });
    });
    
    // Обработчик кнопки расчета
    document.getElementById('calculate-btn').addEventListener('click', calculateAlloyProperties);
    
    // Обработчик кнопки сброса
    document.getElementById('reset-btn').addEventListener('click', resetToDefaults);
    
    // Обработчик кнопки сохранения
    document.getElementById('save-alloy-btn').addEventListener('click', saveAlloyResult);
    
    // Обработчик кнопки экспорта в PDF
    document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);
    
    // Инициализация значений по умолчанию
    resetToDefaults();
}

// Запуск калькулятора при загрузке страницы
document.addEventListener('DOMContentLoaded', initAlloyCalculator);