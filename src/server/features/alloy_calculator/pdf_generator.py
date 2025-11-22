from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
    PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
import json
from datetime import datetime
from typing import Dict, Any
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
FONTS_DIR = BASE_DIR / "static" / "fonts"

# Регистрация шрифтов
try:
    pdfmetrics.registerFont(TTFont('DejaVu', str(FONTS_DIR / 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', str(FONTS_DIR / 'DejaVuSans-Bold.ttf')))
    DEFAULT_FONT = 'DejaVu'
    BOLD_FONT = 'DejaVu-Bold'
except Exception as e:
    print(f"Не удалось загрузить кастомные шрифты: {str(e)}")
    DEFAULT_FONT = 'Helvetica'
    BOLD_FONT = 'Helvetica-Bold'

def generate_alloy_pdf(alloy_name: str, composition: Dict[str, float], properties: Dict[str, Any]) -> bytes:
    """Генерирует PDF-документ с результатами расчета свойств сплава"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Стили
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='Title',
        fontName=BOLD_FONT,
        fontSize=18,
        alignment=1,
        spaceAfter=30,
        textColor=colors.HexColor("#2d3748")
    ))
    styles.add(ParagraphStyle(
        name='Heading1',
        fontName=BOLD_FONT,
        fontSize=14,
        spaceAfter=12,
        textColor=colors.HexColor("#2d3748")
    ))
    styles.add(ParagraphStyle(
        name='Heading2',
        fontName=BOLD_FONT,
        fontSize=12,
        spaceAfter=8,
        spaceBefore=12,
        textColor=colors.HexColor("#2d3748")
    ))
    styles.add(ParagraphStyle(
        name='CustomNormal',
        fontName=DEFAULT_FONT,
        fontSize=10,
        spaceAfter=6,
        leading=14
    ))
    styles.add(ParagraphStyle(
        name='CustomBold',
        fontName=BOLD_FONT,
        fontSize=10,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='CustomSmall',
        fontName=DEFAULT_FONT,
        fontSize=8,
        spaceAfter=4,
        leading=10
    ))
    
    story = []
    
    # Заголовок
    title = Paragraph(f"Расчет свойств алюминиевого сплава", styles['Title'])
    story.append(title)
    
    # Название сплава
    alloy_title = Paragraph(f"<font name='{BOLD_FONT}' size='16'>{alloy_name}</font>", styles['Heading1'])
    story.append(alloy_title)
    story.append(Spacer(1, 10))
    
    # Дата создания
    date_str = datetime.now().strftime("%d.%m.%Y %H:%M")
    date_para = Paragraph(f"Дата расчета: {date_str}", styles['CustomSmall'])
    story.append(date_para)
    story.append(Spacer(1, 20))
    
    # Состав сплава
    story.append(Paragraph("Химический состав сплава", styles['Heading1']))
    
    composition_data = [
        ["Элемент", "Содержание, %"],
        ["Алюминий (Al)", f"{composition.get('al', 0):.2f}"],
        ["Магний (Mg)", f"{composition.get('mg', 0):.2f}"],
        ["Кремний (Si)", f"{composition.get('si', 0):.2f}"],
        ["Медь (Cu)", f"{composition.get('cu', 0):.2f}"],
        ["Цинк (Zn)", f"{composition.get('zn', 0):.2f}"],
        ["Марганец (Mn)", f"{composition.get('mn', 0):.2f}"],
        ["Титан (Ti)", f"{composition.get('ti', 0):.2f}"],
        ["Железо (Fe)", f"{composition.get('fe', 0):.2f}"],
        ["Прочие примеси", f"{composition.get('other', 0):.2f}"],
        ["<b>Сумма</b>", f"<b>{sum(composition.values()):.2f}</b>"]
    ]
    
    composition_table = Table(composition_data, colWidths=[2.5*inch, 1.5*inch])
    composition_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#4a5568")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2c5282")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), BOLD_FONT, 11),
        ('FONT', (0, 1), (-1, -1), DEFAULT_FONT, 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor("#ebf4ff")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#bee3f8")),
        ('FONT', (0, -1), (-1, -1), BOLD_FONT, 11),
        ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
    ]))
    
    story.append(composition_table)
    story.append(Spacer(1, 25))
    
    # Механические свойства
    story.append(Paragraph("Механические и физические свойства", styles['Heading1']))
    
    properties_data = [
        ["Свойство", "Значение", "Единица изм."],
        ["Предел прочности при растяжении", f"{properties.get('tensile_strength', 0):.1f}", "МПа"],
        ["Предел текучести", f"{properties.get('yield_strength', 0):.1f}", "МПа"],
        ["Относительное удлинение", f"{properties.get('elongation', 0):.1f}", "%"],
        ["Твердость по Бринеллю", f"{properties.get('hardness', 0):.1f}", "HB"],
        ["Плотность", f"{properties.get('density', 0):.2f}", "г/см³"],
        ["Теплопроводность", f"{properties.get('thermal_conductivity', 0):.1f}", "Вт/(м·K)"],
        ["Коррозионная стойкость", properties.get('corrosion_resistance', 'Не определено'), ""],
        ["Свариваемость", properties.get('weldability', 'Не определено'), ""],
        ["Серия сплава", properties.get('alloy_series', 'Не определено'), ""]
    ]
    
    properties_table = Table(properties_data, colWidths=[3*inch, 1.2*inch, 1.2*inch])
    properties_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#4a5568")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2c5282")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), BOLD_FONT, 11),
        ('FONT', (0, 1), (-1, -1), DEFAULT_FONT, 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f0f9ff")),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('FONT', (0, 6), (0, 9), BOLD_FONT, 10),
        ('BACKGROUND', (0, 6), (0, 9), colors.HexColor("#dbeafe")),
    ]))
    
    story.append(properties_table)
    story.append(Spacer(1, 25))
    
    # Рекомендуемые применения
    story.append(Paragraph("Рекомендуемые области применения", styles['Heading1']))
    
    applications = properties.get('recommended_applications', [])
    if applications:
        for app in applications:
            story.append(Paragraph(f"• {app}", styles['CustomNormal']))
    else:
        story.append(Paragraph("Не определены", styles['CustomNormal']))
    
    story.append(Spacer(1, 20))
    
    # Дополнительная информация
    story.append(Paragraph("Дополнительная информация", styles['Heading1']))
    
    info_text = """
    <para spaceAfter="12">Данный расчет основан на эмпирических формулах и математических моделях. 
    Результаты носят прогнозный характер и могут отличаться от реальных значений.</para>
    
    <para spaceAfter="12"><b>Важные замечания:</b></para>
    <para spaceAfter="6">• Для промышленного применения необходимы лабораторные испытания конкретного сплава.</para>
    <para spaceAfter="6">• Термическая обработка значительно влияет на окончательные свойства сплава.</para>
    <para spaceAfter="6">• Фактические свойства зависят от технологии производства и условий эксплуатации.</para>
    <para spaceAfter="6">• Результаты расчета не являются основанием для принятия инженерных решений без дополнительной экспертизы.</para>
    """
    
    story.append(Paragraph(info_text, styles['CustomNormal']))
    
    # Генерация PDF
    doc.build(story)
    pdf = buffer.getvalue()
    buffer.close()
    
    return pdf