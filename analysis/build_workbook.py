"""Builds the Excel workbook: raw responses, scoring formulas, analysis, dashboard.

Every score, percentage, summary and chart series is an Excel formula over the
response sheets, so editing a response updates the whole workbook. Python only
writes raw answers and layout.
"""
from pathlib import Path

import xlsxwriter

import json
import shutil

from generate_data import LETTERS, QUESTIONS, SCENARIOS, TOPIC_LABELS, generate, participant_names

ROOT = Path(__file__).parent.parent
OUT = ROOT / "output" / "cybersecurity_awareness_impact.xlsx"
WEB_DATA = ROOT / "quiz-app" / "public" / "data"
BANNER = "Scam Shield - cybersecurity awareness impact evaluation"
NQ = len(QUESTIONS)
QB_FIRST, QB_LAST = 3, 3 + NQ - 1          # Question_Bank data rows (1-based Excel rows)
POST_TARGET = 0.6                           # post accuracy below this is flagged
CHANGE_MIN, CHANGE_MAX = -6, 10             # histogram bins, asserted against the data
TOPICS = list(TOPIC_LABELS.values())
NBINS = CHANGE_MAX - CHANGE_MIN + 1
HIST_FIRST = 30                                    # Analysis sheets: first histogram row
AQ_FIRST = HIST_FIRST + NBINS + 2                  # Analysis sheets: first question row (after header)
AQ_LAST = AQ_FIRST + NQ - 1
COLOR = {"pre": "#9AA5B1", "post": "#2E9E6B", "Social": "#3B82F6", "Seminar": "#F59E0B"}


def qb(col):
    return f"Question_Bank!${col}${QB_FIRST}:${col}${QB_LAST}"


def options_text(item):
    return "  ".join(f"{LETTERS[i]}) {o}" for i, o in enumerate(item["options"]))


def write_question_bank(wb, ws, fmt):
    ws.merge_range("A1:M1", BANNER, fmt["banner"])
    headers = ["Question_ID", "Topic", "Objective", "Type", "Pre_Question", "Pre_Options", "Pre_Correct",
               "Post_Question", "Post_Options", "Post_Correct", "Explanation_Pre", "Explanation_Post", "Points"]
    ws.write_row(1, 0, headers, fmt["head"])
    for r, q in enumerate(QUESTIONS, start=2):
        a, b = q["a"], q["b"]
        ws.write_row(r, 0, [q["id"], TOPIC_LABELS[q["topic"]], q["objective"], q["type"], a["prompt"],
                            options_text(a), LETTERS[a["answer"]], b["prompt"], options_text(b),
                            LETTERS[b["answer"]], a["why"], b["why"], 1], fmt["wrap"])
    ws.set_column("A:A", 11); ws.set_column("B:D", 22); ws.set_column("E:F", 60)
    ws.set_column("G:G", 11); ws.set_column("H:I", 60); ws.set_column("J:J", 11)
    ws.set_column("K:L", 55); ws.set_column("M:M", 8)
    ws.freeze_panes(2, 1)


