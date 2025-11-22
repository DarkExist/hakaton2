// src/components/AlloyCalculator.jsx
import React, { useState } from 'react';

const AlloyCalculator = ({ simulator }) => {
  const [aluminum, setAluminum] = useState(95);
  const [magnesium, setMagnesium] = useState(3);
  const [silicon, setSilicon] = useState(1.5);
  const [otherElements, setOtherElements] = useState(0.5);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { calculateAlloyProperties } = simulator;
  
  const handleCalculate = () => {
    // Проверка корректности введенных значений
    const total = aluminum + magnesium + silicon + otherElements;
    
    if (Math.abs(total - 100) > 0.1) {
      setErrorMessage('Сумма всех компонентов должна быть равна 100%');
      setResults(null);
      return;
    }
    
    if (aluminum < 90 || aluminum > 99.5) {
      setErrorMessage('Содержание алюминия должно быть в диапазоне 90-99.5%');
      setResults(null);
      return;
    }
    
    // Расчет свойств сплава
    const properties = calculateAlloyProperties(aluminum, magnesium, silicon);
    setResults(properties);
    setErrorMessage('');
  };
  
  return (
    <div className="alloy-calculator">
      <h2 className="section-title">Калькулятор свойств сплавов</h2>
      <p className="info-text">
        Введите состав алюминиевого сплава для расчета его механических свойств
      </p>
      
      {errorMessage && (
        <div className="alert alert-danger">
          <strong>Ошибка:</strong> {errorMessage}
        </div>
      )}
      
      <div className="alloy-inputs">
        <div className="input-group">
          <label htmlFor="aluminum">Алюминий (Al), %:</label>
          <input
            type="number"
            id="aluminum"
            value={aluminum}
            onChange={(e) => setAluminum(Number(e.target.value))}
            min="90"
            max="99.5"
            step="0.1"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="magnesium">Магний (Mg), %:</label>
          <input
            type="number"
            id="magnesium"
            value={magnesium}
            onChange={(e) => setMagnesium(Number(e.target.value))}
            min="0"
            max="10"
            step="0.1"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="silicon">Кремний (Si), %:</label>
          <input
            type="number"
            id="silicon"
            value={silicon}
            onChange={(e) => setSilicon(Number(e.target.value))}
            min="0"
            max="12"
            step="0.1"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="other">Прочие элементы, %:</label>
          <input
            type="number"
            id="other"
            value={otherElements}
            readOnly
          />
          <div className="input-hint">Рассчитывается автоматически</div>
        </div>
      </div>
      
      <div className="total-sum">
        <span>Сумма компонентов: {(aluminum + magnesium + silicon + otherElements).toFixed(1)}%</span>
      </div>
      
      <button className="btn btn-primary" onClick={handleCalculate}>
        Рассчитать свойства сплава
      </button>
      
      {results && (
        <div className="alloy-results">
          <h3>Результаты расчета</h3>
          <div className="results-grid">
            <div className="result-card">
              <h4>Предел прочности</h4>
              <div className="result-value">{results.tensileStrength} МПа</div>
              <div className="result-description">
                {results.tensileStrength > 250 ? 'Высокая прочность' : 
                 results.tensileStrength > 200 ? 'Средняя прочность' : 'Низкая прочность'}
              </div>
            </div>
            
            <div className="result-card">
              <h4>Пластичность</h4>
              <div className="result-value">{results.ductility}%</div>
              <div className="result-description">
                {results.ductility > 20 ? 'Высокая пластичность' : 
                 results.ductility > 10 ? 'Средняя пластичность' : 'Низкая пластичность'}
              </div>
            </div>
            
            <div className="result-card">
              <h4>Коррозионная стойкость</h4>
              <div className="result-value">{results.corrosionResistance}</div>
              <div className="result-description">
                {results.corrosionResistance === "Отличная" ? 'Подходит для агрессивных сред' : 
                 results.corrosionResistance === "Хорошая" ? 'Удовлетворительная защита' : 'Требуется защитное покрытие'}
              </div>
            </div>
            
            <div className="result-card">
              <h4>Рекомендуемое применение</h4>
              <div className="result-value">{results.application}</div>
              <div className="result-description">
                {results.application === "Силовые конструкции" ? 'Высоконагруженные детали' : 
                 results.application === "Детали сложной формы" ? 'Тонкостенные конструкции' : 'Общепромышленное использование'}
              </div>
            </div>
          </div>
          
          <div className="alloy-notes">
            <h4>Примечания</h4>
            <ul>
              <li>Расчет выполнен на основе эмпирических формул для алюминиевых сплавов серии Al-Mg-Si</li>
              <li>Для получения более точных результатов рекомендуется провести лабораторные испытания</li>
              <li>Максимальное содержание Mg и Si для хорошей коррозионной стойкости: Mg ≤ 3%, Si ≤ 5%</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlloyCalculator;