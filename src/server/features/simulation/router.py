from fastapi import APIRouter, HTTPException
from datetime import datetime

from features.simulation.schemas import ProcessParameters, ProcessResults
from features.simulation.calculator import (
    calculate_eta,
    calculate_energy_consumption,
    calculate_anode_consumption
)

router = APIRouter()

@router.post("/simulate", response_model=ProcessResults)
async def simulate_process(params: ProcessParameters):
    if not (200 <= params.current <= 400):
        raise HTTPException(
            status_code=400, 
            detail="Сила тока должна быть в диапазоне 200-400 кА"
        )
    
    # ИСПРАВЛЕНО: расширен диапазон напряжения до 3.0В
    if not (3.0 <= params.voltage <= 4.5):
        raise HTTPException(
            status_code=400, 
            detail="Напряжение должно быть в диапазоне 3.0-4.5 В"
        )
    
    if not (950 <= params.temperature <= 970):
        raise HTTPException(
            status_code=400, 
            detail="Температура должна быть в диапазоне 950-970 °C"
        )
    
    if not (2.0 <= params.concentration <= 6.0):
        raise HTTPException(
            status_code=400, 
            detail="Концентрация глинозёма должна быть в диапазоне 2.0-6.0 %"
        )
    
    warning_message = ""
    
    # Добавлено предупреждение для напряжения ниже 4.0В
    if params.voltage < 4.0:
        warning_message = "Напряжение ниже 4.0В нестабильно! Возможны колебания процесса."
    
    eta_result = calculate_eta(params.temperature, params.concentration)
    eta = eta_result["eta"]
    
    if eta_result["warning_message"] and not warning_message:
        warning_message = eta_result["warning_message"]
    
    energy = calculate_energy_consumption(params.voltage, eta)
    anode = calculate_anode_consumption(eta)
    
    if not warning_message and (
        eta < 85 or 
        abs(params.temperature - 960) > 5 or 
        abs(params.concentration - 4.0) > 0.8
    ):
        warning_message = "Параметры отклонены от оптимальных значений"
    
    return ProcessResults(
        eta=eta,
        energy_consumption=energy,
        anode_consumption=anode,
        critical_failure=eta_result["critical_failure"],
        warning_message=warning_message,
        timestamp=datetime.now().isoformat()
    )