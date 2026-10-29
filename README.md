# Scam Shield: cybersecurity awareness quiz and pre/post analysis

| Path | What it is |
|---|---|
| `quiz-app/` | Next.js single-page quiz (12 interactive questions, pre/post modes, name only, ID auto-generated). `npm install && npm run dev` |
| `quiz-app/app/dashboard/` | Organiser analytics dashboard at `/dashboard` (Recharts); reads `quiz-app/public/data/dashboard-data.json`, written by the workbook builder from the same rows as the Excel sheets |
| `quiz-app/data/questions.json` | Single source of truth for questions (read by the app and the workbook builder) |
| `analysis/generate_data.py` | Response generator and its documented assumptions |
| `analysis/build_workbook.py` | Builds the Excel workbook (formulas and charts) |
| `analysis/verify_workbook.py` | Recalculates the workbook and compares it with independent Python stats |
| `output/cybersecurity_awareness_impact.xlsx` | The workbook (README sheet, 4 datasets, Question_Bank, 2 analyses, dashboard) |
| `output/INTERPRETATION.md` | Written interpretation of the results |

Rebuild: `cd analysis && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python build_workbook.py`
