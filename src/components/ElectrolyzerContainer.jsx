// src/components/ElectrolyzerContainer.jsx
import React, { useState, useEffect } from 'react';

const ElectrolyzerContainer = ({ simulator }) => {
  const { 
    current, 
    voltage, 
    temperature, 
    aluminaConcentration,
    isEmergency,
    emergencyType,
    animationTriggers, // "Ручка" для будущих анимаций
    highlightElement
  } = simulator;
  
  // Состояние для подсветки элементов
  const [hoveredElement, setHoveredElement] = useState(null);
  
  // Расчет текущих метрик
  const efficiency = simulator.calculateCurrentEfficiency();
  const energyConsumption = simulator.calculateEnergyConsumption();
  const anodeConsumption = simulator.calculateAnodeConsumption();
  
  // Функция для определения цвета индикатора
  const getStatusColor = (value, optimalRange, warningRange) => {
    if (optimalRange && value >= optimalRange[0] && value <= optimalRange[1]) {
      return '#10b981'; // Зеленый - оптимум
    } else if (warningRange && value >= warningRange[0] && value <= warningRange[1]) {
      return '#f59e0b'; // Желтый - предупреждение
    } else {
      return '#ef4444'; // Красный - опасность
    }
  };
  
  // Обработка клика по элементам электролизера
  const handleElementClick = (element) => {
    highlightElement(element);
  };
  
  return (
    <div className="electrolyzer-container">
      <h2 className="section-title">Схема электролизера</h2>
      
      <div className="electrolyzer-scheme">
        {/* Индикаторы состояния */}
        <div className="status-indicators">
          <div className="indicator">
            <div 
              className="indicator-light" 
              style={{ backgroundColor: getStatusColor(aluminaConcentration, [3.5, 4.5], [3.0, 5.0]) }}
            ></div>
            <span>Глинозём: {aluminaConcentration}%</span>
          </div>
          <div className="indicator">
            <div 
              className="indicator-light" 
              style={{ backgroundColor: getStatusColor(temperature, [950, 970], [940, 980]) }}
            ></div>
            <span>Температура: {temperature}°C</span>
          </div>
          <div className="indicator">
            <div 
              className="indicator-light" 
              style={{ backgroundColor: getStatusColor(voltage, [4.0, 4.5]) }}
            ></div>
            <span>Напряжение: {voltage}В</span>
          </div>
          <div className="indicator">
            <div 
              className="indicator-light" 
              style={{ backgroundColor: getStatusColor(efficiency, [90, 100], [85, 90]) }}
            ></div>
            <span>Выход по току: {efficiency}%</span>
          </div>
        </div>
        
        {/* 2D схема электролизера */}
        <div className="electrolyzer-diagram">
          {/* Аноды */}
          <div 
            className={`anode ${hoveredElement === 'anode' ? 'highlighted' : ''}`}
            onMouseEnter={() => setHoveredElement('anode')}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={() => handleElementClick('anode')}
          >
            <div className="anode-blocks">
              <div className="anode-block"></div>
              <div className="anode-block"></div>
              <div className="anode-block"></div>
            </div>
            <div className="anode-label">АНОДЫ (+)</div>
            <div className="anode-info">
              <p>Материал: Угольные блоки</p>
              <p>Расход: {anodeConsumption.toFixed(1)} кг/т</p>
              {aluminaConcentration < 3.0 && (
                <p className="emergency-text">Анодный эффект!</p>
              )}
            </div>
          </div>
          
          {/* Электролит */}
          <div 
            className={`electrolyte ${hoveredElement === 'electrolyte' ? 'highlighted' : ''}`}
            onMouseEnter={() => setHoveredElement('electrolyte')}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={() => handleElementClick('electrolyte')}
          >
            <div className="electrolyte-layer">
              <div className="electrolyte-content">
                <div className="alumina-concentration">
                  <span>Глинозём: {aluminaConcentration}%</span>
                </div>
              </div>
            </div>
            <div className="electrolyte-label">ЭЛЕКТРОЛИТ</div>
            <div className="electrolyte-info">
              <p>Состав: Криолит + глинозём</p>
              <p>Температура: {temperature}°C</p>
              {temperature < 950 && (
                <p className="emergency-text">Опасность застывания!</p>
              )}
            </div>
          </div>
          
          {/* Катод */}
          <div 
            className={`cathode ${hoveredElement === 'cathode' ? 'highlighted' : ''}`}
            onMouseEnter={() => setHoveredElement('cathode')}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={() => handleElementClick('cathode')}
          >
            <div className="metal-layer"></div>
            <div className="cathode-label">КАТОД (-)</div>
            <div className="cathode-info">
              <p>Материал: Угольная подина</p>
              <p>Алюминий: {((current * voltage * 24 * efficiency/100) / 10000).toFixed(1)} кг/сут</p>
            </div>
          </div>
          
          {/* Силовые шины и подключение */}
          <div className="power-connection">
            <div className="current-value">Ток: {current} кА</div>
            <div className="voltage-value">Напряжение: {voltage} В</div>
          </div>
          
          {/* Газовые пузыри (для будущей анимации) */}
          {animationTriggers.gasBubbles && (
            <div className="gas-bubbles-placeholder">
              {/* Фактическая анимация будет добавлена позже */}
              <span className="animation-placeholder">Анимация газовых пузырей (CO₂)</span>
            </div>
          )}
          
          {/* Движение ионов (для будущей анимации) */}
          {animationTriggers.ionMovement && (
            <div className="ion-movement-placeholder">
              {/* Фактическая анимация будет добавлена позже */}
              <span className="animation-placeholder">Анимация движения ионов</span>
            </div>
          )}
          
          {/* Накопление металла (для будущей анимации) */}
          {animationTriggers.metalAccumulation && (
            <div className="metal-accumulation-placeholder">
              {/* Фактическая анимация будет добавлена позже */}
              <span className="animation-placeholder">Анимация накопления алюминия</span>
            </div>
          )}
          
          {/* Экстренные ситуации (для будущей анимации) */}
          {animationTriggers.anodeEffect && (
            <div className="anode-effect-placeholder">
              <span className="emergency-placeholder">Анимация Анодного Эффекта</span>
            </div>
          )}
          {animationTriggers.electrolyteFreezing && (
            <div className="freezing-placeholder">
              <span className="emergency-placeholder">Анимация застывания электролита</span>
            </div>
          )}
          {animationTriggers.shortCircuit && (
            <div className="short-circuit-placeholder">
              <span className="emergency-placeholder">Анимация короткого замыкания</span>
            </div>
          )}
        </div>
        
        {/* Информация о текущем состоянии */}
        <div className={`process-info ${isEmergency ? 'emergency-mode' : ''}`}>
          <h3>{isEmergency ? 'АВАРИЙНАЯ СИТУАЦИЯ' : 'Текущие параметры процесса'}</h3>
          <div className="process-metrics">
            <div className="metric">
              <span className="metric-label">Производительность:</span>
              <span className="metric-value">{((current * efficiency/100) / 3.0).toFixed(1)} кг/ч</span>
            </div>
            <div className="metric">
              <span className="metric-label">Удельная энергия:</span>
              <span className="metric-value">{energyConsumption.toFixed(1)} кВт·ч/т</span>
            </div>
            <div className="metric">
              <span className="metric-label">КПД процесса:</span>
              <span className="metric-value">{efficiency.toFixed(1)}%</span>
            </div>
          </div>
          
          {isEmergency && (
            <div className="emergency-info">
              <p><strong>Тип аварии:</strong> {emergencyType === 'anodeEffect' ? 'Анодный Эффект' : 
                                              emergencyType === 'electrolyteFreezing' ? 'Застывание электролита' : 
                                              'Короткое замыкание'}</p>
              <p><strong>Рекомендуемые действия:</strong></p>
              <ul>
                {emergencyType === 'anodeEffect' && (
                  <>
                    <li>Немедленно увеличить подачу глинозёма</li>
                    <li>Снизить силу тока до 250 кА</li>
                  </>
                )}
                {emergencyType === 'electrolyteFreezing' && (
                  <>
                    <li>Повысить температуру до 960°C</li>
                    <li>Увеличить силу тока для прогрева</li>
                  </>
                )}
                {emergencyType === 'shortCircuit' && (
                  <>
                    <li>Увеличить напряжение до 4.2 В</li>
                    <li>Проверить расстояние между анодами и катодом</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectrolyzerContainer;