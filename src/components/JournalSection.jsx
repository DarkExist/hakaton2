// src/components/JournalSection.js
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const JournalSection = ({ simulator }) => {
  const { journal, getStatistics, clearJournal } = simulator;
  const [activeTab, setActiveTab] = useState('history');
  const [notifications, setNotifications] = useState([]);
  
  const statistics = getStatistics();
  
  // График истории экспериментов
  const historyData = {
    labels: journal.map((entry, index) => `#${journal.length - index}`),
    datasets: [
      {
        label: 'Выход по току (%)',
        data: journal.map(entry => parseFloat(entry.efficiency)),
        borderColor: '#1a56db',
        backgroundColor: 'rgba(26, 86, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Расход энергии (кВт·ч/кг)',
        data: journal.map(entry => parseFloat(entry.consumption)),
        borderColor: '#0e9f6e',
        backgroundColor: 'rgba(14, 159, 110, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };
  
  const historyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'История экспериментов'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 80,
        max: 96,
        title: {
          display: true,
          text: 'Выход по току (%)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 12,
        max: 18,
        title: {
          display: true,
          text: 'Расход энергии (кВт·ч/кг)'
        },
        grid: {
          drawOnChartArea: false
        }
      },
      x: {
        title: {
          display: true,
          text: 'Эксперименты'
        }
      }
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
  
  const handleClearJournal = () => {
    if (window.confirm('Вы уверены, что хотите очистить журнал экспериментов?')) {
      const result = clearJournal();
      addNotification(result.message, result.success ? 'success' : 'error');
    }
  };
  
  return (
    <div className="journal-container">
      <h2 className="section-title">Журнал экспериментов</h2>
      <table className="journal-table">
        <thead>
          <tr>
            <th>Дата и время</th>
            <th>Сила тока (кА)</th>
            <th>Температура (°C)</th>
            <th>Уровень металла (см)</th>
            <th>AlF₃ (%)</th>
            <th>CaF₂ (%)</th>
            <th>Выход по току (%)</th>
            <th>Расход энергии (кВт·ч/кг)</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody id="journal-entries">
          {journal.map((entry, index) => {
            let statusClass = 'status-normal';
            if (entry.status === 'Предупреждение') statusClass = 'status-warning';
            if (entry.status === 'Авария') statusClass = 'status-danger';
            
            return (
              <tr key={index}>
                <td>{entry.timestamp}</td>
                <td>{entry.current} кА</td>
                <td>{entry.temperature} °C</td>
                <td>{entry.metalLevel} см</td>
                <td>{entry.alf3}%</td>
                <td>{entry.caf2}%</td>
                <td>{entry.efficiency}%</td>
                <td>{entry.consumption} кВт·ч/кг</td>
                <td><span className={`status-badge ${statusClass}`}>{entry.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="tabs" style={{ marginTop: '30px' }}>
        <div 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`} 
          data-journal-tab="history"
          onClick={() => setActiveTab('history')}
        >
          История экспериментов
        </div>
        <div 
          className={`tab ${activeTab === 'statistics' ? 'active' : ''}`} 
          data-journal-tab="statistics"
          onClick={() => setActiveTab('statistics')}
        >
          Статистика
        </div>
      </div>
      
      <div className={`tab-content ${activeTab === 'history' ? 'active' : ''}`} id="history-tab">
        <h3 style={{ marginTop: '20px' }}>График истории экспериментов</h3>
        <div className="history-chart-container">
          <Line data={historyData} options={historyOptions} />
        </div>
      </div>
      
      <div className={`tab-content ${activeTab === 'statistics' ? 'active' : ''}`} id="statistics-tab">
        <h3 style={{ marginTop: '20px' }}>Статистические показатели</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginTop: '15px'
        }}>
          <div style={{ 
            background: '#f8fafc', 
            padding: '15px', 
            borderRadius: '8px', 
            borderLeft: '4px solid #1a56db'
          }}>
            <h4>Средний выход по току</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a56db' }}>
              {statistics.avgEfficiency}
            </p>
          </div>
          <div style={{ 
            background: '#f8fafc', 
            padding: '15px', 
            borderRadius: '8px', 
            borderLeft: '4px solid #10b981'
          }}>
            <h4>Средний расход энергии</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
              {statistics.avgConsumption}
            </p>
          </div>
          <div style={{ 
            background: '#f8fafc', 
            padding: '15px', 
            borderRadius: '8px', 
            borderLeft: '4px solid #f59e0b'
          }}>
            <h4>Количество экспериментов</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {statistics.experimentCount}
            </p>
          </div>
        </div>
      </div>
      
      <button className="btn btn-block" id="clear-journal" onClick={handleClearJournal}>
        Очистить журнал
      </button>
      
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

export default JournalSection;