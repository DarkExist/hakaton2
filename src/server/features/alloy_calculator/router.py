from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
from features.alloy_calculator.schemas import (
    AlloyComposition, 
    AlloyResponse
)
from fastapi import Depends
from features.alloy_calculator.calculator import calculate_alloy_properties
from app.dependencies import get_current_active_user 
from features.auth.models import User
router = APIRouter()

@router.post("/alloy-calculator", response_model=AlloyResponse)
async def alloy_calculator(composition: AlloyComposition):
    try:
        total = sum([
            composition.al, composition.mg, composition.si, 
            composition.cu, composition.zn, composition.mn,
            composition.ti, composition.fe, composition.other
        ])
        
        message = None
        if abs(total - 100) > 0.1:
            message = f"Предупреждение: сумма компонентов составляет {total:.2f}%. Сплав был нормализован на 100%."
        
        # Нормализация состава
        normalized_composition = {k: v * 100 / total for k, v in composition.dict().items()}
        normalized_model = AlloyComposition(**normalized_composition)
        
        # Расчет свойств
        properties = calculate_alloy_properties(normalized_model)
        
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

@router.post("/alloy-calculator/export-pdf")
async def export_alloy_to_pdf(
    export_data: dict,
    current_user: User = Depends(get_current_active_user)
):
    """
    Экспортирует результаты расчета сплава в PDF
    
    Args:
        export_data: Данные для экспорта в формате:
            {
                "alloy_name": "Название сплава",
                "composition": {"al": 90.0, "mg": 1.0, ...},
                "properties": {"tensile_strength": 250.0, ...}
            }
    
    Returns:
        StreamingResponse: PDF-файл для скачивания
    """
    try:
        from features.alloy_calculator.pdf_generator import generate_alloy_pdf
        
        alloy_name = export_data.get("alloy_name", "Безымянный сплав")
        composition = export_data.get("composition", {})
        properties = export_data.get("properties", {})
        
        # Генерация PDF
        pdf_bytes = generate_alloy_pdf(alloy_name, composition, properties)
        
        # Формирование имени файла
        safe_name = "".join(c for c in alloy_name if c.isalnum() or c in (" ", "_", "-")).rstrip()
        filename = f"alloy_{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Возврат PDF как потокового ответа
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при генерации PDF: {str(e)}"
        )

@router.get("/alloy-info")
async def get_alloy_info():
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