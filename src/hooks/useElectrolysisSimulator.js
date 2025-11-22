// src/hooks/useElectrolysisSimulator.js
import { useState, useEffect, useCallback } from 'react';

export const useElectrolysisSimulator = () => {
  // Основные параметры согласно справочнику
  const [current, setCurrent] = useState(300); // кА (диапазон 200-400 кА)
  const [voltage, setVoltage] = useState(4.2); // В (диапазон 4.0-4.5 В)
  const [temperature, setTemperature] = useState(960); // °C (диапазон 950-970 °C)
  const [aluminaConcentration, setAluminaConcentration] = useState(4.0); // % (диапазон 2-6%)
  
  // Дополнительные параметры для расширенного функционала
  const [metalLevel, setMetalLevel] = useState(20); // см
  const [alf3, setAlf3] = useState(12); // %
  const [caf2, setCaf2] = useState(6); // %
  
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  
  // "Ручка" для будущих анимаций
  const [animationTriggers, setAnimationTriggers] = useState({
    ionMovement: false,
    gasBubbles: false,
    metalAccumulation: false,
    anodeEffect: false,
    electrolyteFreezing: false,
    shortCircuit: false
  });
  
  const [journal, setJournal] = useState(() => {
    const saved = localStorage.getItem('electrolysisJournal');
    return saved ? JSON.parse(saved) : [];
  });

  // Сохранение журнала при изменении
  useEffect(() => {
    localStorage.setItem('electrolysisJournal', JSON.stringify(journal));
  }, [journal]);

  // Константа для расчетов - электрохимический эквивалент алюминия (г/А*ч)
  const g_Al = 0.3356;

  // Расчет выхода по току согласно справочнику
  const calculateCurrentEfficiency = useCallback(() => {
    if (isEmergency) {
      if (emergencyType === 'anodeEffect') return 60;
      if (emergencyType === 'electrolyteFreezing') return 70;
      if (emergencyType === 'shortCircuit') return 50;
    }
    
    let baseEfficiency = 90; // Базовое значение Eta_0
    
    // Поправка от температуры (Delta_Eta_T)
    let tempCorrection = 0;
    if (temperature === 960) {
      tempCorrection = 0;
    } else if (temperature > 960) {
      tempCorrection = -0.5 * (temperature - 960);
    } else if (temperature > 950 && temperature < 960) {
      tempCorrection = -0.3 * (960 - temperature);
    } else if (temperature <= 950) {
      // Критическое охлаждение
      setIsEmergency(true);
      setEmergencyType('electrolyteFreezing');
      tempCorrection = -20; // Условное значение для падения до 70%
    }
    
    // Поправка от концентрации глинозёма (Delta_Eta_C)
    let aluminaCorrection = 0;
    if (aluminaConcentration >= 3.5 && aluminaConcentration <= 4.5) {
      aluminaCorrection = 0;
    } else if (aluminaConcentration >= 3.0 && aluminaConcentration < 3.5) {
      aluminaCorrection = -0.5 * (3.5 - aluminaConcentration);
    } else if (aluminaConcentration < 3.0) {
      // Критический недостаток - Анодный Эффект
      setIsEmergency(true);
      setEmergencyType('anodeEffect');
      aluminaCorrection = -30; // Условное значение для падения до 60%
    }
    
    let efficiency = baseEfficiency + tempCorrection + aluminaCorrection;
    return Math.max(70, Math.min(95, efficiency));
  }, [temperature, aluminaConcentration, isEmergency, emergencyType]);

  // Расчет удельного расхода электроэнергии согласно справочнику
  const calculateEnergyConsumption = useCallback(() => {
    const efficiency = calculateCurrentEfficiency();
    
    // Проверка на короткое замыкание
    if (voltage < 4.0) {
      setIsEmergency(true);
      setEmergencyType('shortCircuit');
    } else if (emergencyType === 'shortCircuit' && voltage >= 4.0) {
      setIsEmergency(false);
      setEmergencyType('');
    }
    
    // Формула: E_уд = (U * 1000) / (g_Al * (Eta / 100))
    const consumption = (voltage * 1000) / (g_Al * (efficiency / 100));
    return parseFloat(consumption.toFixed(2));
  }, [voltage, calculateCurrentEfficiency, isEmergency, emergencyType]);

  // Расчет расхода анодного материала
  const calculateAnodeConsumption = useCallback(() => {
    const efficiency = calculateCurrentEfficiency();
    // Формула: Расход_Анода = 334 / (Eta / 100)
    return parseFloat((334 / (efficiency / 100)).toFixed(2));
  }, [calculateCurrentEfficiency]);

  // Проверка аварийных условий
  const checkEmergencyConditions = useCallback(() => {
    const efficiency = calculateCurrentEfficiency();
    let status = 'Норма';
    let warning = false;
    let danger = false;
    
    if (isEmergency) {
      if (emergencyType === 'anodeEffect') {
        status = 'Анодный Эффект';
        danger = true;
        // Активация анимации для будущей реализации
        setAnimationTriggers(prev => ({ ...prev, anodeEffect: true }));
      } else if (emergencyType === 'electrolyteFreezing') {
        status = 'Опасность застывания';
        danger = true;
        // Активация анимации для будущей реализации
        setAnimationTriggers(prev => ({ ...prev, electrolyteFreezing: true }));
      } else if (emergencyType === 'shortCircuit') {
        status = 'Короткое замыкание';
        danger = true;
        // Активация анимации для будущей реализации
        setAnimationTriggers(prev => ({ ...prev, shortCircuit: true }));
      }
    } else {
      // Сброс анимаций при нормализации
      if (animationTriggers.anodeEffect || animationTriggers.electrolyteFreezing || animationTriggers.shortCircuit) {
        setAnimationTriggers({
          ionMovement: false,
          gasBubbles: false,
          metalAccumulation: false,
          anodeEffect: false,
          electrolyteFreezing: false,
          shortCircuit: false
        });
      }
      
      if (efficiency < 85) {
        status = 'Предупреждение';
        warning = true;
      }
    }
    
    return { status, warning, danger };
  }, [isEmergency, emergencyType, calculateCurrentEfficiency, animationTriggers]);

  // Расчет свойств сплава (без изменений)
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
    const step = 10;
    
    for (let i = -100; i <= 100; i += step) {
      const testCurrent = centerValue + i;
      if (testCurrent >= 200 && testCurrent <= 400) {
        // Сохраняем текущие значения параметров
        const originalTemp = temperature;
        const originalAlumina = aluminaConcentration;
        
        // Временно устанавливаем тестовые значения для расчета
        // (в реальном приложении здесь потребуется перерасчет с учетом всех зависимостей)
        
        let efficiency = 90;
        // Простая линейная зависимость для демонстрации
        efficiency += (testCurrent - 300) * 0.02;
        
        // Границы эффективности
        efficiency = Math.max(70, Math.min(95, efficiency));
        
        data.push(efficiency);
        labels.push(`${testCurrent}`);
      }
    }
    
    return { labels, data };
  }, [temperature, aluminaConcentration]);

  const generateEnergyConsumptionData = useCallback((centerValue) => {
    const data = [];
    const labels = [];
    const step = 0.1;
    
    for (let i = -0.5; i <= 0.5; i += step) {
      const testVoltage = centerValue + i;
      if (testVoltage >= 4.0 && testVoltage <= 4.5) {
        // Используем текущую эффективность для расчета
        const efficiency = calculateCurrentEfficiency();
        const consumption = (testVoltage * 1000) / (g_Al * (efficiency / 100));
        
        data.push(parseFloat(consumption.toFixed(2)));
        labels.push(`${testVoltage.toFixed(1)}`);
      }
    }
    
    return { labels, data };
  }, [calculateCurrentEfficiency]);

  const generateTemperatureData = useCallback(() => {
    const data = [];
    const labels = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
      const baseTemp = temperature;
      const variation = Math.sin(i * 0.5) * 2;
      data.push(baseTemp + variation);
    }
    
    return { labels, data };
  }, [temperature]);

  // Обновление статистики
  const getStatistics = useCallback(() => {
    if (journal.length === 0) {
      return {
        avgEfficiency: '0%',
        avgConsumption: '0 кВт·ч/т',
        avgAnodeConsumption: '0 кг/т',
        experimentCount: '0'
      };
    }
    
    const avgEfficiency = journal.reduce((sum, entry) => sum + parseFloat(entry.efficiency), 0) / journal.length;
    const avgConsumption = journal.reduce((sum, entry) => sum + parseFloat(entry.consumption), 0) / journal.length;
    const avgAnodeConsumption = journal.reduce((sum, entry) => sum + parseFloat(entry.anodeConsumption), 0) / journal.length;
    
    return {
      avgEfficiency: `${avgEfficiency.toFixed(1)}%`,
      avgConsumption: `${avgConsumption.toFixed(1)} кВт·ч/т`,
      avgAnodeConsumption: `${avgAnodeConsumption.toFixed(1)} кг/т`,
      experimentCount: journal.length.toString()
    };
  }, [journal]);

  // Добавление записи в журнал
  const addToJournal = useCallback(() => {
    const efficiency = calculateCurrentEfficiency();
    const consumption = calculateEnergyConsumption();
    const anodeConsumption = calculateAnodeConsumption();
    const { status, warning, danger } = checkEmergencyConditions();
    
    const newEntry = {
      timestamp: new Date().toLocaleString('ru-RU'),
      current,
      voltage,
      temperature,
      aluminaConcentration,
      efficiency: efficiency.toFixed(1),
      consumption: consumption.toFixed(1),
      anodeConsumption: anodeConsumption.toFixed(1),
      status
    };
    
    setJournal(prev => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, 50); // Ограничиваем 50 записями
    });
    
    return { 
      success: true, 
      message: danger ? 'Критическая ситуация зафиксирована!' : 'Симуляция выполнена успешно.',
      emergency: danger
    };
  }, [
    current, voltage, temperature, aluminaConcentration,
    calculateCurrentEfficiency, calculateEnergyConsumption, calculateAnodeConsumption,
    checkEmergencyConditions
  ]);

  // Сброс параметров
  const resetParameters = useCallback(() => {
    setCurrent(300);
    setVoltage(4.2);
    setTemperature(960);
    setAluminaConcentration(4.0);
    setMetalLevel(20);
    setAlf3(12);
    setCaf2(6);
    setIsEmergency(false);
    setEmergencyType('');
    return { success: true, message: 'Параметры успешно сброшены в оптимальные значения.' };
  }, []);

  // Аварийная остановка
  const emergencyStop = useCallback(() => {
    setCurrent(250);
    setVoltage(4.2);
    setTemperature(955);
    setAluminaConcentration(4.5);
    setIsEmergency(false);
    setEmergencyType('');
    return { success: true, message: 'Аварийная ситуация устранена. Параметры возвращены в безопасные значения.' };
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
    setTimeout(() => setHighlightedElement(null), 3000);
    
    // Активация соответствующей анимации для будущей реализации
    if (elementType === 'anode') {
      setAnimationTriggers(prev => ({ ...prev, gasBubbles: true }));
    } else if (elementType === 'cathode') {
      setAnimationTriggers(prev => ({ ...prev, metalAccumulation: true }));
    } else if (elementType === 'electrolyte') {
      setAnimationTriggers(prev => ({ ...prev, ionMovement: true }));
    }
  }, []);

  // Экспорт всех необходимых данных и функций
  return {
    current,
    setCurrent,
    voltage,
    setVoltage,
    temperature,
    setTemperature,
    aluminaConcentration,
    setAluminaConcentration,
    metalLevel,
    setMetalLevel,
    alf3,
    setAlf3,
    caf2,
    setCaf2,
    isEmergency,
    emergencyType,
    animationTriggers, // "Ручка" для будущих анимаций
    journal,
    calculateCurrentEfficiency,
    calculateEnergyConsumption,
    calculateAnodeConsumption,
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