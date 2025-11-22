from app.config import ETA0, G_AL
from features.simulation.schemas import ProcessResults
from typing import Dict, Any

def calculate_eta(temperature: float, concentration: float) -> Dict[str, Any]:
    eta = ETA0
    critical_failure = False
    warning_message = ''
    
    if temperature == 960:
        pass
    elif temperature > 960:
        delta_t = temperature - 960
        eta -= delta_t * 0.5
    elif temperature > 950:
        delta_t = 960 - temperature
        eta -= delta_t * 0.3
    else:
        eta = 70
        critical_failure = True
        warning_message = 'Опасность застывания электролита!'
    
    if 3.5 <= concentration <= 4.5:
        pass
    elif 3.0 <= concentration < 3.5:
        delta_c = 3.5 - concentration
        eta -= delta_c * 0.5
    elif concentration < 3.0:
        eta = 60
        critical_failure = True
        warning_message = 'Анодный Эффект! Срочно подать глинозём!'
    
    eta = max(60, min(95, eta))
    
    return {
        "eta": round(eta, 1),
        "critical_failure": critical_failure,
        "warning_message": warning_message
    }

def calculate_energy_consumption(voltage: float, eta: float) -> int:
    result = (voltage * 1000) / (G_AL * (eta / 100))
    return round(result)

def calculate_anode_consumption(eta: float) -> int:
    result = 334 / (eta / 100)
    return round(result)

def calculate_productivity(current: float, eta: float) -> float:
    """
    Рассчитывает производительность электролизера в тоннах алюминия в сутки.
    
    Формула:
    m_теор = (I × 24 × g_Al) / 1000 - теоретическая производительность
    m_факт = m_теор × (eta / 100) - фактическая производительность
    
    где:
    I - сила тока в килоамперах (кА)
    24 - количество часов в сутках
    g_Al - электрохимический эквивалент алюминия (0.3356 г/А·ч)
    1000 - перевод граммов в килограммы и килограммов в тонны
    eta - выход по току в процентах
    
    Аргументы:
    current: float - сила тока в килоамперах
    eta: float - выход по току в процентах
    
    Возвращает:
    float - производительность в тоннах в сутки
    """
    # Теоретическая производительность (т/сут)
    theoretical_productivity = (current * 24 * G_AL) / 1000
    
    # Фактическая производительность с учетом выхода по току
    actual_productivity = theoretical_productivity * (eta / 100)
    
    return round(actual_productivity, 1)