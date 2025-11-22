import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from shared.database import Base, engine
from features.auth.router import router as auth_router
from features.simulation.router import router as simulation_router
from features.experiments.router import router as experiments_router
from features.alloy_calculator.router import router as alloy_router

# Создание таблиц базы данных
Base.metadata.create_all(bind=engine)

# Настройка путей
base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "..", "static")
templates_dir = os.path.join(base_dir, "..", "templates")

# Создание директорий если их нет
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "js"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "css"), exist_ok=True)
os.makedirs(templates_dir, exist_ok=True)

# Инициализация приложения
app = FastAPI(
    title="Электролиз 360 API",
    description="API для расчета параметров процесса Холла-Эру производства алюминия с системой аутентификации",
    version="1.0.0"
)

# Монтирование статики
app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Подключение роутеров
app.include_router(auth_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")
app.include_router(experiments_router, prefix="/api")
app.include_router(alloy_router, prefix="/api")

# Сервисные эндпоинты
@app.get("/")
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/parameters")
async def get_parameters_info():
    return {
        "current": {"min": 200, "max": 400, "unit": "кА", "description": "Сила тока, определяет скорость производства алюминия"},
        "voltage": {"min": 3.0, "max": 4.5, "unit": "В", "description": "Напряжение, влияет на удельный расход энергии. Значения ниже 4.0В нестабильны."},  # ИСПРАВЛЕНО
        "temperature": {"min": 950, "max": 970, "unit": "°C", "description": "Температура, критически влияет на выход по току"},
        "concentration": {"min": 2.0, "max": 6.0, "unit": "%", "description": "Концентрация глинозёма, недостаток вызывает анодный эффект"}
    }

@app.get("/api/formulas")
async def get_formulas():
    from app.config import G_AL, ETA0
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

@app.get("/health")
async def health_check():
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Электролиз 360 API"
    }