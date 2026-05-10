---
name: write-docx-report
description: Create KubSU coursework project (курсовой проект) as a .docx file using python-docx. The format includes a title page, project passport (паспорт проекта) with large tables, implementation report, conclusion, and sources. Use when generating KubSU курсовой проект for student Назаренко Георгий.
---

# KubSU Курсовой Проект — python-docx

## Prerequisites

```bash
pip install python-docx
```

## Student Info

| Field | Value |
|-------|-------|
| Student | Назаренко Георгий |
| Direction | 02.03.02 Фундаментальная информатика и информационные технологии |
| Supervisor | канд. техн. наук, доц. Приходько Татьяна Александровна |
| Normcontroller | канд. техн. наук, доц. Приходько Татьяна Александровна |
| Year | 2026 |
| Period | Февраль 2026 – Май 2026 |
| Title | РАЗРАБОТКА МОБИЛЬНОГО ОРГАНАЙЗЕРА СТУДЕНТА С СИСТЕМОЙ УПРАВЛЕНИЯ ЗНАНИЯМИ НА ОСНОВЕ MARKDOWN И МОДУЛЕМ АНАЛИЗА УЧЕБНОЙ НАГРУЗКИ |
| GitHub | https://github.com/hostrrr/StudyOrganizer |

## Document Structure

1. Титульный лист
2. Паспорт проекта (большие таблицы — пункты 1–16)
3. Заключение (отчет о реализации проекта)
4. Список использованных источников (не менее 10)

**NO реферат, NO содержание, NO numbered sections like "1 Анализ..."**

The implementation report goes INSIDE section 13 (Приложения) of the passport as "Отчет о реализации проекта", and also in the Заключение.

## Page Setup

```python
section = doc.sections[0]
section.page_width = Mm(210)
section.page_height = Mm(297)
section.left_margin = Mm(30)   # 3 cm left
section.right_margin = Mm(15)  # 1.5 cm right
section.top_margin = Mm(20)
section.bottom_margin = Mm(20)
```

## Default Style

```python
style = doc.styles['Normal']
style.font.name = 'Times New Roman'
style.font.size = Pt(14)
style.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
style.paragraph_format.first_line_indent = Cm(1.25)
style.paragraph_format.space_after = Pt(0)
style.paragraph_format.space_before = Pt(0)
```

## Font Helper

```python
def set_run_font(run, name='Times New Roman', size=14, bold=False, italic=False):
    if run.text:
        run.text = run.text.replace("—", "–")
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)
    run.element.rPr.rFonts.set(qn('w:eastAsia'), name)
```

## Page Numbers

```python
def add_page_number(section):
    section.different_first_page_header_footer = True
    # Title page = page 1 but hidden
    sectPr = section._sectPr
    pgNumType = OxmlElement('w:pgNumType')
    pgNumType.set(qn('w:start'), '1')
    sectPr.append(pgNumType)
    # First page footer empty
    first_footer = section.first_page_footer
    fp = first_footer.paragraphs[0] if first_footer.paragraphs else first_footer.add_paragraph()
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Default footer with page number
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
```

## Title Page Layout

```
МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ   (center, 14pt, no bold)
Федеральное государственное бюджетное образовательное учреждение   (center, 14pt, no bold)
высшего образования                                                (center, 14pt, no bold)
«КУБАНСКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ»                            (center, 14pt, bold)
(ФГБОУ ВО «КубГУ»)                                                (center, 14pt, bold)
[empty line]
Факультет компьютерных технологий и прикладной математики          (center, 14pt, bold)
Кафедра информационных технологий                                  (center, 14pt, bold)
[7 empty lines]
КУРСОВОЙ ПРОЕКТ                                                    (center, 14pt, bold)
[empty line]
РАЗРАБОТКА МОБИЛЬНОГО ОРГАНАЙЗЕРА СТУДЕНТА С СИСТЕМОЙ              (center, 14pt, bold)
УПРАВЛЕНИЯ ЗНАНИЯМИ НА ОСНОВЕ MARKDOWN И МОДУЛЕМ                   (center, 14pt, bold)
АНАЛИЗА УЧЕБНОЙ НАГРУЗКИ                                           (center, 14pt, bold)
[empty line]
Работу выполнил ________________________________ Г. Назаренко     (justify, 14pt, no indent)
                              (подпись)                            (justify, 14pt, no indent)
Направление подготовки 02.03.02 – Фундаментальная информатика      (justify, 14pt, no indent)
и информационные технологии
[empty line]
Научный руководитель                                               (justify, 14pt, no indent)
канд. техн. наук, доц. __________________________ Т.А. Приходько   (justify, 14pt, no indent)
                              (подпись)                            (justify, 14pt, no indent)
Нормоконтролер                                                     (justify, 14pt, no indent)
канд. техн. наук, доц. __________________________ Т.А. Приходько   (justify, 14pt, no indent)
                              (подпись)                            (justify, 14pt, no indent)
[4 empty lines]
Краснодар                                                          (center, 14pt)
2026                                                               (center, 14pt)
```

