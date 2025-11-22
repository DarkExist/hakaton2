from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from features.simulation.schemas import ExperimentLog

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