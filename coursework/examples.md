# KubSU DOCX Examples

## Example 1: Full Coursework with Auto-TOC and Exact Title Page

```python
from docx import Document
from docx.shared import Cm, Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def set_run_font(run, name='Times New Roman', size=14, bold=False, italic=False, color=RGBColor(0, 0, 0)):
    # Auto-replace em dash with en dash in all generated text
    if run.text:
        run.text = run.text.replace("—", "–")
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.element.rPr.rFonts.set(qn('w:eastAsia'), name)

def add_page_number(section):
    # Title page has no visible number; numbering starts from 1 on РЕФЕРАТ
    section.different_first_page_header_footer = True
    
    # Start counting from 0 so title page = 0 (hidden), РЕФЕРАТ = 1
    sectPr = section._sectPr
    pgNumType = OxmlElement('w:pgNumType')
    pgNumType.set(qn('w:start'), '0')
    sectPr.append(pgNumType)
    
    first_footer = section.first_page_footer
    fp = first_footer.paragraphs[0] if first_footer.paragraphs else first_footer.add_paragraph()
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer = section.footer
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.text = "PAGE"
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'end')
    run._element.append(fldChar1)
    run._element.append(instrText)
    run._element.append(fldChar2)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0, 0, 0)

def add_toc(doc):
    p = doc.add_paragraph()
    run = p.add_run("СОДЕРЖАНИЕ")
    set_run_font(run, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    doc.add_paragraph()

    p = doc.add_paragraph()
    run = p.add_run()
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'TOC \\o "2-3" \\h \\z \\u'
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    run._element.append(fldChar1)
    run._element.append(instrText)
    run._element.append(fldChar2)

    run2 = p.add_run("[Обновите поле правой кнопкой мыши]")
    run2.font.name = 'Times New Roman'
    run2.font.size = Pt(14)
    run2.font.italic = True

    run3 = p.add_run()
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    run3._element.append(fldChar3)
    p.paragraph_format.first_line_indent = Cm(0)

def add_section_heading(doc, text):
    """For ВВЕДЕНИЕ, ЗАКЛЮЧЕНИЕ – centered, bold, uppercase."""
    doc.add_paragraph()
    h = doc.add_heading(level=2)
    run = h.add_run(text.upper())
    set_run_font(run, size=14, bold=True)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h.paragraph_format.first_line_indent = Cm(0)
    doc.add_paragraph()

def add_numbered_section(doc, text):
    """For 1, 2... sections – bold, justified, 1.25cm indent."""
    doc.add_paragraph()
    h = doc.add_heading(level=2)
    run = h.add_run(text)
    set_run_font(run, size=14, bold=True)
    h.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    h.paragraph_format.first_line_indent = Cm(1.25)
    doc.add_paragraph()

def add_subsection(doc, text):
    """For 1.1, 1.2... subsections – bold, justified, 1.25cm indent. MAX 2 LEVELS."""
    doc.add_paragraph()
    h = doc.add_heading(level=3)
    run = h.add_run(text)
    set_run_font(run, size=14, bold=True)
    h.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    h.paragraph_format.first_line_indent = Cm(1.25)
    doc.add_paragraph()

def add_body_paragraph(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run_font(run, size=14)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.first_line_indent = Cm(1.25)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    return p

def create_coursework(output_path="coursework.docx"):
    doc = Document()
    section = doc.sections[0]

    # Page setup
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.left_margin = Mm(30)
    section.right_margin = Mm(15)
    section.top_margin = Mm(20)
    section.bottom_margin = Mm(20)
    section.header_distance = Mm(12.5)
    section.footer_distance = Mm(12.5)

    # Default style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(14)
    style.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    pf = style.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.first_line_indent = Cm(1.25)
    pf.space_after = Pt(0)
    pf.space_before = Pt(0)

    # Heading styles for auto-TOC
    h2 = doc.styles['Heading 2']
    h2.font.name = 'Times New Roman'
    h2.font.size = Pt(14)
    h2.font.bold = True
    h2.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    h2.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    h2.paragraph_format.space_before = Pt(0)
    h2.paragraph_format.space_after = Pt(0)

    h3 = doc.styles['Heading 3']
    h3.font.name = 'Times New Roman'
    h3.font.size = Pt(14)
    h3.font.bold = True
    h3.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    h3.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    h3.paragraph_format.space_before = Pt(0)
    h3.paragraph_format.space_after = Pt(0)

    add_page_number(section)

    # ======================= TITLE PAGE =======================
    ministry_lines = [
        "МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ",
        "Федеральное государственное бюджетное образовательное учреждение",
        "высшего образования",
    ]
    for text in ministry_lines:
        p = doc.add_paragraph()
        run = p.add_run(text)
        set_run_font(run, size=14)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Cm(0)

    for text in ["«КУБАНСКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ»", "(ФГБОУ ВО «КубГУ»)"]:
        p = doc.add_paragraph()
        run = p.add_run(text)
        set_run_font(run, size=14, bold=True)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Cm(0)

    doc.add_paragraph()

    for text in ["Факультет компьютерных технологий и прикладной математики",
                 "Кафедра информационных технологий"]:
        p = doc.add_paragraph()
        run = p.add_run(text)
        set_run_font(run, size=14, bold=True)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Cm(0)

    for _ in range(7):
        doc.add_paragraph()

    p = doc.add_paragraph()
    run = p.add_run("КУРСОВАЯ РАБОТА")
    set_run_font(run, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)

    doc.add_paragraph()

    p = doc.add_paragraph()
    run = p.add_run("НАЗВАНИЕ РАБОТЫ")
    set_run_font(run, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)

    doc.add_paragraph()

    # Signature block (simplified)
    sig_lines = [
        "Работу выполнил ________________________________ И.О. Фамилия",
        "                                                                    (подпись)",
        "Направление подготовки __________________________________",
        "Направленность _________________________________________",
        "",
        "Научный руководитель",
        "канд. техн. наук, доц. __________________________ И.О. Фамилия",
        "                                                                    (подпись, дата)",
        "Нормоконтролер",
        "канд. пед. наук, доц. ___________________________ И.О. Фамилия",
        "                                                                    (подпись, дата)",
    ]
    for line in sig_lines:
        p = doc.add_paragraph()
        run = p.add_run(line)
        set_run_font(run, size=14)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY if line.strip() else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.first_line_indent = Cm(0)

    for _ in range(4):
        doc.add_paragraph()

    for text in ["Краснодар", "2025"]:
        p = doc.add_paragraph()
        run = p.add_run(text)
        set_run_font(run, size=14)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Cm(0)

    # ======================= ABSTRACT =======================
    doc.add_page_break()
    p = doc.add_paragraph()
    run = p.add_run("РЕФЕРАТ")
    set_run_font(run, size=14, bold=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)

    p = doc.add_paragraph()
    run = p.add_run("Курсовая работа 25 с., 3 рис., 12 источников.")
    set_run_font(run, size=14)
    p.paragraph_format.first_line_indent = Cm(0)

    p = doc.add_paragraph()
    run = p.add_run("PYTHON, BACK-END, ВЕБ-ПРИЛОЖЕНИЕ, БАЗА ДАННЫХ, API")
    set_run_font(run, size=14)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.first_line_indent = Cm(0)

    add_body_paragraph(doc, "Объектом исследования является...")

    # ======================= TOC =======================
    doc.add_page_break()
    add_toc(doc)

    # ======================= INTRODUCTION =======================
    doc.add_page_break()
    add_section_heading(doc, "Введение")
    add_body_paragraph(doc, "Актуальность данной работы обусловлена...")

    # ======================= SECTION 1 =======================
    add_numbered_section(doc, "1 Технологический стек")
    add_body_paragraph(doc, "В данном разделе рассматриваются технологии...")

    add_subsection(doc, "1.1 Ruby on Rails")
    add_body_paragraph(doc, "Ruby on Rails – это полноценный фреймворк...")

    add_subsection(doc, "1.2 PostgreSQL")
    add_body_paragraph(doc, "PostgreSQL – это мощная СУБД...")

    # ======================= CONCLUSION =======================
    doc.add_page_break()
    add_section_heading(doc, "Заключение")
    add_body_paragraph(doc, "В ходе выполнения работы были достигнуты...")

    doc.save(output_path)
    return output_path

if __name__ == "__main__":
    create_coursework()
```

