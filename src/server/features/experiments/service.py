import json
from sqlalchemy.orm import Session
from typing import List, Optional

from features.experiments.models import ExperimentHistory
from features.experiments.schemas import SaveExperimentHistoryRequest, ExperimentHistoryResponse

def save_experiment_history(
    db: Session,
    user_id: int,  # Теперь ожидаем именно int
    history_request: SaveExperimentHistoryRequest
):
    if not history_request.experiments:
        return None
    
    experiments_json = json.dumps([exp.dict() for exp in history_request.experiments])
    
    experiment_history = ExperimentHistory(
        user_id=user_id,  # SQLAlchemy автоматически обработает int
        experiment_name=history_request.experiment_name,
        experiments_data=experiments_json
    )
    
    db.add(experiment_history)
    db.commit()
    db.refresh(experiment_history)
    return experiment_history

def get_user_experiments(db: Session, user_id: int) -> List[ExperimentHistory]:
    return db.query(ExperimentHistory).filter(
        ExperimentHistory.user_id == user_id
    ).order_by(ExperimentHistory.created_at.desc()).all()

def get_experiment_by_id(db: Session, experiment_id: int, user_id: int) -> Optional[ExperimentHistory]:
    return db.query(ExperimentHistory).filter(
        ExperimentHistory.id == experiment_id,
        ExperimentHistory.user_id == user_id
    ).first()