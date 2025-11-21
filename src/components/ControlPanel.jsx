// src/components/ControlPanel.js
import React, { useState, useEffect } from 'react';

const ControlPanel = ({ simulator }) => {
  const { 
    current, setCurrent, 
    temperature, setTemperature,
    metalLevel, setMetalLevel,
    alf3, setAlf3,
    caf2, setCaf2,
    isEmergency,
    checkEmergencyConditions,
    addToJournal,
    resetParameters,
    emergencyStop
  } = simulator;
  
  const [alerts, setAlerts] = useState({ warning: false, danger: false });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const conditions = checkEmergencyConditions();
    setAlerts(conditions);
  }, [current, temperature, metalLevel, alf3, caf2, checkEmergencyConditions]);

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const handleRunSimulation = () => {
    const result = addToJournal();
    addNotification(result.message, result.success ? 'success' : 'error');
  };

  const handleResetParameters = () => {
    const result = resetParameters();
    addNotification(result.message, result.success ? 'success' : 'error');
  };

  const handleEmergencyStop = () => {
    const result = emergencyStop();
    addNotification(result.message, result.success ? 'success' : 'error');
  };

  return (
    <div className="control-panel">
      <h2 className="section-title">Параметры процесса</h2>
      
      {alerts.warning && !alerts.danger && (
        <div className="alert alert-warning" id="warning-alert">
          <strong>Внимание:</strong> Параметры выходят за допустимые пределы. Возможен сбой процесса.
        </div>
      )}
      
      {alerts.danger && (
        <div className="alert alert-danger" id="danger-alert">
          <strong>Критическая ошибка:</strong> Параметры вызывают аварийную ситуацию. Процесс остановлен.
        </div>
      )}
      
      <div className="parameter-group">
        <div className="parameter-title">
          Сила тока <span className="parameter-value" id="current-value">{current} кА</span>
        </div>
        <div className="slider-container">
          <input 
            type="range" 
            min="120" 
            max="200" 
            value={current} 
            className="slider" 
            id="current-slider" 
            step="1"
            onChange={(e) => setCurrent(parseInt(e.target.value))}
          />
          <div className="value-display">
            <span id="current-display">{current}</span> кА
          </div>
        </div>
        <p className="parameter-description">Допустимый диапазон: 120-200 кА</p>
      </div>
      
      <div className="parameter-group">
        <div className="parameter-title">
          Температура <span className="parameter-value" id="temp-value">{temperature} °C</span>
        </div>
        <div className="slider-container">
          <input 
            type="range" 
            min="900" 
            max="1000" 
            value={temperature} 
            className="slider" 
            id="temp-slider" 
            step="1"
            onChange={(e) => setTemperature(parseInt(e.target.value))}
          />
          <div className="value-display">
            <span id="temp-display">{temperature}</span> °C
          </div>
        </div>
        <p className="parameter-description">Допустимый диапазон: 900-1000 °C</p>
      </div>
      
      <div className="parameter-group">
        <div className="parameter-title">
          Уровень металла <span className="parameter-value" id="metal-level-value">{metalLevel} см</span>
        </div>
        <div className="slider-container">
          <input 
            type="range" 
            min="15" 
            max="30" 
            value={metalLevel} 
            className="slider" 
            id="metal-level-slider" 
            step="0.5"
            onChange={(e) => setMetalLevel(parseFloat(e.target.value))}
          />
          <div className="value-display">
            <span id="metal-level-display">{metalLevel.toFixed(1)}</span> см
          </div>
        </div>
        <p className="parameter-description">Допустимый диапазон: 15-30 см</p>
      </div>
      
      <div className="parameter-group">
        <div className="parameter-title">
          Состав электролита
        </div>
        <div className="slider-container">
          <label className="slider-label">AlF₃ (%)</label>
          <input 
            type="range" 
            min="8" 
            max="15" 
            value={alf3} 
            className="slider" 
            id="alf3-slider" 
            step="0.5"
            onChange={(e) => setAlf3(parseFloat(e.target.value))}
          />
          <div className="value-display">
            <span id="alf3-display">{alf3.toFixed(1)}</span> %
          </div>
        </div>
        <div className="slider-container">
          <label className="slider-label">CaF₂ (%)</label>
          <input 
            type="range" 
            min="4" 
            max="8" 
            value={caf2} 
            className="slider" 
            id="caf2-slider" 
            step="0.5"
            onChange={(e) => setCaf2(parseFloat(e.target.value))}
          />
          <div className="value-display">
            <span id="caf2-display">{caf2.toFixed(1)}</span> %
          </div>
        </div>
      </div>
      
      <button className="btn btn-block btn-success" id="run-simulation" onClick={handleRunSimulation}>
        Запустить симуляцию
      </button>
      <button className="btn btn-block btn-warning" id="reset-parameters" onClick={handleResetParameters}>
        Сбросить параметры
      </button>
      {alerts.danger && (
        <button className="btn btn-block btn-danger" id="emergency-stop" onClick={handleEmergencyStop}>
          Аварийная остановка
        </button>
      )}
      
      {/* Уведомления */}
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'}`}
          style={{ position: 'fixed', top: '20px', right: '20px', zIndex: '10000' }}
        >
          <strong>{notification.type === 'success' ? 'Успешно!' : 'Ошибка!'}</strong> {notification.message}
        </div>
      ))}
    </div>
  );
};

export default ControlPanel;