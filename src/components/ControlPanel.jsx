// src/components/ControlPanel.jsx
import React, { useState, useEffect } from 'react';

const ControlPanel = ({ simulator }) => {
  const { 
    current, setCurrent, 
    voltage, setVoltage,
    temperature, setTemperature,
    aluminaConcentration, setAluminaConcentration,
    isEmergency, emergencyType,
    addToJournal, resetParameters, emergencyStop 
  } = simulator;
  
  const [notifications, setNotifications] = useState([]);
  
  // Расчет текущих метрик
  const efficiency = simulator.calculateCurrentEfficiency();
  const energyConsumption = simulator.calculateEnergyConsumption();
  const anodeConsumption = simulator.calculateAnodeConsumption();
  const { status, warning, danger } = simulator.checkEmergencyConditions();
  
  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  
  const handleRunSimulation = () => {
    const result = addToJournal();
    if (result.success) {
      addNotification(result.message, result.emergency ? 'danger' : 'success');
    }
  };
  
  const handleReset = () => {
    const result = resetParameters();
    addNotification(result.message);
  };
  
  const handleEmergencyStop = () => {
    if (window.confirm('Вы уверены, что хотите выполнить аварийную остановку? Это сбросит параметры в безопасные значения.')) {
      const result = emergencyStop();
      addNotification(result.message);
    }
  };
  
  return (
    <div className="control-panel">
      <h2 className="section-title">Панель управления</h2>
      
      {/* Уведомления */}
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`alert alert-${notification.type === 'success' ? 'success' : notification.type === 'danger' ? 'danger' : 'warning'}`}
        >
          <strong>{notification.type === 'success' ? 'Успех!' : notification.type === 'danger' ? 'Авария!' : 'Предупреждение!'}</strong> {notification.message}
        </div>
      ))}
      
      {/* Статус панели */}
      <div className={`status-panel ${danger ? 'status-danger' : warning ? 'status-warning' : 'status-normal'}`}>
        <div className="status-indicator"></div>
        <div className="status-text">
          {danger ? `КРИТИЧЕСКАЯ СИТУАЦИЯ: ${status}` : 
           warning ? `ПРЕДУПРЕЖДЕНИЕ: ${status}` : 
           `НОРМАЛЬНЫЙ РЕЖИМ: ${status}`}
        </div>
      </div>
      
      {/* Основные параметры */}
      <div className="parameter-grid">
        <div className="parameter-card">
          <h3>Сила тока</h3>
          <div className="slider-container">
            <input 
              type="range" 
              min="200" 
              max="400" 
              step="5" 
              value={current} 
              onChange={(e) => setCurrent(Number(e.target.value))}
              disabled={isEmergency}
            />
            <div className="slider-values">
              <span>200 кА</span>
              <span>{current} кА</span>
              <span>400 кА</span>
            </div>
          </div>
          <div className="parameter-info">
            <p>Текущее значение: <strong>{current} кА</strong></p>
            <p className="info-text">Оптимальное значение: 300 кА</p>
          </div>
        </div>
        
        <div className="parameter-card">
          <h3>Напряжение на ванне</h3>
          <div className="slider-container">
            <input 
              type="range" 
              min="4.0" 
              max="4.5" 
              step="0.05" 
              value={voltage} 
              onChange={(e) => setVoltage(Number(e.target.value))}
              disabled={isEmergency}
            />
            <div className="slider-values">
              <span>4.0 В</span>
              <span>{voltage} В</span>
              <span>4.5 В</span>
            </div>
          </div>
          <div className="parameter-info">
            <p>Текущее значение: <strong>{voltage} В</strong></p>
            <p className="info-text">Оптимальное значение: 4.2 В</p>
            {voltage < 4.0 && (
              <p className="warning-text">Опасность короткого замыкания!</p>
            )}
          </div>
        </div>
        
        <div className="parameter-card">
          <h3>Температура электролита</h3>
          <div className="slider-container">
            <input 
              type="range" 
              min="940" 
              max="980" 
              step="1" 
              value={temperature} 
              onChange={(e) => setTemperature(Number(e.target.value))}
              disabled={isEmergency}
            />
            <div className="slider-values">
              <span>940°C</span>
              <span>{temperature}°C</span>
              <span>980°C</span>
            </div>
          </div>
          <div className="parameter-info">
            <p>Текущее значение: <strong>{temperature}°C</strong></p>
            <p className="info-text">Оптимальное значение: 960°C</p>
            {temperature <= 950 && (
              <p className="warning-text">Опасность застывания электролита!</p>
            )}
          </div>
        </div>
        
        <div className="parameter-card">
          <h3>Концентрация глинозёма</h3>
          <div className="slider-container">
            <input 
              type="range" 
              min="1" 
              max="8" 
              step="0.1" 
              value={aluminaConcentration} 
              onChange={(e) => setAluminaConcentration(Number(e.target.value))}
              disabled={isEmergency}
            />
            <div className="slider-values">
              <span>1%</span>
              <span>{aluminaConcentration}%</span>
              <span>8%</span>
            </div>
          </div>
          <div className="parameter-info">
            <p>Текущее значение: <strong>{aluminaConcentration}%</strong></p>
            <p className="info-text">Оптимальное значение: 3.5-4.5%</p>
            {aluminaConcentration < 3.0 && (
              <p className="warning-text">Анодный Эффект! Срочно подать глинозём!</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Показатели эффективности */}
      <div className="metrics-container">
        <div className="metric-card">
          <h4>Выход по току</h4>
          <div className="metric-value">{efficiency.toFixed(1)}%</div>
          <div className="metric-status">
            {efficiency >= 90 ? 'Оптимально' : efficiency >= 85 ? 'Удовлетворительно' : 'Плохо'}
          </div>
        </div>
        <div className="metric-card">
          <h4>Удельный расход энергии</h4>
          <div className="metric-value">{energyConsumption.toFixed(1)} кВт·ч/т</div>
          <div className="metric-status">
            {energyConsumption <= 14000 ? 'Оптимально' : energyConsumption <= 15000 ? 'Удовлетворительно' : 'Плохо'}
          </div>
        </div>
        <div className="metric-card">
          <h4>Расход анодов</h4>
          <div className="metric-value">{anodeConsumption.toFixed(1)} кг/т</div>
          <div className="metric-status">
            {Math.abs(anodeConsumption - 334) <= 10 ? 'Оптимально' : Math.abs(anodeConsumption - 334) <= 30 ? 'Удовлетворительно' : 'Плохо'}
          </div>
        </div>
      </div>
      
      {/* Кнопки управления */}
      <div className="control-buttons">
        <button 
          className="btn btn-primary" 
          onClick={handleRunSimulation}
          disabled={isEmergency}
        >
          Запустить симуляцию
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleReset}
        >
          Сбросить параметры
        </button>
        <button 
          className={`btn ${isEmergency ? 'btn-success' : 'btn-danger'}`} 
          onClick={handleEmergencyStop}
        >
          {isEmergency ? 'Восстановить работу' : 'Аварийная остановка'}
        </button>
      </div>
      
      {/* Подсказки */}
      <div className="hints-section">
        <h4>Советы по оптимизации</h4>
        <ul>
          <li>Поддерживайте концентрацию глинозёма в диапазоне 3.5-4.5% для максимального выхода по току.</li>
          <li>Избегайте температуры ниже 950°C во избежание застывания электролита.</li>
          <li>Напряжение ниже 4.0В может привести к короткому замыканию.</li>
          <li>Оптимальный расход анодов составляет 334 кг на тонну алюминия.</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;