## Passport Tables (Паспорт проекта)

After page break, add heading "Паспорт проекта" (bold, center, 14pt, no indent).

Then create tables for each section. Use `Table Grid` style, 14pt text in cells, line spacing 1.0 in cells.

### Table helper

```python
def add_passport_table(doc, left_label, right_content, left_width=3000, right_width=6500):
    """Two-column passport table row."""
    table = doc.add_table(rows=1, cols=2)
    table.style = 'Table Grid'
    table.columns[0].width = Cm(left_width/1000)  # approximate
    
    left_cell = table.rows[0].cells[0]
    right_cell = table.rows[0].cells[1]
    
    p_left = left_cell.paragraphs[0]
    run = p_left.add_run(left_label)
    set_run_font(run, bold=True, size=12)
    p_left.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p_left.paragraph_format.first_line_indent = Cm(0)
    
    p_right = right_cell.paragraphs[0]
    run = p_right.add_run(right_content)
    set_run_font(run, size=12)
    p_right.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p_right.paragraph_format.first_line_indent = Cm(0)
    
    doc.add_paragraph()  # spacing after table
    return table
```

### Passport sections to fill

**Название проекта:** РАЗРАБОТКА МОБИЛЬНОГО ОРГАНАЙЗЕРА СТУДЕНТА С СИСТЕМОЙ УПРАВЛЕНИЯ ЗНАНИЯМИ НА ОСНОВЕ MARKDOWN И МОДУЛЕМ АНАЛИЗА УЧЕБНОЙ НАГРУЗКИ

**Команда проекта:**
| № | Ф.И.О. | Роль | Функциональные обязанности |
|---|--------|------|---------------------------|
| 1. | Назаренко Георгий | Fullstack разработчик | Проектирование архитектуры, разработка мобильного приложения на React Native, реализация алгоритма SM-2, тестирование |

**1. География проекта:** Краснодарский край, г. Краснодар

**2. Сроки реализации:** Февраль 2026 – Май 2026

**3. Краткая аннотация:** Курсовой проект посвящён проектированию и разработке кроссплатформенного мобильного приложения-органайзера для студентов. Приложение реализует систему управления знаниями на основе формата Markdown с поддержкой иерархических заметок, алгоритм интервального повторения SM-2 для подготовки к экзаменам с автоматической генерацией карточек из текста заметок, а также модуль аналитики учебной нагрузки с визуализацией прогресса. Выполнен сравнительный анализ существующих мобильных органайзеров. Разработана архитектура приложения на React Native + Expo с локальным хранилищем SQLite. Реализован полнофункциональный Markdown-редактор с поддержкой предпросмотра, экспорт заметок в формат Obsidian, система карточек с алгоритмом SM-2 и аналитический модуль с прогнозированием готовности к экзаменам.

**4. Актуальность:** Рост объёма учебной информации в условиях цифрового образования требует эффективных инструментов управления знаниями. Существующие решения либо не адаптированы для мобильных устройств, либо не поддерживают структурированное хранение заметок в открытых форматах, либо не включают научно обоснованные методы запоминания. Разработка комплексного органайзера, объединяющего Markdown-редактор, алгоритм интервального повторения и аналитику нагрузки в одном мобильном приложении, является актуальной задачей.

**5. Целевые группы:**
- Студенты очной и заочной формы обучения: потребность в структурированном хранении учебных материалов, подготовке к экзаменам и контроле нагрузки
- Преподаватели: возможность рекомендовать инструмент для самостоятельной работы студентов

**6. Цель проекта:** Проектирование и разработка кроссплатформенного мобильного приложения-органайзера для студентов с системой управления знаниями на основе Markdown и модулем анализа учебной нагрузки.

