// src/components/ElectrolyzerContainer.js
import React, { useState, useEffect } from 'react';

const ElectrolyzerContainer = ({ simulator }) => {
  const { metalLevel, highlightedElement } = simulator;
  const [highlightInfo, setHighlightInfo] = useState(null);
  
  const highlightElement = (elementType) => {
    simulator.highlightElement(elementType);
    
    let info = null;
    switch(elementType) {
      case 'anode':
        info = {
          title: 'Аноды',
          content: [
            'Материал: Обожженный анод',
            `Назначение: Проведение тока и участие в электрохимической реакции`,
            `Ток: ${simulator.current} кА`,
            'Состояние: Нормальное'
          ],
          position: { top: '5%', right: '5%' }
        };
        break;
      case 'metal':
        info = {
          title: 'Алюминий',
          content: [
            `Уровень: ${simulator.metalLevel} см`,
            `Температура: ${simulator.temperature} °C`,
            'Чистота: 99.7%',
            'Состояние: Стабильное'
          ],
          position: { bottom: '35%', left: '5%' }
        };
        break;
      case 'lining':
        info = {
          title: 'Футеровка',
          content: [
            'Материал: Огнеупорные блоки',
            'Толщина: 45 см',
            `${simulator.temperature - 50} °C`,
            'Состояние: Нормальное'
          ],
          position: { top: '70%', left: '5%' }
        };
        break;
      default:
        info = null;
    }
    setHighlightInfo(info);
  };
  
  useEffect(() => {
    if (!highlightedElement) {
      setHighlightInfo(null);
    }
  }, [highlightedElement]);
  
  return (
    <div className="electrolyzer-container">
      <h2 className="section-title">2D-схема электролизёра</h2>
      <div className="electrolyzer-canvas">
        <div className="electrolyzer-diagram" id="electrolyzer-diagram">
          <div className="electrolyzer-body">
            <div className="electrolyzer-lining"></div>
            <div 
              className="electrolyzer-metal" 
              id="metal-level" 
              style={{ height: `${Math.max(10, (metalLevel / 30) * 100)}%` }}
            ></div>
          </div>
          <div className="anode anode-1" id="anode-1"></div>
          <div className="anode anode-2" id="anode-2"></div>
          <div className="anode anode-3" id="anode-3"></div>
          <div className="anode anode-4" id="anode-4"></div>
          <div className="cathode"></div>
          
          {highlightedElement && (
            <div className="element-highlight" style={getHighlightStyle(highlightedElement)}></div>
          )}
          
          {highlightInfo && (
            <div className="element-info" style={highlightInfo.position}>
              <strong>{highlightInfo.title}</strong><br />
              {highlightInfo.content.map((line, index) => (
                <React.Fragment key={index}>
                  {line}<br />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="element-controls" style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => highlightElement('anode')}>Подсветить аноды</button>
        <button className="btn" onClick={() => highlightElement('metal')}>Подсветить металл</button>
        <button className="btn" onClick={() => highlightElement('lining')}>Подсветить футеровку</button>
        <button className="btn" onClick={() => simulator.highlightElement('reset')}>Сбросить подсветку</button>
      </div>
    </div>
  );
};

function getHighlightStyle(elementType) {
  switch(elementType) {
    case 'anode':
      return {
        width: '40%',
        height: '35%',
        top: '8%',
        left: '22%'
      };
    case 'metal':
      return {
        width: '86%',
        height: '25%',
        bottom: '5%',
        left: '7%'
      };
    case 'lining':
      return {
        width: '90%',
        height: '90%',
        top: '5%',
        left: '5%'
      };
    default:
      return {};
  }
}

export default ElectrolyzerContainer;