def write_responses(ws, fmt, group, stage, rows, names):
    """One row per participant x question; scoring columns are formulas."""
    first, last = 3, 2 + len(rows)
    key_col = "G" if stage == "Pre" else "J"
    ws.merge_range("A1:M1", BANNER, fmt["banner"])
    ws.write_row(1, 0, ["Participant_ID", "Intervention_Group", "Assessment_Stage", "Question_ID", "Topic",
                        "Selected_Answer", "Correct_Answer", "Is_Correct", "Question_Score", "Overall_Score",
                        "Overall_Pct", "Topic_Accuracy", "Participant_Name"], fmt["head"])
    topic_of = {q["id"]: TOPIC_LABELS[q["topic"]] for q in QUESTIONS}
    rng = lambda c: f"${c}${first}:${c}${last}"
    for i, (pid, qid, letter) in enumerate(rows):
        r, x = i + 2, i + 3
        ws.write_row(r, 0, [pid, group, stage, qid, topic_of[qid], letter])
        ws.write(r, 12, names[pid])
        ws.write_formula(r, 6, f"=INDEX({qb(key_col)},MATCH(D{x},{qb('A')},0))")
        ws.write_formula(r, 7, f"=IF(F{x}=G{x},1,0)")
        ws.write_formula(r, 8, f"=H{x}*INDEX({qb('M')},MATCH(D{x},{qb('A')},0))")
        ws.write_formula(r, 9, f"=SUMIFS({rng('I')},{rng('A')},A{x})")
        ws.write_formula(r, 10, f"=J{x}/SUM({qb('M')})", fmt["pct"])
        ws.write_formula(r, 11, f"=SUMIFS({rng('I')},{rng('A')},A{x},{rng('E')},E{x})"
                                f"/SUMIFS({qb('M')},{qb('B')},E{x})", fmt["pct"])
    ws.set_column("A:A", 15); ws.set_column("B:B", 22); ws.set_column("C:C", 16); ws.set_column("D:D", 12)
    ws.set_column("E:E", 24); ws.set_column("F:L", 15); ws.set_column("M:M", 22)
    ws.freeze_panes(2, 1)
    ws.autofilter(1, 0, last - 1, 12)
    ws.conditional_format(f"H{first}:H{last}", {"type": "cell", "criteria": "==", "value": 0, "format": fmt["bad"]})
    ws.conditional_format(f"H{first}:H{last}", {"type": "cell", "criteria": "==", "value": 1, "format": fmt["good"]})


