from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProcessParameters(BaseModel):
    current: float    # Сила тока в кА (200-400)
    voltage: float    # Напряжение в В (3.0-4.5)
    temperature: float  # Температура в °C (950-970)
    concentration: float  # Концентрация глинозёма в % (2.0-6.0)

class ProcessResults(BaseModel):
    eta: float            # Выход по току в %
    energy_consumption: int  # Удельный расход энергии в кВт·ч/т Al
    productivity: float
    anode_consumption: int   # Расход анодного материала в кг/т Al
    critical_failure: bool   # Флаг критического сбоя
    warning_message: str     # Сообщение предупреждения
    timestamp: str           # Время расчета

class ExperimentLog(BaseModel):
    timestamp: str
    parameters: ProcessParameters
    results: ProcessResults