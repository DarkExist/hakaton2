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

// Функция для выполнения запроса к API
async function simulateProcess(params) {
    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка расчета');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка при расчете:', error);
        showWarning('danger', `Ошибка сервера: ${error.message}`);
        return null;
    }
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
        ion.style.animationDirection = 'normal';
    } else {
        // Ионы кислорода движутся к аноду (вверх)
        const left = rect.left + 50 + Math.random() * (rect.width - 100);
        const top = rect.top + 200 + Math.random() * 150;
        ion.style.left = `${left - rect.left}px`;
        ion.style.top = `${top - rect.top}px`;
        ion.style.animation = `move-ion 4s infinite linear`;
        ion.style.animationDirection = 'reverse';
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
        
        // Вызов предупреждения при отклонении от оптимума
        if (result.warning_message && !result.critical_failure && voltage >= 4.0) {
            showWarning('warning', result.warning_message);
        } else if (result.eta < 85 || Math.abs(temperature - 960) > 5 || Math.abs(concentration - 4.0) > 0.8) {
            showWarning('warning', 'Параметры отклонены от оптимальных значений');
        }
    }
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
}

// Запуск симулятора при загрузке страницы
document.addEventListener('DOMContentLoaded', initSimulator);

// Периодическое обновление данных
setInterval(updateSimulation, 1000);