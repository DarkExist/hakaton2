from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json
from datetime import datetime

from features.experiments.schemas import (
    SaveExperimentHistoryRequest,
    UserExperimentsResponse,
    ExperimentHistoryResponse
)
from features.experiments.service import (
    save_experiment_history,
    get_user_experiments,
    get_experiment_by_id
)
from app.dependencies import get_current_active_user  # Исправлен импорт
from shared.database import get_db
from features.auth.models import User

router = APIRouter()

@router.post("/experiments/save")
async def save_experiment_history_endpoint(
    history_request: SaveExperimentHistoryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Явное преобразование current_user.id в int
        user_id = int(current_user.id)
        
        experiment_history = save_experiment_history(
            db, 
            user_id, 
            history_request
        )
        
        if not experiment_history:
            raise HTTPException(
                status_code=400,
                detail="Нет данных для сохранения"
            )
        
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

@router.get("/experiments", response_model=UserExperimentsResponse)
async def get_user_experiments_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Явное преобразование current_user.id в int
    user_id = int(current_user.id)
    
    experiment_histories = get_user_experiments(db, user_id)
    
    return {
        "username": current_user.username,
        "experiment_histories": [
            ExperimentHistoryResponse(
                id=exp.id,
                experiment_name=exp.experiment_name,
                created_at=exp.created_at,
                updated_at=exp.updated_at
            )
            for exp in experiment_histories
        ]
    }

@router.get("/experiments/{experiment_id}")
async def get_experiment_details(
    experiment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Явное преобразование current_user.id в int
    user_id = int(current_user.id)
    
    experiment = get_experiment_by_id(db, experiment_id, user_id)
    
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