**7. Задачи проекта:**
1. Выполнить сравнительный анализ существующих мобильных органайзеров для студентов
2. Спроектировать архитектуру приложения и схему базы данных
3. Разработать функциональные и нефункциональные требования к системе
4. Реализовать Markdown-редактор заметок с иерархической структурой папок
5. Реализовать алгоритм интервального повторения SM-2 для карточек
6. Реализовать автоматическую генерацию карточек из текста заметок
7. Реализовать модуль аналитики учебной нагрузки с визуализацией
8. Реализовать экспорт заметок в формат Obsidian (Markdown + YAML frontmatter)
9. Выполнить тестирование разработанного приложения

**10. Календарный план:**
| № | Задача | Метод | Сроки | Показатели |
|---|--------|-------|-------|-----------|
| 1 | Сравнительный анализ | Анализ, классификация | 02.02–14.02 | Не менее 3 аналогов, 3 критерия |
| 2 | Проектирование архитектуры | ООП, UML, ERD | 15.02–28.02 | Схема БД, архитектурные диаграммы |
| 3 | Требования | Анализ сценариев | 01.03–07.03 | 10+ функциональных, 5+ нефункциональных |
| 4 | Markdown-редактор | React Native, expo-sqlite | 08.03–25.03 | Рабочий редактор с превью |
| 5 | Алгоритм SM-2 | Алгоритмизация | 26.03–10.04 | Реализованный алгоритм, карточки |
| 6 | Аналитика | Визуализация данных | 11.04–25.04 | Графики, прогноз готовности |
| 7 | Экспорт и интеграция | Файловая система | 26.04–05.05 | Obsidian-совместимый экспорт |
| 8 | Тестирование | Функциональное | 06.05–15.05 | Отсутствие критических ошибок |

**11. Показатели результативности:**
Количественные:
- Проанализировано не менее 3 существующих аналогов
- Сформулировано не менее 10 функциональных требований
- Реализовано не менее 5 основных экранов приложения
- Скриншоты работы приложения (не менее 5)

Качественные:
- Интуитивно понятный интерфейс, время освоения не более 5 минут
- Корректная работа алгоритма SM-2
- Совместимость экспорта с Obsidian

**12. Партнёры:**
| № | Партнёр | Вид поддержки |
|---|---------|---------------|
| 1. | Факультет компьютерных технологий | информационная |
| 2. | Кафедра информационных технологий | консультационная |
| 3. | Собственный вклад | ресурсная (ноутбук, ПО) |

**13. Дальнейшая реализация:**
- Добавление push-уведомлений для напоминания о повторении карточек
- Синхронизация через облако (iCloud / Google Drive)
- Веб-версия приложения
- Интеграция с системами управления обучением (LMS)

**14. Информационное сопровождение:**
- Размещение исходного кода: https://github.com/hostrrr/StudyOrganizer

**15. Приложения:** Отчёт о реализации проекта (см. ниже)

**16. Смета:**
| № | Статья расходов | Стоимость |
|---|----------------|-----------|
| 1. | Доступ к научным базам данных | бесплатно |
| 2. | Приобретение ПО | бесплатно |
| 3. | Тестовые устройства | Личный вклад |

## Implementation Report (Отчёт о реализации)

This is the main technical content. Goes after the passport. Sections are NOT numbered with headings — they are just bold centered titles like the example PDF shows:

**1 Сравнительный анализ аналогов** (bold, center, 14pt, 1.25cm indent for body)

Analyze 3 apps: Notion, Obsidian (desktop), Anki. Show their limitations vs this project.

**2 Функциональная структура** — describe Use Case diagram, IDEF0 context diagram

**3 Функциональные и нефункциональные требования** — bullet lists

**4 Проектирование БД** — describe SQLite schema with tables: subjects, notes_v2, flashcards, review_log etc. Add table with table descriptions.

**5 Архитектура приложения** — React Native + Expo, SQLite, component structure

**6 Реализация Markdown-редактора** — describe the editor, toolbar, preview mode

**7 Алгоритм SM-2** — explain the algorithm mathematically, show formula

**8 Аналитика учебной нагрузки** — describe analytics screens, charts, forecast

**9 Экспорт в Obsidian** — describe YAML frontmatter, file structure

**10 Интерфейс приложения** — 3-5 screenshots with captions

