from pydantic import BaseModel, Field, validator
from typing import Dict, Optional, List

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
    recommended_applications: List[str] = Field(..., description="Рекомендуемые области применения")
    alloy_series: str = Field(..., description="Серия сплава по международной классификации")

class AlloyResponse(BaseModel):
    composition: Dict[str, float]
    properties: AlloyProperties
    message: Optional[str] = None