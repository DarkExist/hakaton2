from datetime import timedelta

# Конфигурация для JWT
SECRET_KEY = "electrolysis_360_secret_key_for_hackathon"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Настройка базы данных
SQLALCHEMY_DATABASE_URL = "sqlite:///./electrolysis.db"

# Константы процесса электролиза
G_AL = 0.3356  # Электрохимический эквивалент алюминия (г/А·ч)
ETA0 = 90      # Базовый выход по току в процентах