def write_analysis(wb, ws, fmt, key, participants, n_rows, names):
    """Layout: summary A3, topics A15, categories A22, change histogram A29, questions below it, matched table H3."""
    pre, post = f"{key}_Pre", f"{key}_Post"
    last = 2 + n_rows
    col = lambda sheet, c: f"{sheet}!${c}$3:${c}${last}"
    n = len(participants)
    p_first, p_last = 4, 3 + n
    chg = f"$M${p_first}:$M${p_last}"
    ws.merge_range("A1:P1", f"{SCENARIOS[key]['group']} analysis - {BANNER}", fmt["banner"])

    # Matched participant table (H:O)
    ws.write_row(2, 7, ["Participant_ID", "Pre_Score", "Post_Score", "Pre_Pct", "Post_Pct",
                        "Change_Points", "Change_pp", "Category", "Participant_Name"], fmt["head"])
    for i, pid in enumerate(participants):
        r, x = p_first - 1 + i, p_first + i
        ws.write(r, 7, pid)
        ws.write(r, 15, names[pid])
        ws.write_formula(r, 8, f"=SUMIFS({col(pre, 'I')},{col(pre, 'A')},H{x})")
        ws.write_formula(r, 9, f"=SUMIFS({col(post, 'I')},{col(post, 'A')},H{x})")
        ws.write_formula(r, 10, f"=I{x}/SUM({qb('M')})", fmt["pct"])
        ws.write_formula(r, 11, f"=J{x}/SUM({qb('M')})", fmt["pct"])
        ws.write_formula(r, 12, f"=J{x}-I{x}")
        ws.write_formula(r, 13, f"=(L{x}-K{x})*100", fmt["pp"])
        ws.write_formula(r, 14, f'=IF(M{x}>=$B$23,"Substantial",IF(M{x}>=$B$24,"Modest",IF(M{x}=0,"Unchanged","Lower")))')
    ws.conditional_format(f"N{p_first}:N{p_last}", {"type": "3_color_scale", "min_color": "#F8B4B4",
                                                    "mid_color": "#FFFFFF", "max_color": "#86D7A8",
                                                    "mid_type": "num", "mid_value": 0})

    # Summary metrics
    ws.write_row(2, 0, ["Metric", "Value"], fmt["head"])
    pre_rng, post_rng = f"$I${p_first}:$I${p_last}", f"$J${p_first}:$J${p_last}"
    summary = [
        ("Matched participants", f"=COUNTA($H${p_first}:$H${p_last})", None),
        ("Average pre score (points)", f"=AVERAGE({pre_rng})", fmt["num"]),
        ("Average post score (points)", f"=AVERAGE({post_rng})", fmt["num"]),
        ("Average pre score (%)", f"=AVERAGE($K${p_first}:$K${p_last})", fmt["pct"]),
        ("Average post score (%)", f"=AVERAGE($L${p_first}:$L${p_last})", fmt["pct"]),
        ("Absolute improvement (percentage points)", "=(B8-B7)*100", fmt["pp"]),
        ("Relative improvement (% of baseline)", "=(B8-B7)/B7", fmt["pct"]),
        ("Participants whose score increased", f'=COUNTIF({chg},">0")/B4', fmt["pct"]),
        ("Mean score change (points)", f"=AVERAGE({chg})", fmt["num"]),
        ("Post-accuracy target (flag below)", POST_TARGET, fmt["pct"]),
    ]
    for i, (label, value, f) in enumerate(summary):
        r = 3 + i
        ws.write(r, 0, label)
        (ws.write_formula if isinstance(value, str) else ws.write)(r, 1, value, f)

    # Topic accuracy
    ws.write_row(14, 0, ["Topic", "Pre accuracy", "Post accuracy", "Change (pp)", "Flag"], fmt["head"])
    for i, topic in enumerate(TOPICS):
        r, x = 15 + i, 16 + i
        acc = lambda sheet: (f"=SUMIFS({col(sheet, 'H')},{col(sheet, 'E')},$A{x})"
                             f"/COUNTIFS({col(sheet, 'E')},$A{x})")
        ws.write(r, 0, topic)
        ws.write_formula(r, 1, acc(pre), fmt["pct"])
        ws.write_formula(r, 2, acc(post), fmt["pct"])
        ws.write_formula(r, 3, f"=(C{x}-B{x})*100", fmt["pp"])
        ws.write_formula(r, 4, f'=IF(C{x}<$B$13,"Needs further education","")')

    # Improvement categories: thresholds in column B drive the matched table
    ws.write_row(21, 0, ["Category", "Min change (points)", "Participants", "Share"], fmt["head"])
    cats = [("Substantial improvement", 3, f'=COUNTIF({chg},">="&B23)'),
            ("Modest improvement", 1, f'=COUNTIF({chg},">="&B24)-COUNTIF({chg},">="&B23)'),
            ("Unchanged", 0, f"=COUNTIF({chg},0)"),
            ("Scored lower", "<0", f'=COUNTIF({chg},"<0")')]
    for i, (label, minimum, formula) in enumerate(cats):
        r, x = 22 + i, 23 + i
        ws.write(r, 0, label); ws.write(r, 1, minimum)
        ws.write_formula(r, 2, formula)
        ws.write_formula(r, 3, f"=C{x}/$B$4", fmt["pct"])

    # Histogram of individual changes
    ws.write_row(HIST_FIRST - 2, 0, ["Score change (points)", "Participants"], fmt["head"])
    for i, c in enumerate(range(CHANGE_MIN, CHANGE_MAX + 1)):
        ws.write(HIST_FIRST - 1 + i, 0, c)
        ws.write_formula(HIST_FIRST - 1 + i, 1, f"=COUNTIF({chg},A{HIST_FIRST + i})")

    # Question-level performance
    ws.write_row(AQ_FIRST - 2, 0, ["Question", "Objective", "Pre accuracy", "Post accuracy", "Change (pp)", "Flag"], fmt["head"])
    for i, q in enumerate(QUESTIONS):
        r, x = AQ_FIRST - 1 + i, AQ_FIRST + i
        acc = lambda sheet: (f"=SUMIFS({col(sheet, 'H')},{col(sheet, 'D')},$A{x})"
                             f"/COUNTIFS({col(sheet, 'D')},$A{x})")
        ws.write(r, 0, q["id"]); ws.write(r, 1, q["objective"])
        ws.write_formula(r, 2, acc(pre), fmt["pct"])
        ws.write_formula(r, 3, acc(post), fmt["pct"])
        ws.write_formula(r, 4, f"=(D{x}-C{x})*100", fmt["pp"])
        ws.write_formula(r, 5, f'=IF(D{x}<$B$13,"Misconception remains",IF(E{x}>=25,"Large gain",""))')

    for rng in ("D16:D19", f"E{AQ_FIRST}:E{AQ_LAST}"):
        ws.conditional_format(rng, {"type": "3_color_scale", "min_color": "#F8B4B4", "mid_color": "#FFFFFF",
                                    "max_color": "#86D7A8", "mid_type": "num", "mid_value": 0})
    ws.conditional_format("C16:C19", {"type": "cell", "criteria": "<", "value": "$B$13", "format": fmt["bad"]})
    ws.conditional_format(f"D{AQ_FIRST}:D{AQ_LAST}", {"type": "cell", "criteria": "<", "value": "$B$13", "format": fmt["bad"]})
    ws.set_column("A:A", 42); ws.set_column("B:B", 30); ws.set_column("C:F", 18)
    ws.set_column("G:G", 3); ws.set_column("H:O", 14); ws.set_column("P:P", 22)


