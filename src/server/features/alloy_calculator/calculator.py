from features.alloy_calculator.schemas import AlloyComposition, AlloyProperties

def calculate_alloy_properties(composition: AlloyComposition) -> AlloyProperties:
    """Рассчитывает свойства алюминиевого сплава на основе его химического состава."""
    
    # Базовые значения для чистого алюминия
    base_tensile_strength = 45  # МПа
    base_yield_strength = 20   # МПа
    base_elongation = 40       # %
    base_hardness = 20         # HB
    base_density = 2.70        # г/см³
    base_thermal_conductivity = 235  # Вт/(м·K)
    
    # Коэффициенты влияния легирующих элементов на прочность
    strength_coefficients = {
        'mg': 28,    # МПа/% - Mg значительно упрочняет алюминий
        'si': 15,    # МПа/% - Si дает среднее упрочнение
        'cu': 32,    # МПа/% - Cu обеспечивает высокое упрочнение
        'zn': 25,    # МПа/% - Zn имеет сильное упрочняющее действие
        'mn': 12,    # МПа/% - Mn дает умеренное упрочнение
        'ti': 2      # МПа/% - Ti незначительно влияет на прочность, но улучшает структуру
    }
    
    # Расчет предела прочности
    tensile_strength = base_tensile_strength
    for element, coeff in strength_coefficients.items():
        content = getattr(composition, element)
        effective_content = min(content, 5.0)  # Эффект насыщения после 5%
        tensile_strength += coeff * effective_content
    
    # Ограничения прочности для реалистичных значений
    tensile_strength = min(max(tensile_strength, 45), 750)
    
    # Расчет предела текучести
    yield_strength = tensile_strength * 0.75
    
    # Расчет пластичности
    elongation = max(2.0, 45 - (tensile_strength - 45) * 0.08)
    
    # Расчет твердости
    hardness = 18 + tensile_strength * 0.12
    
    # Расчет плотности
    density = (
        base_density * (composition.al / 100) +
        1.74 * (composition.mg / 100) +   # Плотность Mg
        2.33 * (composition.si / 100) +   # Плотность Si
        8.96 * (composition.cu / 100) +   # Плотность Cu
        7.13 * (composition.zn / 100) +   # Плотность Zn
        7.21 * (composition.mn / 100) +   # Плотность Mn  
        4.51 * (composition.ti / 100)     # Плотность Ti
    )
    
    # Расчет теплопроводности
    thermal_conductivity = base_thermal_conductivity
    thermal_conductivity -= composition.si * 5
    thermal_conductivity -= composition.cu * 8
    thermal_conductivity -= composition.zn * 3
    thermal_conductivity = max(thermal_conductivity, 50)
    
    # Оценка коррозионной стойкости
    corrosion_points = 100
    
    corrosion_points -= composition.cu * 15
    corrosion_points -= composition.zn * 8
    corrosion_points -= composition.si * 3
    corrosion_points += composition.mg * 2
    corrosion_points += composition.mn * 5
    
    if corrosion_points > 85:
        corrosion_resistance = "Отличная"
    elif corrosion_points > 70:
        corrosion_resistance = "Хорошая"
    elif corrosion_points > 50:
        corrosion_resistance = "Удовлетворительная"
    else:
        corrosion_resistance = "Низкая"
    
    # Оценка свариваемости
    weldability_points = 100
    weldability_points -= composition.cu * 12
    weldability_points -= composition.zn * 10
    weldability_points -= composition.si * 5
    weldability_points -= composition.mg * 3
    
    if weldability_points > 85:
        weldability = "Отличная"
    elif weldability_points > 70:
        weldability = "Хорошая"
    elif weldability_points > 50:
        weldability = "Удовлетворительная"
    else:
        weldability = "Низкая"
    
    # Определение серии сплава
    if composition.cu > 1.0:
        alloy_series = "2xxx (Al-Cu)"
    elif composition.si > 4.0 and composition.mg > 0.2:
        alloy_series = "6xxx (Al-Mg-Si)"
    elif composition.zn > 1.0:
        alloy_series = "7xxx (Al-Zn)"
    elif composition.mg > 0.5 and composition.mn < 1.0 and composition.si < 1.0:
        alloy_series = "5xxx (Al-Mg)"
    elif composition.mn > 0.5:
        alloy_series = "3xxx (Al-Mn)"
    elif composition.si > 1.0 and composition.mg < 0.2:
        alloy_series = "4xxx (Al-Si)"
    else:
        alloy_series = "1xxx (Чистый алюминий)"
    
    # Рекомендуемые области применения
    recommended_applications = []
    
    if tensile_strength < 100:
        recommended_applications.extend(["Электротехника", "Химическое оборудование", "Фольга и упаковка"])
    elif tensile_strength < 250:
        if weldability_points > 70:
            recommended_applications.extend(["Судостроение", "Резервуары для жидкостей", "Конструкции зданий"])
        else:
            recommended_applications.extend(["Автомобильные диски", "Детали корпусов", "Бытовая техника"])
    elif tensile_strength < 400:
        if composition.mg > 2.0 and composition.si > 0.5:
            recommended_applications.extend(["Автомобильные детали", "Архитектурные элементы", "Сварные конструкции"])
        else:
            recommended_applications.extend(["Авиационные детали", "Спортивное оборудование", "Кузовные панели"])
    else:
        recommended_applications.extend(["Авиационные конструкции", "Космическая техника", "Высоконагруженные детали"])
    
    if corrosion_resistance in ["Отличная", "Хорошая"]:
        recommended_applications.append("Морское оборудование")
    
    if thermal_conductivity > 180:
        recommended_applications.append("Теплообменное оборудование")
    
    # Удаление дубликатов из рекомендаций
    recommended_applications = list(set(recommended_applications))[:5]
    
    return AlloyProperties(
        tensile_strength=round(tensile_strength, 1),
        yield_strength=round(yield_strength, 1),
        elongation=round(elongation, 1),
        hardness=round(hardness, 1),
        density=round(density, 2),
        thermal_conductivity=round(thermal_conductivity, 1),
        corrosion_resistance=corrosion_resistance,
        weldability=weldability,
        recommended_applications=recommended_applications,
        alloy_series=alloy_series
    )