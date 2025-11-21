// src/components/MainDisplay.js
import React, { useState, useEffect } from 'react';
import ElectrolyzerContainer from './ElectrolyzerContainer';
import VisualizationContainer from './VisualizationContainer';

const MainDisplay = ({ simulator }) => {
  const [activeChartTab, setActiveChartTab] = useState('current-efficiency');
  
  return (
    <div className="main-display">
      <ElectrolyzerContainer simulator={simulator} />
      <VisualizationContainer 
        simulator={simulator} 
        activeTab={activeChartTab} 
        onTabChange={setActiveChartTab} 
      />
    </div>
  );
};

export default MainDisplay;