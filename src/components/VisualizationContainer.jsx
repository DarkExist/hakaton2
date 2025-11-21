// src/components/VisualizationContainer.js
import React, { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const VisualizationContainer = ({ simulator, activeTab, onTabChange }) => {
  const { 
    generateCurrentEfficiencyData,
    generateEnergyConsumptionData,
    generateTemperatureData,
    current,
    temperature
  } = simulator;
  
  const currentEfficiencyData = generateCurrentEfficiencyData(current);
  const energyConsumptionData = generateEnergyConsumptionData(temperature);
  const temperatureData = generateTemperatureData();
  
  const currentEfficiencyChartData = {
    labels: currentEfficiencyData.labels,
    datasets: [{
      label: 'Выход по току (%)', 
      data: currentEfficiencyData.data,
      borderColor: '#1a56db',
      backgroundColor: 'rgba(26, 86, 219, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.3
    }]
  };
  
  const energyConsumptionChartData = {
    labels: energyConsumptionData.labels,
    datasets: [{
      label: 'Расход энергии (кВт·ч/кг)',
      data: energyConsumptionData.data,
      borderColor: '#0e9f6e',
      backgroundColor: 'rgba(14, 159, 110, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.3
    }]
  };
  
  const temperatureChartData = {
    labels: temperatureData.labels,
    datasets: [{
      label: 'Температура электролита (°C)',
      data: temperatureData.data,
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.3
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };
  
  const currentEfficiencyOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: { ...chartOptions.plugins.title, text: 'Зависимость выхода по току от силы тока' }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 80,
        max: 96,
        title: {
          display: true,
          text: 'Выход по току (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Сила тока (кА)'
        }
      }
    }
  };
  
  const energyConsumptionOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: { ...chartOptions.plugins.title, text: 'Зависимость расхода энергии от температуры' }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 12,
        max: 18,
        title: {
          display: true,
          text: 'Расход энергии (кВт·ч/кг)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Температура (°C)'
        }
      }
    }
  };
  
  const temperatureOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: { ...chartOptions.plugins.title, text: 'Изменение температуры во времени' }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 940,
        max: 980,
        title: {
          display: true,
          text: 'Температура (°C)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Время'
        }
      }
    }
  };
  
  return (
    <div className="visualization-container">
      <h2 className="section-title">Динамические графики</h2>
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'current-efficiency' ? 'active' : ''}`} 
          data-tab="current-efficiency"
          onClick={() => onTabChange('current-efficiency')}
        >
          Выход по току
        </div>
        <div 
          className={`tab ${activeTab === 'energy-consumption' ? 'active' : ''}`} 
          data-tab="energy-consumption"
          onClick={() => onTabChange('energy-consumption')}
        >
          Расход энергии
        </div>
        <div 
          className={`tab ${activeTab === 'temperature' ? 'active' : ''}`} 
          data-tab="temperature"
          onClick={() => onTabChange('temperature')}
        >
          Температура
        </div>
      </div>
      
      <div className={`tab-content ${activeTab === 'current-efficiency' ? 'active' : ''}`} id="current-efficiency-tab">
        <div className="chart-container">
          <Line data={currentEfficiencyChartData} options={currentEfficiencyOptions} />
        </div>
      </div>
      <div className={`tab-content ${activeTab === 'energy-consumption' ? 'active' : ''}`} id="energy-consumption-tab">
        <div className="chart-container">
          <Line data={energyConsumptionChartData} options={energyConsumptionOptions} />
        </div>
      </div>
      <div className={`tab-content ${activeTab === 'temperature' ? 'active' : ''}`} id="temperature-tab">
        <div className="chart-container">
          <Line data={temperatureChartData} options={temperatureOptions} />
        </div>
      </div>
    </div>
  );
};

export default VisualizationContainer;