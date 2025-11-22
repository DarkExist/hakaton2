from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime
import os

app = FastAPI(
    title="Электролиз 360 API",
    description="API для расчета параметров процесса Холла-Эру производства алюминия",
    version="1.0.0"
)

# Настройка статических файлов и шаблонов
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

# Создание директорий если их нет
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "js"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "css"), exist_ok=True)
os.makedirs(templates_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Константы из симулятора
G_AL = 0.3356  # Электрохимический эквивалент алюминия (г/А·ч)
ETA0 = 90      # Базовый выход по току в процентах

class ProcessParameters(BaseModel):
    current: float  # Сила тока в кА (200-400)
    voltage: float  # Напряжение в В (4.0-4.5)
    temperature: float  # Температура в °C (950-970)
    concentration: float  # Концентрация глинозёма в % (2.0-6.0)

class ProcessResults(BaseModel):
    eta: float            # Выход по току в %
    energy_consumption: int  # Удельный расход энергии в кВт·ч/т Al
    anode_consumption: int   # Расход анодного материала в кг/т Al
    critical_failure: bool   # Флаг критического сбоя
    warning_message: str     # Сообщение предупреждения
    timestamp: str           # Время расчета

def calculate_eta(temperature: float, concentration: float) -> Dict[str, Any]:
    """
    Функция расчета выхода по току с учетом температуры и концентрации глинозёма.
    """
    eta = ETA0
    critical_failure = False
    warning_message = ''
    
    # Расчет поправки по температуре
    if temperature == 960:
        # Оптимум, нет поправки
        pass
    elif temperature > 960:
        # Перегрев
        delta_t = temperature - 960
        eta -= delta_t * 0.5
    elif temperature > 950:
        # Охлаждение
        delta_t = 960 - temperature
        eta -= delta_t * 0.3
    else:
        # Критическое охлаждение
        eta = 70
        critical_failure = True
        warning_message = 'Опасность застывания электролита!'
    
    # Расчет поправки по концентрации глинозёма
    if 3.5 <= concentration <= 4.5:
        # Оптимум, нет поправки
        pass
    elif 3.0 <= concentration < 3.5:
        # Недостаток
        delta_c = 3.5 - concentration
        eta -= delta_c * 0.5
    elif concentration < 3.0:
        # Критический недостаток
        eta = 60
        critical_failure = True
        warning_message = 'Анодный Эффект! Срочно подать глинозём!'
    
    # Ограничение выхода по току в пределах 60-95%
    eta = max(60, min(95, eta))
    
    return {
        "eta": round(eta, 1),
        "critical_failure": critical_failure,
        "warning_message": warning_message
    }

def calculate_energy_consumption(voltage: float, eta: float) -> int:
    """
    Функция расчета удельного расхода энергии.
    """
    result = (voltage * 1000) / (G_AL * (eta / 100))
    return round(result)

def calculate_anode_consumption(eta: float) -> int:
    """
    Функция расчета расхода анодного материала.
    """
    result = 334 / (eta / 100)
    return round(result)

@app.post("/api/simulate", response_model=ProcessResults)
async def simulate_process(params: ProcessParameters):
    """
    Эндпоинт для симуляции процесса электролиза.
    """
    # Валидация входных параметров
    if not (200 <= params.current <= 400):
        raise HTTPException(status_code=400, detail="Сила тока должна быть в диапазоне 200-400 кА")
    
    if not (4.0 <= params.voltage <= 4.5):
        raise HTTPException(status_code=400, detail="Напряжение должно быть в диапазоне 4.0-4.5 В")
    
    if not (950 <= params.temperature <= 970):
        raise HTTPException(status_code=400, detail="Температура должна быть в диапазоне 950-970 °C")
    
    if not (2.0 <= params.concentration <= 6.0):
        raise HTTPException(status_code=400, detail="Концентрация глинозёма должна быть в диапазоне 2.0-6.0 %")
    
    # Проверка критического напряжения
    warning_message = ""
    if params.voltage < 4.0:
        warning_message = "Опасность короткого замыкания!"
    
    # Расчет выхода по току
    eta_result = calculate_eta(params.temperature, params.concentration)
    eta = eta_result["eta"]
    
    # Если есть предупреждение из расчета eta и нет предупреждения о напряжении, используем его
    if eta_result["warning_message"] and not warning_message:
        warning_message = eta_result["warning_message"]
    
    # Расчет остальных метрик
    energy = calculate_energy_consumption(params.voltage, eta)
    anode = calculate_anode_consumption(eta)
    
    # Определение общего предупреждения
    if not warning_message and (eta < 85 or abs(params.temperature - 960) > 5 or abs(params.concentration - 4.0) > 0.8):
        warning_message = "Параметры отклонены от оптимальных значений"
    
    return ProcessResults(
        eta=eta,
        energy_consumption=energy,
        anode_consumption=anode,
        critical_failure=eta_result["critical_failure"],
        warning_message=warning_message,
        timestamp=datetime.now().isoformat()
    )

@app.get("/api/parameters")
async def get_parameters_info():
    """
    Эндпоинт для получения информации о допустимых параметрах.
    """
    return {
        "current": {"min": 200, "max": 400, "unit": "кА", "description": "Сила тока, определяет скорость производства алюминия"},
        "voltage": {"min": 4.0, "max": 4.5, "unit": "В", "description": "Напряжение, влияет на удельный расход энергии"},
        "temperature": {"min": 950, "max": 970, "unit": "°C", "description": "Температура, критически влияет на выход по току"},
        "concentration": {"min": 2.0, "max": 6.0, "unit": "%", "description": "Концентрация глинозёма, недостаток вызывает анодный эффект"}
    }

@app.get("/api/formulas")
async def get_formulas():
    """
    Эндпоинт для получения информации о формулах расчета.
    """
    return {
        "eta_formula": "η = η₀ + Δηₜ + Δη꜀",
        "energy_formula": "E_уд = (U × 1000) / (g_Al × (η/100))",
        "anode_formula": "Расход_анода = 334 / (η/100)",
        "g_al": G_AL,
        "eta0": ETA0,
        "reactions": {
            "cathode": "Al³⁺ + 3e⁻ → Al(ж)",
            "anode": "C + O²⁻ → CO₂ + 2e⁻",
            "overall": "2Al₂O₃ + 3C → 4Al + 3CO₂"
        }
    }

@app.get("/")
async def get_index(request: Request):
    """
    Корневой эндпоинт для отображения веб-интерфейса.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """
    Эндпоинт для проверки работоспособности API.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Электролиз 360 API"
    }