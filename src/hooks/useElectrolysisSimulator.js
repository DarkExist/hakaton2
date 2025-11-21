// src/hooks/useElectrolysisSimulator.js
import { useState, useEffect, useCallback } from 'react';

export const useElectrolysisSimulator = () => {
  const [current, setCurrent] = useState(160); // кА
  const [temperature, setTemperature] = useState(960); // °C
  const [metalLevel, setMetalLevel] = useState(20); // см
  const [alf3, setAlf3] = useState(12); // %
  const [caf2, setCaf2] = useState(6); // %
  const [isEmergency, setIsEmergency] = useState(false);
  const [journal, setJournal] = useState(() => {
    const saved = localStorage.getItem('electrolysisJournal');
    return saved ? JSON.parse(saved) : [];
  });

  // Сохранение журнала при изменении
  useEffect(() => {
    localStorage.setItem('electrolysisJournal', JSON.stringify(journal));
  }, [journal]);

  // Расчет выхода по току
  const calculateCurrentEfficiency = useCallback(() => {
    if (isEmergency) return 0;
    
    let efficiency = 92;
    // Влияние силы тока
    if (current < 140) efficiency -= (140 - current) * 0.3;
    if (current > 180) efficiency -= (current - 180) * 0.4;
    // Влияние температуры
    if (temperature < 940) efficiency -= (940 - temperature) * 0.15;
    if (temperature > 980) efficiency -= (temperature - 980) * 0.2;
    // Влияние уровня металла
    if (metalLevel < 18) efficiency -= (18 - metalLevel) * 0.5;
    if (metalLevel > 25) efficiency -= (metalLevel - 25) * 0.3;
    // Влияние состава электролита
    if (alf3 < 10 || alf3 > 14) efficiency -= 2;
    if (caf2 < 5 || caf2 > 7) efficiency -= 1;
    
    return Math.max(70, Math.min(95, efficiency));
  }, [current, temperature, metalLevel, alf3, caf2, isEmergency]);

  // Расчет расхода энергии
  const calculateEnergyConsumption = useCallback(() => {
    if (isEmergency) return 25.0;
    
    let consumption = 13.5;
    // Влияние силы тока
    consumption += (current - 160) * 0.02;
    // Влияние температуры
    consumption += (temperature - 960) * 0.01;
    // Влияние уровня металла
    if (metalLevel < 18) consumption += (18 - metalLevel) * 0.1;
    if (metalLevel > 25) consumption += (metalLevel - 25) * 0.05;
    // Влияние состава электролита
    if (alf3 < 10 || alf3 > 14) consumption += 0.3;
    if (caf2 < 5 || caf2 > 7) consumption += 0.2;
    // Влияние выхода по току
    const efficiency = calculateCurrentEfficiency();
    consumption *= (92 / efficiency);
    
    return Math.max(12.0, Math.min(18.0, parseFloat(consumption.toFixed(2))));
  }, [current, temperature, metalLevel, alf3, caf2, calculateCurrentEfficiency, isEmergency]);

  // Проверка аварийных условий
  const checkEmergencyConditions = useCallback(() => {
    let warning = false;
    let danger = false;
    
    // Предупреждающие условия
    if (current < 130 || current > 190 ||
        temperature < 920 || temperature > 990 ||
        metalLevel < 16 || metalLevel > 28 ||
        alf3 < 8 || alf3 > 15 ||
        caf2 < 4 || caf2 > 8) {
      warning = true;
    }
    
    // Аварийные условия
    if (current < 125 || current > 195 ||
        temperature < 910 || temperature > 995 ||
        metalLevel < 15 || metalLevel > 30 ||
        alf3 < 7 || alf3 > 16 ||
        caf2 < 3 || caf2 > 9) {
      danger = true;
      setIsEmergency(true);
    } else {
      setIsEmergency(false);
    }
    
    return { warning, danger };
  }, [current, temperature, metalLevel, alf3, caf2]);

  // Расчет свойств сплава
  const calculateAlloyProperties = useCallback((al, mg, si) => {
    const tensileStrength = 180 + mg * 15 + si * 5 - (100 - al) * 0.5;
    const ductility = 25 - mg * 1.5 - si * 0.8;
    let corrosionResistance = "Отличная";
    
    if (mg > 5 || si > 8) corrosionResistance = "Удовлетворительная";
    else if (mg > 3 || si > 5) corrosionResistance = "Хорошая";
    
    let application = "Конструкционные элементы";
    if (tensileStrength > 250) application = "Силовые конструкции";
    if (ductility > 20) application = "Детали сложной формы";
    
    return {
      tensileStrength: Math.round(tensileStrength),
      ductility: Math.round(ductility),
      corrosionResistance,
      application
    };
  }, []);

  // Генерация данных для графиков
  const generateCurrentEfficiencyData = useCallback((centerValue) => {
    const data = [];
    const labels = [];
    const step = 5;
    
    for (let i = -25; i <= 25; i += step) {
      const testCurrent = centerValue + i;
      if (testCurrent >= 120 && testCurrent <= 200) {
        let efficiency = 92;
        // Влияние силы тока
        if (testCurrent < 140) efficiency -= (140 - testCurrent) * 0.3;
        if (testCurrent > 180) efficiency -= (testCurrent - 180) * 0.4;
        // Влияние температуры (текущее значение)
        if (temperature < 940) efficiency -= (940 - temperature) * 0.15;
        if (temperature > 980) efficiency -= (temperature - 980) * 0.2;
        // Влияние уровня металла (текущее значение)
        if (metalLevel < 18) efficiency -= (18 - metalLevel) * 0.5;
        if (metalLevel > 25) efficiency -= (metalLevel - 25) * 0.3;
        // Влияние состава электролита (текущие значения)
        if (alf3 < 10 || alf3 > 14) efficiency -= 2;
        if (caf2 < 5 || caf2 > 7) efficiency -= 1;
        
        data.push(Math.max(70, Math.min(95, efficiency)));
        labels.push(`${testCurrent}`);
      }
    }
    
    return { labels, data };
  }, [temperature, metalLevel, alf3, caf2]);

  const generateEnergyConsumptionData = useCallback((centerValue) => {
    const data = [];
    const labels = [];
    const step = 5;
    
    for (let i = -25; i <= 25; i += step) {
      const testTemp = centerValue + i;
      if (testTemp >= 900 && testTemp <= 1000) {
        let consumption = 13.5;
        // Влияние температуры (тестовое значение)
        consumption += (testTemp - 960) * 0.01;
        // Влияние силы тока (текущее значение)
        consumption += (current - 160) * 0.02;
        // Влияние уровня металла (текущее значение)
        if (metalLevel < 18) consumption += (18 - metalLevel) * 0.1;
        if (metalLevel > 25) consumption += (metalLevel - 25) * 0.05;
        // Влияние состава электролита (текущие значения)
        if (alf3 < 10 || alf3 > 14) consumption += 0.3;
        if (caf2 < 5 || caf2 > 7) consumption += 0.2;
        // Влияние выхода по току
        let efficiency = 92;
        // Расчет эффективности с учетом всех параметров
        if (current < 140) efficiency -= (140 - current) * 0.3;
        if (current > 180) efficiency -= (current - 180) * 0.4;
        if (testTemp < 940) efficiency -= (940 - testTemp) * 0.15;
        if (testTemp > 980) efficiency -= (testTemp - 980) * 0.2;
        if (metalLevel < 18) efficiency -= (18 - metalLevel) * 0.5;
        if (metalLevel > 25) efficiency -= (metalLevel - 25) * 0.3;
        if (alf3 < 10 || alf3 > 14) efficiency -= 2;
        if (caf2 < 5 || caf2 > 7) efficiency -= 1;
        efficiency = Math.max(70, Math.min(95, efficiency));
        consumption *= (92 / efficiency);
        
        data.push(Math.max(12.0, Math.min(18.0, parseFloat(consumption.toFixed(2)))));
        labels.push(`${testTemp}`);
      }
    }
    
    return { labels, data };
  }, [current, metalLevel, alf3, caf2]);

  const generateTemperatureData = useCallback(() => {
    const data = [];
    const labels = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
      const baseTemp = temperature;
      const variation = Math.sin(i * 0.5) * 3;
      data.push(baseTemp + variation);
    }
    
    return { labels, data };
  }, [temperature]);

  // Обновление статистики
  const getStatistics = useCallback(() => {
    if (journal.length === 0) {
      return {
        avgEfficiency: '0%',
        avgConsumption: '0 кВт·ч/кг',
        experimentCount: '0'
      };
    }
    
    const avgEfficiency = journal.reduce((sum, entry) => sum + parseFloat(entry.efficiency), 0) / journal.length;
    const avgConsumption = journal.reduce((sum, entry) => sum + parseFloat(entry.consumption), 0) / journal.length;
    
    return {
      avgEfficiency: `${avgEfficiency.toFixed(1)}%`,
      avgConsumption: `${avgConsumption.toFixed(1)} кВт·ч/кг`,
      experimentCount: journal.length.toString()
    };
  }, [journal]);

  // Добавление записи в журнал
  const addToJournal = useCallback(() => {
    const { warning, danger } = checkEmergencyConditions();
    const status = danger ? 'Авария' : (warning ? 'Предупреждение' : 'Норма');
    
    const newEntry = {
      timestamp: new Date().toLocaleString('ru-RU'),
      current,
      temperature,
      metalLevel,
      alf3,
      caf2,
      efficiency: calculateCurrentEfficiency().toFixed(1),
      consumption: calculateEnergyConsumption().toFixed(2),
      status
    };
    
    setJournal(prev => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, 50); // Ограничиваем 50 записями
    });
    
    return { success: true, message: 'Симуляция выполнена. Результаты обновлены.' };
  }, [current, temperature, metalLevel, alf3, caf2, calculateCurrentEfficiency, calculateEnergyConsumption, checkEmergencyConditions]);

  // Сброс параметров
  const resetParameters = useCallback(() => {
    setCurrent(160);
    setTemperature(960);
    setMetalLevel(20);
    setAlf3(12);
    setCaf2(6);
    setIsEmergency(false);
    return { success: true, message: 'Параметры успешно сброшены.' };
  }, []);

  // Аварийная остановка
  const emergencyStop = useCallback(() => {
    setCurrent(150);
    setTemperature(950);
    setMetalLevel(18);
    setAlf3(12);
    setCaf2(6);
    setIsEmergency(false);
    return { success: true, message: 'Аварийная ситуация устранена. Параметры возвращены в норму.' };
  }, []);

  // Очистка журнала
  const clearJournal = useCallback(() => {
    setJournal([]);
    return { success: true, message: 'Журнал успешно очищен.' };
  }, []);

  // Подсветка элементов
  const [highlightedElement, setHighlightedElement] = useState(null);

  const highlightElement = useCallback((elementType) => {
    setHighlightedElement(elementType);
    setTimeout(() => setHighlightedElement(null), 5000);
  }, []);

  // Экспорт всех необходимых данных и функций
  return {
    current,
    setCurrent,
    temperature,
    setTemperature,
    metalLevel,
    setMetalLevel,
    alf3,
    setAlf3,
    caf2,
    setCaf2,
    isEmergency,
    journal,
    calculateCurrentEfficiency,
    calculateEnergyConsumption,
    checkEmergencyConditions,
    addToJournal,
    resetParameters,
    emergencyStop,
    clearJournal,
    generateCurrentEfficiencyData,
    generateEnergyConsumptionData,
    generateTemperatureData,
    getStatistics,
    calculateAlloyProperties,
    highlightedElement,
    highlightElement
  };
};