from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, EmailStr
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os
import json

# Конфигурация для JWT
SECRET_KEY = "electrolysis_360_secret_key_for_hackathon"  # В продакшене использовать безопасный ключ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Настройка SQLAlchemy
SQLALCHEMY_DATABASE_URL = "sqlite:///./electrolysis.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Настройка FastAPI
app = FastAPI(
    title="Электролиз 360 API",
    description="API для расчета параметров процесса Холла-Эру производства алюминия с системой аутентификации",
    version="1.0.0"
)

# Константы из симулятора
G_AL = 0.3356  # Электрохимический эквивалент алюминия (г/А·ч)
ETA0 = 90      # Базовый выход по току в процентах

# Настройка путей
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

# Создание директорий если их нет
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "js"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "css"), exist_ok=True)
os.makedirs(templates_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Система аутентификации
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Модели базы данных
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)

class ExperimentHistory(Base):
    __tablename__ = "experiment_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    experiment_name = Column(String(100), nullable=False)
    experiments_data = Column(Text, nullable=False)  # JSON с данными всех экспериментов
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

# Создание таблиц
Base.metadata.create_all(bind=engine)

# Pydantic модели
class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

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

class ExperimentLog(BaseModel):
    timestamp: str
    parameters: ProcessParameters
    results: ProcessResults

class SaveExperimentHistoryRequest(BaseModel):
    experiment_name: str
    experiments: List[ExperimentLog]

class ExperimentHistoryResponse(BaseModel):
    id: int
    experiment_name: str
    created_at: datetime
    updated_at: datetime

class UserExperimentsResponse(BaseModel):
    username: str
    experiment_histories: List[ExperimentHistoryResponse]

# Вспомогательные функции для работы с БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import bcrypt
# Функции для работы с паролями и токенами
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

# Функции расчета (без изменений из предыдущей версии)
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

# Эндпоинты аутентификации
@app.post("/register", response_model=Token)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким именем уже существует"
        )
    
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Эндпоинты для работы с симуляцией
@app.post("/api/simulate", response_model=ProcessResults)
async def simulate_process(params: ProcessParameters):
    if not (200 <= params.current <= 400):
        raise HTTPException(status_code=400, detail="Сила тока должна быть в диапазоне 200-400 кА")
    
    if not (4.0 <= params.voltage <= 4.5):
        raise HTTPException(status_code=400, detail="Напряжение должно быть в диапазоне 4.0-4.5 В")
    
    if not (950 <= params.temperature <= 970):
        raise HTTPException(status_code=400, detail="Температура должна быть в диапазоне 950-970 °C")
    
    if not (2.0 <= params.concentration <= 6.0):
        raise HTTPException(status_code=400, detail="Концентрация глинозёма должна быть в диапазоне 2.0-6.0 %")
    
    warning_message = ""
    if params.voltage < 4.0:
        warning_message = "Опасность короткого замыкания!"
    
    eta_result = calculate_eta(params.temperature, params.concentration)
    eta = eta_result["eta"]
    
    if eta_result["warning_message"] and not warning_message:
        warning_message = eta_result["warning_message"]
    
    energy = calculate_energy_consumption(params.voltage, eta)
    anode = calculate_anode_consumption(eta)
    
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

