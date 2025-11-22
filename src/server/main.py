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