def write_dashboard(wb, ws, fmt):
    ws.merge_range("A1:T1", f"Impact Dashboard - {BANNER}", fmt["banner"])
    S, M = "Social_Analysis", "Seminar_Analysis"

    ws.write_row(3, 0, ["Metric", "Social media", "Seminar", "Seminar minus Social"], fmt["head"])
    metrics = [("Matched participants", 4, None), ("Average pre score (%)", 7, fmt["pct"]),
               ("Average post score (%)", 8, fmt["pct"]), ("Absolute improvement (pp)", 9, fmt["pp"]),
               ("Relative improvement (% of baseline)", 10, fmt["pct"]),
               ("Participants whose score increased", 11, fmt["pct"])]
    for i, (label, src, f) in enumerate(metrics):
        r, x = 4 + i, 5 + i
        ws.write(r, 0, label)
        ws.write_formula(r, 1, f"={S}!B{src}", f); ws.write_formula(r, 2, f"={M}!B{src}", f)
        ws.write_formula(r, 3, f"=C{x}-B{x}", f)

    ws.write_row(11, 0, ["Topic", "Social pre", "Social post", "Seminar pre", "Seminar post",
                         "Social gain (pp)", "Seminar gain (pp)"], fmt["head"])
    for i, topic in enumerate(TOPICS + ["Overall"]):
        r, x = 12 + i, 13 + i
        src = 16 + i if i < 4 else None
        ws.write(r, 0, topic)
        if src:
            for c, (sheet, col) in enumerate([(S, "B"), (S, "C"), (M, "B"), (M, "C")], start=1):
                ws.write_formula(r, c, f"={sheet}!{col}{src}", fmt["pct"])
        else:
            for c, (sheet, cell) in enumerate([(S, "B7"), (S, "B8"), (M, "B7"), (M, "B8")], start=1):
                ws.write_formula(r, c, f"={sheet}!{cell}", fmt["pct"])
        ws.write_formula(r, 5, f"=(C{x}-B{x})*100", fmt["pp"])
        ws.write_formula(r, 6, f"=(E{x}-D{x})*100", fmt["pp"])

    ws.write_row(18, 0, ["Improvement category", "Social", "Seminar"], fmt["head"])
    for i in range(4):
        r = 19 + i
        ws.write_formula(r, 0, f"={S}!A{23 + i}")
        ws.write_formula(r, 1, f"={S}!C{23 + i}"); ws.write_formula(r, 2, f"={M}!C{23 + i}")

    ws.write_row(23, 0, ["Score change (points)", "Social", "Seminar"], fmt["head"])
    for i in range(NBINS):
        r = 24 + i
        ws.write_formula(r, 0, f"={S}!A{HIST_FIRST + i}")
        ws.write_formula(r, 1, f"={S}!B{HIST_FIRST + i}"); ws.write_formula(r, 2, f"={M}!B{HIST_FIRST + i}")

    q0 = 24 + NBINS + 1          # header row index of question table
    ws.write_row(q0, 0, ["Question", "Objective", "Social pre", "Social post", "Social change (pp)",
                         "Seminar pre", "Seminar post", "Seminar change (pp)"], fmt["head"])
    for i in range(NQ):
        r, src = q0 + 1 + i, AQ_FIRST + i
        ws.write_formula(r, 0, f"={S}!A{src}"); ws.write_formula(r, 1, f"={S}!B{src}")
        for c, (sheet, col) in enumerate([(S, "C"), (S, "D"), (S, "E"), (M, "C"), (M, "D"), (M, "E")], start=2):
            ws.write_formula(r, c, f"={sheet}!{col}{src}", fmt["pp"] if col == "E" else fmt["pct"])
    qf, ql = q0 + 2, q0 + 1 + NQ                          # first/last Excel row of question data
    ws.conditional_format(f"E{qf}:E{ql}", {"type": "data_bar", "bar_color": COLOR["Social"]})
    ws.conditional_format(f"H{qf}:H{ql}", {"type": "data_bar", "bar_color": COLOR["Seminar"]})
    for c in ("D", "G"):
        ws.conditional_format(f"{c}{qf}:{c}{ql}", {"type": "cell", "criteria": "<", "value": POST_TARGET,
                                                   "format": fmt["bad"]})

    ins = ql + 2
    ws.write(ins, 0, "Key findings (calculated)", fmt["head"])
    ws.write(ins, 1, "", fmt["head"])
    pick = lambda col, fn: (f"=INDEX($B${qf}:$B${ql},MATCH({fn}({col}{qf}:{col}{ql}),{col}{qf}:{col}{ql},0))")
    findings = [("Largest gain - Social", pick("E", "MAX")), ("Largest gain - Seminar", pick("H", "MAX")),
                ("Lowest post accuracy - Social", pick("D", "MIN")),
                ("Lowest post accuracy - Seminar", pick("G", "MIN"))]
    for i, (label, formula) in enumerate(findings):
        ws.write(ins + 1 + i, 0, label); ws.write_formula(ins + 1 + i, 1, formula)
    ws.write(ins + 5, 0, "Topic with largest gain - Social")
    ws.write_formula(ins + 5, 1, "=INDEX($A$13:$A$16,MATCH(MAX($F$13:$F$16),$F$13:$F$16,0))")
    ws.write(ins + 6, 0, "Topic with largest gain - Seminar")
    ws.write_formula(ins + 6, 1, "=INDEX($A$13:$A$16,MATCH(MAX($G$13:$G$16),$G$13:$G$16,0))")

    ws.set_column("A:A", 38); ws.set_column("B:B", 34); ws.set_column("C:H", 16); ws.set_column("I:I", 3)
    add_charts(wb, ws, qf, ql)


