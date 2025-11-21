// src/components/AlloyCalculator.js
import React, { useState, useEffect } from 'react';

const AlloyCalculator = ({ simulator }) => {
  const [al, setAl] = useState(95);
  const [mg, setMg] = useState(3.0);
  const [si, setSi] = useState(2.0);
  const [properties, setProperties] = useState({
    tensileStrength: 220,
    ductility: 15,
    corrosionResistance: 'Хорошая',
    application: 'Конструкционные элементы'
  });
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    updateProperties();
  }, [al, mg, si, simulator]);
  
  const updateProperties = () => {
    const newProperties = simulator.calculateAlloyProperties(al, mg, si);
    setProperties(newProperties);
  };
  
  const handleAlChange = (value) => {
    const newAl = parseInt(value);
    setAl(newAl);
    
    // Автоматическая корректировка других элементов
    const total = newAl + mg + si;
    if (total > 100) {
      const reduction = (total - 100) / 2;
      const newMg = Math.max(0, mg - reduction);
      const newSi = Math.max(0, si - reduction);
      setMg(newMg);
      setSi(newSi);
    }
  };
  
  const handleMgChange = (value) => {
    const newMg = parseFloat(value);
    setMg(newMg);
    
    const total = al + newMg + si;
    if (total > 100) {
      const reduction = (total - 100) / 2;
      const newAl = Math.max(70, al - reduction);
      const newSi = Math.max(0, si - reduction);
      setAl(newAl);
      setSi(newSi);
    }
  };
  
  const handleSiChange = (value) => {
    const newSi = parseFloat(value);
    setSi(newSi);
    
    const total = al + mg + newSi;
    if (total > 100) {
      const reduction = (total - 100) / 2;
      const newAl = Math.max(70, al - reduction);
      const newMg = Math.max(0, mg - reduction);
      setAl(newAl);
      setMg(newMg);
    }
  };
  
  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };
  
  const handleCalculate = () => {
    updateProperties();
    addNotification('Свойства сплава обновлены.');
  };
  
  return (
    <div className="journal-container">
      <h2 className="section-title">Калькулятор свойств сплавов</h2>
      <div className="parameter-group">
        <div className="parameter-title">Состав сплава</div>
        <div className="slider-container">
          <label className="slider-label">Алюминий (Al) %</label>
          <input 
            type="range" 
            min="70" 
            max="99" 
            value={al} 
            className="slider" 
            id="al-slider" 
            step="1"
            onChange={(e) => handleAlChange(e.target.value)}
          />
          <div className="value-display">
            <span id="al-display">{al}</span> %
          </div>
        </div>
        <div className="slider-container">
          <label className="slider-label">Магний (Mg) %</label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            value={mg} 
            className="slider" 
            id="mg-slider" 
            step="0.5"
            onChange={(e) => handleMgChange(e.target.value)}
          />
          <div className="value-display">
            <span id="mg-display">{mg.toFixed(1)}</span> %
          </div>
        </div>
        <div className="slider-container">
          <label className="slider-label">Кремний (Si) %</label>
          <input 
            type="range" 
            min="0" 
            max="12" 
            value={si} 
            className="slider" 
            id="si-slider" 
            step="0.5"
            onChange={(e) => handleSiChange(e.target.value)}
          />
          <div className="value-display">
            <span id="si-display">{si.toFixed(1)}</span> %
          </div>
        </div>
      </div>
      <div className="parameter-group">
        <div className="parameter-title">Прогнозируемые свойства</div>
        <div className="result-row" style={{ margin: '15px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
          <p><strong>Прочность на растяжение:</strong> <span id="tensile-strength">{properties.tensileStrength}</span> МПа</p>
          <p><strong>Пластичность:</strong> <span id="ductility">{properties.ductility}</span> %</p>
          <p><strong>Коррозионная стойкость:</strong> <span id="corrosion-resistance">{properties.corrosionResistance}</span></p>
          <p><strong>Рекомендуемое применение:</strong> <span id="application">{properties.application}</span></p>
        </div>
        <button className="btn btn-block btn-success" id="calculate-alloy" onClick={handleCalculate}>
          Рассчитать свойства
        </button>
      </div>
      
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

export default AlloyCalculator;