# Эндпоинты для работы с журналом экспериментов
@app.post("/api/experiments/save")
async def save_experiment_history(
    history_request: SaveExperimentHistoryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not history_request.experiments:
        raise HTTPException(
            status_code=400,
            detail="Нет данных для сохранения"
        )
    
    try:
        # Преобразуем данные в JSON для хранения в базе
        experiments_json = json.dumps([exp.dict() for exp in history_request.experiments])
        
        # Создаем запись в базе
        experiment_history = ExperimentHistory(
            user_id=current_user.id,
            experiment_name=history_request.experiment_name,
            experiments_data=experiments_json
        )
        
        db.add(experiment_history)
        db.commit()
        db.refresh(experiment_history)
        
        return {
            "success": True,
            "message": "История экспериментов успешно сохранена",
            "experiment_id": experiment_history.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при сохранении истории экспериментов: {str(e)}"
        )

@app.get("/api/experiments", response_model=UserExperimentsResponse)
async def get_user_experiments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    experiment_histories = db.query(ExperimentHistory).filter(
        ExperimentHistory.user_id == current_user.id
    ).order_by(ExperimentHistory.created_at.desc()).all()
    
    return {
        "username": current_user.username,
        "experiment_histories": [
            {
                "id": exp.id,
                "experiment_name": exp.experiment_name,
                "created_at": exp.created_at,
                "updated_at": exp.updated_at
            }
            for exp in experiment_histories
        ]
    }

@app.get("/api/experiments/{experiment_id}")
async def get_experiment_details(
    experiment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    experiment = db.query(ExperimentHistory).filter(
        ExperimentHistory.id == experiment_id,
        ExperimentHistory.user_id == current_user.id
    ).first()
    
    if not experiment:
        raise HTTPException(
            status_code=404,
            detail="Эксперимент не найден или у вас нет прав на его просмотр"
        )
    
    try:
        experiments_data = json.loads(experiment.experiments_data)
        return {
            "id": experiment.id,
            "experiment_name": experiment.experiment_name,
            "created_at": experiment.created_at,
            "updated_at": experiment.updated_at,
            "experiments": experiments_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обработке данных эксперимента: {str(e)}"
        )

# Сервисные эндпоинты
@app.get("/")
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/parameters")
async def get_parameters_info():
    return {
        "current": {"min": 200, "max": 400, "unit": "кА", "description": "Сила тока, определяет скорость производства алюминия"},
        "voltage": {"min": 4.0, "max": 4.5, "unit": "В", "description": "Напряжение, влияет на удельный расход энергии"},
        "temperature": {"min": 950, "max": 970, "unit": "°C", "description": "Температура, критически влияет на выход по току"},
        "concentration": {"min": 2.0, "max": 6.0, "unit": "%", "description": "Концентрация глинозёма, недостаток вызывает анодный эффект"}
    }

@app.get("/api/formulas")
async def get_formulas():
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
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Электролиз 360 API"
    }

# Добавьте в существующие импорты
from pydantic import BaseModel, Field, validator
from typing import Dict, Optional

# Модели для калькулятора сплавов
class AlloyComposition(BaseModel):
    al: float = Field(90.0, ge=70.0, le=99.8, description="Содержание алюминия, %")
    mg: float = Field(0.0, ge=0.0, le=10.0, description="Содержание магния, %")
    si: float = Field(0.0, ge=0.0, le=15.0, description="Содержание кремния, %")
    cu: float = Field(0.0, ge=0.0, le=10.0, description="Содержание меди, %")
    zn: float = Field(0.0, ge=0.0, le=10.0, description="Содержание цинка, %")
    mn: float = Field(0.0, ge=0.0, le=2.0, description="Содержание марганца, %")
    ti: float = Field(0.0, ge=0.0, le=0.5, description="Содержание титана, %")
    fe: float = Field(0.0, ge=0.0, le=1.0, description="Содержание железа, %")
    other: float = Field(0.0, ge=0.0, le=1.0, description="Прочие примеси, %")

    @validator('*')
    def round_values(cls, v):
        return round(v, 2)

    @validator('other')
    def validate_total(cls, v, values):
        total = sum(values.get(elem, 0.0) for elem in ['al', 'mg', 'si', 'cu', 'zn', 'mn', 'ti', 'fe']) + v
        if abs(total - 100.0) > 0.5:
            raise ValueError(f"Сумма всех компонентов должна быть близка к 100% (фактически: {total:.2f}%)")
        return v

class AlloyProperties(BaseModel):
    tensile_strength: float = Field(..., description="Предел прочности при растяжении, МПа")
    yield_strength: float = Field(..., description="Предел текучести, МПа")
    elongation: float = Field(..., description="Относительное удлинение, %")
    hardness: float = Field(..., description="Твердость по Бринеллю, HB")
    density: float = Field(..., description="Плотность, г/см³")
    thermal_conductivity: float = Field(..., description="Теплопроводность, Вт/(м·K)")
    corrosion_resistance: str = Field(..., description="Коррозионная стойкость")
    weldability: str = Field(..., description="Свариваемость")
    recommended_applications: list = Field(..., description="Рекомендуемые области применения")
    alloy_series: str = Field(..., description="Серия сплава по международной классификации")

class AlloyResponse(BaseModel):
    composition: Dict[str, float]
    properties: AlloyProperties
    message: Optional[str] = None

# Функция расчета свойств сплава
def calculate_alloy_properties(composition: AlloyComposition) -> AlloyProperties:
    """Рассчитывает свойства алюминиевого сплава на основе его химического состава."""
    
    # Базовые значения для чистого алюминия
    base_tensile_strength = 45  # МПа
    base_yield_strength = 20   # МПа
    base_elongation = 40       # %
    base_hardness = 20         # HB
    base_density = 2.70        # г/см³
    base_thermal_conductivity = 235  # Вт/(м·K)
    
    # Коэффициенты влияния легирующих элементов на прочность (упрощенная модель)
    # Значения основаны на эмпирических данных для алюминиевых сплавов
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
        # Учитываем эффект насыщения - после определенного содержания упрочнение замедляется
        effective_content = min(content, 5.0)  # Эффект насыщения после 5%
        tensile_strength += coeff * effective_content
    
    # Ограничения прочности для реалистичных значений
    tensile_strength = min(max(tensile_strength, 45), 750)
    
    # Расчет предела текучести (обычно ~0.7-0.8 от прочности)
    yield_strength = tensile_strength * 0.75
    
    # Расчет пластичности (обратно пропорциональна прочности)
    elongation = max(2.0, 45 - (tensile_strength - 45) * 0.08)
    
    # Расчет твердости
    hardness = 18 + tensile_strength * 0.12
    
    # Расчет плотности (линейное приближение)
    density = (
        base_density * (composition.al / 100) +
        1.74 * (composition.mg / 100) +   # Плотность Mg
        2.33 * (composition.si / 100) +   # Плотность Si
        8.96 * (composition.cu / 100) +   # Плотность Cu
        7.13 * (composition.zn / 100) +   # Плотность Zn
        7.21 * (composition.mn / 100) +   # Плотность Mn  
        4.51 * (composition.ti / 100)     # Плотность Ti
    )
    
    # Расчет теплопроводности (упрощенная модель)
    thermal_conductivity = base_thermal_conductivity
    thermal_conductivity -= composition.si * 5
    thermal_conductivity -= composition.cu * 8
    thermal_conductivity -= composition.zn * 3
    thermal_conductivity = max(thermal_conductivity, 50)
    
    # Оценка коррозионной стойкости
    corrosion_points = 100  # Базовое значение для чистого Al
    
    # Ухудшающие факторы для коррозионной стойкости
    corrosion_points -= composition.cu * 15
    corrosion_points -= composition.zn * 8
    corrosion_points -= composition.si * 3
    
    # Улучшающие факторы
    corrosion_points += composition.mg * 2
    corrosion_points += composition.mn * 5
    
    # Определение категории коррозионной стойкости
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
    
    # Факторы, ухудшающие свариваемость
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
    
    # Определение серии сплава по международной классификации
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

# Эндпоинт для калькулятора сплавов
@app.post("/api/alloy-calculator", response_model=AlloyResponse)
async def alloy_calculator(composition: AlloyComposition):
    """
    Эндпоинт для расчета свойств алюминиевого сплава на основе его химического состава.
    
    Принимает процентное содержание элементов и возвращает прогнозируемые механические 
    и физические свойства сплава, а также рекомендации по применению.
    """
    try:
        # Проверка, что сумма компонентов близка к 100%
        total = sum([
            composition.al, composition.mg, composition.si, 
            composition.cu, composition.zn, composition.mn,
            composition.ti, composition.fe, composition.other
        ])
        
        message = None
        if abs(total - 100) > 0.1:
            message = f"Предупреждение: сумма компонентов составляет {total:.2f}%. Сплав был нормализован на 100%."
        
        # Нормализация состава до точной суммы 100%
        normalized_composition = {k: v * 100 / total for k, v in composition.dict().items()}
        
        # Расчет свойств
        properties = calculate_alloy_properties(AlloyComposition(**normalized_composition))
        
        return AlloyResponse(
            composition={k: round(v, 2) for k, v in normalized_composition.items()},
            properties=properties,
            message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при расчете свойств сплава: {str(e)}"
        )

# Дополнительный эндпоинт с информацией о влиянии легирующих элементов
@app.get("/api/alloy-info")
async def get_alloy_info():
    """
    Эндпоинт для получения информации о влиянии легирующих элементов на свойства алюминиевых сплавов.
    """
    return {
        "elements": {
            "Al": {
                "name": "Алюминий",
                "role": "Основа сплава",
                "effects": ["Низкая плотность", "Высокая коррозионная стойкость", "Хорошая электропроводность"]
            },
            "Mg": {
                "name": "Магний",
                "role": "Упрочняющий элемент",
                "effects": ["Повышает прочность", "Улучшает коррозионную стойкость", "Сохраняет свариваемость"],
                "max_content": "до 10%"
            },
            "Si": {
                "name": "Кремний",
                "role": "Легирующий элемент для улучшения литейных свойств",
                "effects": ["Снижает температуру плавления", "Улучшает текучесть", "Повышает износостойкость"],
                "max_content": "до 15%"
            },
            "Cu": {
                "name": "Медь",
                "role": "Основной упрочняющий элемент",
                "effects": ["Значительно повышает прочность", "Улучшает обрабатываемость", "Снижает коррозионную стойкость"],
                "max_content": "до 10%"
            },
            "Zn": {
                "name": "Цинк",
                "role": "Упрочняющий элемент", 
                "effects": ["Обеспечивает высокую прочность", "Часто используется с Mg", "Снижает коррозионную стойкость без Mg"],
                "max_content": "до 10%"
            },
            "Mn": {
                "name": "Марганец",
                "role": "Упрочняющий элемент и модификатор структуры",
                "effects": ["Повышает прочность", "Улучшает коррозионную стойкость", "Измельчает зерно"],
                "max_content": "до 2%"
            },
            "Ti": {
                "name": "Титан",
                "role": "Модификатор структуры",
                "effects": ["Измельчает зерно", "Улучшает механические свойства", "Повышает жаропрочность"],
                "max_content": "до 0.5%"
            },
            "Fe": {
                "name": "Железо",
                "role": "Примесь",
                "effects": ["Образует интерметаллиды", "Снижает пластичность", "Ухудшает коррозионную стойкость"],
                "max_content": "до 1%"
            }
        },
        "alloy_series": {
            "1xxx": "Технически чистый алюминий (>99% Al)",
            "2xxx": "Сплавы системы Al-Cu (дюралюмины)",
            "3xxx": "Сплавы системы Al-Mn",
            "4xxx": "Сплавы системы Al-Si (литейные и сварочные)",
            "5xxx": "Сплавы системы Al-Mg",
            "6xxx": "Сплавы системы Al-Mg-Si (термоупрочняемые)",
            "7xxx": "Сплавы системы Al-Zn-Mg-Cu (высокопрочные)"
        },
        "notes": [
            "Данные прогнозы основаны на эмпирических соотношениях и могут отличаться от реальных значений",
            "Для промышленного применения необходимы лабораторные испытания",
            "Термическая обработка значительно влияет на окончательные свойства сплава"
        ]
    }