def series(name, cats, vals, color, sheet="Impact_Dashboard"):
    return {"name": name, "categories": f"={sheet}!{cats}", "values": f"={sheet}!{vals}",
            "fill": {"color": color}, "data_labels": {"value": True, "num_format": "0%"}}


def add_charts(wb, ws, qf, ql):
    def make(kind, title, pos, ytitle=None, num=None, size=(620, 330)):
        ch = wb.add_chart({"type": kind})
        ch.set_title({"name": title, "name_font": {"size": 12}})
        ch.set_legend({"position": "bottom"})
        ch.set_size({"width": size[0], "height": size[1]})
        if ytitle:
            ch.set_y_axis({"name": ytitle, "num_format": num or "0%", "major_gridlines": {"visible": True,
                           "line": {"color": "#E5E7EB"}}})
        ws.insert_chart(pos, ch)
        return ch

    c1 = make("column", "1. Average score: pre vs post", "J4", "Average score", "0%")
    c1.add_series({"name": "Pre", "categories": "=Impact_Dashboard!$B$4:$C$4", "values": "=Impact_Dashboard!$B$6:$C$6",
                   "fill": {"color": COLOR["pre"]}, "data_labels": {"value": True, "num_format": "0.0%"}})
    c1.add_series({"name": "Post", "categories": "=Impact_Dashboard!$B$4:$C$4", "values": "=Impact_Dashboard!$B$7:$C$7",
                   "fill": {"color": COLOR["post"]}, "data_labels": {"value": True, "num_format": "0.0%"}})
    c1.set_y_axis({"min": 0, "max": 1, "num_format": "0%"})

    c2 = make("column", "2. Topic-wise accuracy", "R4", "Accuracy", "0%")
    for name, col, color in (("Social pre", "B", "#B7D3FA"), ("Social post", "C", COLOR["Social"]),
                             ("Seminar pre", "D", "#FBD99B"), ("Seminar post", "E", COLOR["Seminar"])):
        s = series(name, "$A$13:$A$16", f"${col}$13:${col}$16", color)
        s["data_labels"] = {"value": False}
        c2.add_series(s)
    c2.set_y_axis({"min": 0, "max": 1, "num_format": "0%"})

    c3 = make("column", "3. Improvement categories (participants)", "J22", "Participants", "0")
    for name, col in (("Social", "B"), ("Seminar", "C")):
        s = series(name, "$A$20:$A$23", f"${col}$20:${col}$23", COLOR[name])
        s["data_labels"] = {"value": True}
        c3.add_series(s)

    c4 = make("column", "4. Distribution of individual score changes", "R22", "Participants", "0")
    for name, col in (("Social", "B"), ("Seminar", "C")):
        s = series(name, f"$A$25:$A${24 + NBINS}", f"${col}$25:${col}${24 + NBINS}", COLOR[name])
        s["data_labels"] = {"value": False}
        c4.add_series(s)
    c4.set_x_axis({"name": "Change in score (questions out of 12)"})

    c5 = make("bar", "5. Learning gain by topic (percentage points)", "J40", None, None)
    for name, col in (("Social", "F"), ("Seminar", "G")):
        s = series(name, "$A$13:$A$17", f"${col}$13:${col}$17", COLOR[name])
        s["data_labels"] = {"value": True, "num_format": "0.0"}
        c5.add_series(s)
    c5.set_x_axis({"name": "Gain (pp)", "num_format": "0"})

    c6 = make("bar", "6. Question-level change (pp); see table for misconceptions", "R40", None, None, (620, 460))
    for name, col in (("Social", "E"), ("Seminar", "H")):
        s = series(name, f"$A${qf}:$A${ql}", f"${col}${qf}:${col}${ql}", COLOR[name])
        s["data_labels"] = {"value": False}
        c6.add_series(s)
    c6.set_x_axis({"name": "Change (pp)", "num_format": "0"})
    c6.set_y_axis({"reverse": True})


