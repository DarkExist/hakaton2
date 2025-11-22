from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from shared.database import Base

class ExperimentHistory(Base):
    __tablename__ = "experiment_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    experiment_name = Column(String(100), nullable=False)
    experiments_data = Column(Text, nullable=False)  # JSON с данными всех экспериментов
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)