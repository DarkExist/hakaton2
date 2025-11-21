// src/components/HelpSection.js
import React, { useState } from 'react';

const HelpSection = () => {
  const [activeTab, setActiveTab] = useState('process');
  
  return (
    <div className="journal-container">
      <h2 className="section-title">Справочная информация</h2>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'process' ? 'active' : ''}`} 
          data-help-tab="process"
          onClick={() => setActiveTab('process')}
        >
          Техпроцесс
        </div>
        <div 
          className={`tab ${activeTab === 'parameters' ? 'active' : ''}`} 
          data-help-tab="parameters"
          onClick={() => setActiveTab('parameters')}
        >
          Параметры
        </div>
        <div 
          className={`tab ${activeTab === 'safety' ? 'active' : ''}`} 
          data-help-tab="safety"
          onClick={() => setActiveTab('safety')}
        >
          Безопасность
        </div>
      </div>
      
      <div className={`tab-content ${activeTab === 'process' ? 'active' : ''}`} id="process-tab">
        <h3>Процесс электролиза алюминия</h3>
        <p style={{ margin: '15px 0', lineHeight: '1.8' }}>
          Электролиз алюминия — это электрохимический процесс получения алюминия из глинозёма (Al₂O₃) в расплавленном криолите при температуре 950-970°C. Процесс происходит в электролизёрах постоянного тока силой 150-300 кА.
        </p>
        <p style={{ margin: '15px 0', lineHeight: '1.8' }}>
          Основные реакции:
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>На катоде: Al³⁺ + 3e⁻ → Al (жидкий алюминий)</li>
            <li>На аноде: 2O²⁻ + C → CO₂ + 4e⁻ (сгорание анода)</li>
          </ul>
        </p>
      </div>
      
      <div className={`tab-content ${activeTab === 'parameters' ? 'active' : ''}`} id="parameters-tab">
        <h3>Ключевые технологические параметры</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0' }}>
          <thead>
            <tr style={{ background: '#e2e8f0' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Параметр</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Оптимальное значение</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Влияние</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px' }}>Сила тока</td>
              <td style={{ padding: '10px' }}>150-180 кА</td>
              <td style={{ padding: '10px' }}>Влияет на производительность и выход по току</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px' }}>Температура</td>
              <td style={{ padding: '10px' }}>950-970°C</td>
              <td style={{ padding: '10px' }}>Влияет на вязкость электролита и растворимость глинозёма</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px' }}>Уровень металла</td>
              <td style={{ padding: '10px' }}>18-22 см</td>
              <td style={{ padding: '10px' }}>Влияет на стабильность процесса и выход по току</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className={`tab-content ${activeTab === 'safety' ? 'active' : ''}`} id="safety-tab">
        <h3>Правила безопасности</h3>
        <div className="alert alert-danger" style={{ margin: '15px 0' }}>
          <strong>Важно:</strong> Нарушение параметров может привести к аварийным ситуациям!
        </div>
        <ul style={{ marginLeft: '20px', marginTop: '10px', lineHeight: '1.8' }}>
          <li>Не допускать температуру ниже 900°C (риск затвердевания электролита)</li>
          <li>Не превышать силу тока 200 кА (риск перегрева и разрушения футеровки)</li>
          <li>Контролировать уровень металла (слишком низкий уровень вызывает нестабильность)</li>
          <li>Соблюдать баланс состава электролита для предотвращения коррозии</li>
        </ul>
      </div>
    </div>
  );
};

export default HelpSection;