## Example 2: Table and Figure Helpers

```python
def add_academic_table(doc, table_num, title, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'

    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        p = cell.paragraphs[0]
        run = p.add_run(header)
        set_run_font(run, size=12, bold=True)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    for row_idx, row_data in enumerate(rows, start=1):
        for col_idx, text in enumerate(row_data):
            cell = table.rows[row_idx].cells[col_idx]
            p = cell.paragraphs[0]
            run = p.add_run(str(text))
            set_run_font(run, size=12)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    # Caption AFTER table, centered, 14pt
    cap = doc.add_paragraph()
    run = cap.add_run(f"Таблица {table_num} – {title}")
    set_run_font(run, size=14)
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.first_line_indent = Cm(0)
    cap.paragraph_format.space_before = Pt(6)

    return table

def add_figure_caption(doc, figure_num, title):
    p = doc.add_paragraph()
    run = p.add_run(f"Рисунок {figure_num} – {title}")
    set_run_font(run, size=14)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.space_before = Pt(6)
    return p
```

## Example 3: List Helpers

```python
def add_bulleted_list(doc, intro, items):
    p = doc.add_paragraph()
    run = p.add_run(intro)
    set_run_font(run, size=14)
    p.paragraph_format.first_line_indent = Cm(1.25)

    for i, item in enumerate(items):
        p = doc.add_paragraph()
        marker = "–"
        text = f"{marker} {item};" if i < len(items) - 1 else f"{marker} {item}."
        run = p.add_run(text)
        set_run_font(run, size=14)
        p.paragraph_format.first_line_indent = Cm(1.25)

def add_numbered_list(doc, intro, items):
    p = doc.add_paragraph()
    run = p.add_run(intro)
    set_run_font(run, size=14)
    p.paragraph_format.first_line_indent = Cm(1.25)

    for i, item in enumerate(items, start=1):
        p = doc.add_paragraph()
        text = f"{i}) {item};" if i < len(items) else f"{i}) {item}."
        run = p.add_run(text)
        set_run_font(run, size=14)
        p.paragraph_format.first_line_indent = Cm(1.25)
```