def write_readme(ws, fmt, sizes):
    ws.set_column("A:A", 120)
    lines = [
        (BANNER, fmt["banner"]),
        ("README and assumptions", fmt["title"]),
        ("Purpose: pre/post evaluation of two cybersecurity-awareness interventions.", None),
        (f"Social media scenario: {sizes['Social']} participants. Seminar scenario: {sizes['Seminar']} students. "
         "Participant IDs match across Pre and Post sheets.", None),
        (f"Quiz: {NQ} questions, 3 per topic. Pre and Post use parallel versions (form A / form B) of the same learning "
         "objective, with equal assumed difficulty. Each question is worth 1 point.", None),
        ("The live quiz app presents some of these questions as interactive tasks (match the lines, scam-or-safe swipe "
         "cards, tap the red flags, put steps in order). Question_Bank holds the four-option form of each learning "
         "objective that the responses are modelled on; each task is scored right or wrong on the same objective.", None),
        ("", None),
        ("Assumptions used to generate the responses (see analysis/generate_data.py)", fmt["title"]),
        ("1. Each participant has a random baseline ability; each question has a fixed difficulty; correctness is a "
         "probability from both, so scores are noisy and not uniformly high.", None),
        ("2. Each participant has a random personal gain for the intervention, so some improve a lot, some a little, "
         "and some score lower after.", None),
        ("3. Seminar gain is assumed larger on average than the social media gain (direct instruction and discussion).", None),
        ("4. Two questions (QR-code phishing, digital arrest) are assumed stubborn: interventions help them less, "
         "especially the social posts. Social posts are assumed to help WhatsApp scam awareness slightly more than "
         "everyday-fraud awareness.", None),
        ("5. Wrong answers are chosen uniformly among the three incorrect options.", None),
        ("", None),
        ("How to read the workbook", fmt["title"]),
        ("Is_Correct, scores and percentages are formulas over Selected_Answer and Question_Bank. Analysis and "
         "dashboard values and all charts are formulas over those sheets, so edits flow through.", None),
        ("Percentage-point improvement = post % minus pre %. Relative improvement = (post % minus pre %) divided by "
         "pre %. They are reported separately and should not be confused.", None),
        ("Improvement categories (change in questions correct): Substantial >= 3, Modest 1-2, Unchanged 0, Lower < 0. "
         "Thresholds are editable in cells B23:B24 on each analysis sheet.", None),
    ]
    for r, (text, f) in enumerate(lines):
        ws.write(r, 0, text, f or fmt["wrap"])