## Section Headings in Report

```python
def add_report_section(doc, text):
    """Bold centered section heading like in the example PDF."""
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run_font(run, bold=True, size=14)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(1.25)
    doc.add_paragraph()
```

## Body Paragraph

```python
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
```

## Tables in Report

- Font: 12pt, line spacing 1.0
- Caption **above** or **below** — per example: `Таблица N. Название` (right-aligned, 12pt)
- Every table must be referenced in text before it

```python
def add_table_caption(doc, num, title):
    p = doc.add_paragraph()
    run = p.add_run(f"Таблица {num}. {title}")
    set_run_font(run, size=12)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.first_line_indent = Cm(0)
```

## Figures

Caption **below** figure, centered, 14pt:
`Рисунок N – Название`

```python
def add_figure_caption(doc, num, title):
    p = doc.add_paragraph()
    run = p.add_run(f"Рисунок {num} – {title}")
    set_run_font(run, size=14)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
```

## Заключение

After the implementation report, add page break and "ЗАКЛЮЧЕНИЕ" heading (bold, center).
Content: summarize what was done, list resolved tasks, stack used, features, future plans.

## Sources (min 10, GOST R 7.0.100-2018)

Heading: "СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ" (bold, center)

Numbered list, 14pt, 1.25cm indent, justified. Format:

**Books:**
Фамилия, И.О. Название / И.О. Фамилия. – Город : Издательство, Год. – N с.

**Electronic resources:**
Название : сайт. – URL: https://... (дата обращения: дд.мм.гггг).

Suggested sources:
1. Документация React Native : сайт. – URL: https://reactnative.dev (дата обращения: 10.04.2026).
2. Документация Expo SDK : сайт. – URL: https://docs.expo.dev (дата обращения: 10.04.2026).
3. Wozniak, P.A. Algorithm SM-2 : сайт. – URL: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method (дата обращения: 15.03.2026).
4. Gruber, J. Markdown specification : сайт. – URL: https://daringfireball.net/projects/markdown (дата обращения: 15.03.2026).
5. Документация SQLite : сайт. – URL: https://www.sqlite.org/docs.html (дата обращения: 20.03.2026).
6. Ebbinghaus, H. Memory: A Contribution to Experimental Psychology / H. Ebbinghaus. – New York : Teachers College Press, 1913. – 123 p.
7. Nielsen, J. Mobile Usability / J. Nielsen, R. Budiu. – New Riders, 2012. – 192 p.
8. Документация expo-sqlite : сайт. – URL: https://docs.expo.dev/versions/latest/sdk/sqlite (дата обращения: 10.04.2026).
9. Fowler, M. Patterns of Enterprise Application Architecture / M. Fowler. – Addison-Wesley, 2002. – 560 p.
10. ГОСТ Р 7.0.100-2018. Библиографическая запись. Библиографическое описание. Общие требования и правила составления. – Москва : Стандартинформ, 2018. – 124 с.

## Lists

### Bulleted (dash marker)
```python
def add_bulleted_list(doc, intro_text, items):
    add_body_paragraph(doc, intro_text)
    for i, item in enumerate(items):
        p = doc.add_paragraph()
        sep = ";" if i < len(items) - 1 else "."
        run = p.add_run(f"– {item}{sep}")
        set_run_font(run, size=14)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.first_line_indent = Cm(1.25)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
```

### Numbered
```python
def add_numbered_list(doc, intro_text, items):
    add_body_paragraph(doc, intro_text)
    for i, item in enumerate(items, 1):
        p = doc.add_paragraph()
        sep = ";" if i < len(items) else "."
        run = p.add_run(f"{i}) {item}{sep}")
        set_run_font(run, size=14)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.first_line_indent = Cm(1.25)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
```

## Critical Rules

- Title page: NO page number shown
- NO реферат, NO содержание/TOC
- NO numbered heading styles (Heading 2/3) — this is NOT a курсовая работа
- Section titles in report: bold, center, 14pt, manually formatted
- All body text: 14pt, Times New Roman, justified, 1.5 spacing, 1.25cm indent
- Table text: 12pt, 1.0 spacing
- Table caption: right-aligned, 12pt
- Figure caption: centered, 14pt, below figure
- Total pages: 20–35
- No source code in document — only GitHub link
- Passport tables: use Table Grid style, 12pt text