def main():
    OUT.parent.mkdir(exist_ok=True)
    wb = xlsxwriter.Workbook(OUT)
    fmt = {
        "banner": wb.add_format({"bold": True, "font_color": "#FFFFFF", "bg_color": "#B91C1C", "align": "center"}),
        "note": wb.add_format({"italic": True, "font_color": "#4B5563", "align": "center"}),
        "head": wb.add_format({"bold": True, "bg_color": "#1F2937", "font_color": "#FFFFFF", "border": 1,
                               "text_wrap": True, "valign": "vcenter"}),
        "title": wb.add_format({"bold": True, "font_size": 13}),
        "wrap": wb.add_format({"text_wrap": True, "valign": "top"}),
        "pct": wb.add_format({"num_format": "0.0%"}),
        "pp": wb.add_format({"num_format": '0.0 "pp"'}),
        "num": wb.add_format({"num_format": "0.00"}),
        "good": wb.add_format({"bg_color": "#D1FAE5", "font_color": "#065F46"}),
        "bad": wb.add_format({"bg_color": "#FEE2E2", "font_color": "#991B1B"}),
    }
    readme = wb.add_worksheet("README")
    sheets = {name: wb.add_worksheet(name) for name in (
        "Social_Pre", "Social_Post", "Seminar_Pre", "Seminar_Post", "Question_Bank",
        "Social_Analysis", "Seminar_Analysis", "Impact_Dashboard")}
    write_question_bank(wb, sheets["Question_Bank"], fmt)
    sizes = {}
    export = {"questions": [{"id": q["id"], "topic": TOPIC_LABELS[q["topic"]], "objective": q["objective"],
                             "preCorrect": LETTERS[q["a"]["answer"]], "postCorrect": LETTERS[q["b"]["answer"]]}
                            for q in QUESTIONS],
              "topics": TOPICS, "scenarios": {}}
    for key, cfg in SCENARIOS.items():
        data = generate(key)
        names = dict(participant_names(key))
        participants = [pid for pid, _, _ in data["Pre"][::NQ]]
        sizes[key] = len(participants)
        assert participants == [pid for pid, _, _ in data["Post"][::NQ]], "pre/post participants must match"
        for stage in ("Pre", "Post"):
            write_responses(sheets[f"{key}_{stage}"], fmt, cfg["group"], stage, data[stage], names)
        write_analysis(wb, sheets[f"{key}_Analysis"], fmt, key, participants, len(data["Pre"]), names)
        export["scenarios"][key] = {"label": cfg["group"],
                                    "participants": [{"id": p, "name": names[p]} for p in participants],
                                    "pre": [list(r) for r in data["Pre"]], "post": [list(r) for r in data["Post"]]}
    write_dashboard(wb, sheets["Impact_Dashboard"], fmt)
    write_readme(readme, fmt, sizes)
    sheets["Impact_Dashboard"].activate()
    wb.close()
    # The dashboard reads these same records, so web and Excel figures cannot diverge.
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "dashboard-data.json").write_text(json.dumps(export, separators=(",", ":")))
    shutil.copy(OUT, WEB_DATA / OUT.name)
    print(f"wrote {OUT} and {WEB_DATA}")


if __name__ == "__main__":
    main()
