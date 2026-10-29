"""Computes every statistic and chart used in the report from the same response
records the web dashboard reads (quiz-app/public/data/dashboard-data.json), so the
report, the Excel workbook and the dashboard cannot disagree. Writes figures/*.png
and stats.json (consumed by build_report.js, so no number in the report is typed by hand).
"""
import json
import statistics as st
import textwrap
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).parent
DATA = json.loads((ROOT.parent / "quiz-app/public/data/dashboard-data.json").read_text())
FIG = ROOT / "figures"
FIG.mkdir(exist_ok=True)

RED, GREEN, GREY, LGREEN, INK = "#c81e2d", "#15803d", "#aab2bd", "#7cc59a", "#14181f"
LABEL = {"Social": "Social media campaign", "Seminar": "In-person seminar"}
SHORT = {"WhatsApp Scams": "WhatsApp scams", "Phishing": "Phishing", "Everyday Online Fraud": "Everyday fraud", "Scam Prevention": "Scam prevention"}
TARGET = 0.6
SUBSTANTIAL_PP = 25

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.edgecolor": "#9aa3af", "axes.labelcolor": INK,
                     "xtick.color": INK, "ytick.color": INK, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.color": "#e6e9ee", "axes.axisbelow": True, "figure.dpi": 200})

QS = DATA["questions"]
TOPICS = DATA["topics"]
NQ = len(QS)


def score(recs, form):
    key = "preCorrect" if form == "pre" else "postCorrect"
    correct = {q["id"]: q[key] for q in QS}
    per_p, per_q = {}, {}
    for pid, qid, sel in recs:
        ok = sel == correct[qid]
        per_p[pid] = per_p.get(pid, 0) + ok
        per_q[qid] = per_q.get(qid, 0) + ok
    return per_p, per_q


def analyse(key):
    sc = DATA["scenarios"][key]
    ids = [p["id"] for p in sc["participants"]]
    pre_p, pre_q = score(sc["pre"], "pre")
    post_p, post_q = score(sc["post"], "post")
    n = len(ids)
    pre = [pre_p[i] for i in ids]
    post = [post_p[i] for i in ids]
    change = [b - a for a, b in zip(pre, post)]
    pre_pct = [x / NQ * 100 for x in pre]
    post_pct = [x / NQ * 100 for x in post]
    avg_pre, avg_post = st.mean(pre_pct), st.mean(post_pct)
    cats = {"Substantial": 0, "Modest": 0, "Unchanged": 0, "Lower": 0}
    for c in change:
        pp = c / NQ * 100
        cats["Substantial" if pp >= SUBSTANTIAL_PP - 1e-9 else "Modest" if c > 0 else "Unchanged" if c == 0 else "Lower"] += 1
    topic_rows = []
    for t in TOPICS:
        qids = [q["id"] for q in QS if q["topic"] == t]
        a = sum(pre_q[q] for q in qids) / (n * len(qids)) * 100
        b = sum(post_q[q] for q in qids) / (n * len(qids)) * 100
        topic_rows.append({"topic": t, "pre": a, "post": b, "gain": b - a})
    q_rows = [{"id": q["id"], "topic": q["topic"], "objective": q["objective"], "pre": pre_q[q["id"]] / n * 100,
               "post": post_q[q["id"]] / n * 100, "gain": (post_q[q["id"]] - pre_q[q["id"]]) / n * 100} for q in QS]
    return {
        "n": n, "avgPre": avg_pre, "avgPost": avg_post, "sdPre": st.stdev(pre_pct), "sdPost": st.stdev(post_pct),
        "gainPp": avg_post - avg_pre, "relative": (avg_post - avg_pre) / avg_pre * 100,
        "improvedPct": sum(c > 0 for c in change) / n * 100,
        "meanChange": st.mean(change), "sdChange": st.stdev(change),
        "cohenDz": st.mean(change) / st.stdev(change),
        "hakeGain": (avg_post - avg_pre) / (100 - avg_pre),
        "cats": cats, "topics": topic_rows, "questions": q_rows,
        "change": change, "prePct": pre_pct, "postPct": post_pct,
        "names": [p["name"] for p in sc["participants"]], "ids": ids,
    }


R = {k: analyse(k) for k in ("Social", "Seminar")}
total = R["Social"]["n"] + R["Seminar"]["n"]


def save(fig, name):
    fig.tight_layout()
    fig.savefig(FIG / name, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def bar_labels(ax, bars, fmt="{:.1f}%"):
    for b in bars:
        ax.annotate(fmt.format(b.get_height()), (b.get_x() + b.get_width() / 2, b.get_height()),
                    ha="center", va="bottom", fontsize=9, xytext=(0, 2), textcoords="offset points")


# Fig 1: average pre vs post per scenario
fig, ax = plt.subplots(figsize=(6.4, 3.8))
x = range(2)
w = 0.34
pre_bars = ax.bar([i - w / 2 for i in x], [R[k]["avgPre"] for k in R], w, color=GREY, label="Pre-quiz")
post_bars = ax.bar([i + w / 2 for i in x], [R[k]["avgPost"] for k in R], w, color=GREEN, label="Post-quiz")
bar_labels(ax, pre_bars); bar_labels(ax, post_bars)
ax.set_xticks(list(x), [LABEL[k] for k in R]); ax.set_ylim(0, 105); ax.set_ylabel("Average score (%)")
ax.legend(frameon=False, loc="upper left"); ax.grid(axis="x", visible=False)
save(fig, "fig_avg_scores.png")

# Fig 2: topic accuracy, one panel per scenario
fig, axes = plt.subplots(1, 2, figsize=(9.2, 3.8), sharey=True)
for ax, k in zip(axes, R):
    rows = R[k]["topics"]
    xs = range(len(rows))
    a = ax.bar([i - w / 2 for i in xs], [r["pre"] for r in rows], w, color=GREY, label="Pre-quiz")
    b = ax.bar([i + w / 2 for i in xs], [r["post"] for r in rows], w, color=GREEN, label="Post-quiz")
    bar_labels(ax, a, "{:.0f}"); bar_labels(ax, b, "{:.0f}")
    ax.set_xticks(list(xs), [SHORT[r["topic"]].replace(" ", "\n", 1) for r in rows], fontsize=8.5)
    ax.set_title(LABEL[k], fontsize=10.5, fontweight="bold"); ax.set_ylim(0, 108); ax.grid(axis="x", visible=False)
axes[0].set_ylabel("Accuracy (%)"); axes[0].legend(frameon=False, loc="upper left", fontsize=8.5)
save(fig, "fig_topic_accuracy.png")

# Fig 3: improvement categories (stacked, % of participants)
fig, ax = plt.subplots(figsize=(7.4, 2.9))
names = ["Substantial", "Modest", "Unchanged", "Lower"]
colors = [GREEN, LGREEN, GREY, RED]
labels = ["Improved substantially (25+ pp)", "Improved modestly", "Unchanged", "Scored lower"]
for row, k in enumerate(R):
    left = 0
    for name, color in zip(names, colors):
        share = R[k]["cats"][name] / R[k]["n"] * 100
        ax.barh(row, share, left=left, color=color, height=0.55, label=labels[names.index(name)] if row == 0 else None)
        if share >= 6:
            ax.text(left + share / 2, row, f"{R[k]['cats'][name]}", ha="center", va="center", color="white" if name != "Unchanged" else INK, fontweight="bold")
        left += share
ax.set_yticks([0, 1], [LABEL[k] for k in R]); ax.set_xlim(0, 100); ax.invert_yaxis(); ax.set_xlabel("Share of participants (%) - labels show participant counts")
ax.legend(frameon=False, ncol=2, loc="upper center", bbox_to_anchor=(0.5, -0.32), fontsize=8.5); ax.grid(axis="y", visible=False)
save(fig, "fig_categories.png")

# Fig 4: distribution of individual score changes
lo = min(min(R[k]["change"]) for k in R); hi = max(max(R[k]["change"]) for k in R)
fig, axes = plt.subplots(1, 2, figsize=(9.2, 3.5), sharey=True)
for ax, k in zip(axes, R):
    counts = [R[k]["change"].count(c) for c in range(lo, hi + 1)]
    ax.bar(range(lo, hi + 1), counts, color=[GREEN if c > 0 else RED if c < 0 else GREY for c in range(lo, hi + 1)])
    ax.set_title(LABEL[k], fontsize=10.5, fontweight="bold"); ax.set_xlabel("Change in correct answers (out of 12)")
    ax.set_xticks(range(lo, hi + 1)); ax.grid(axis="x", visible=False)
axes[0].set_ylabel("Participants")
save(fig, "fig_change_distribution.png")

# Fig 5: gain by topic, both interventions
fig, ax = plt.subplots(figsize=(7.2, 3.8))
xs = range(len(TOPICS))
a = ax.bar([i - w / 2 for i in xs], [r["gain"] for r in R["Social"]["topics"]], w, color=RED, label=LABEL["Social"])
b = ax.bar([i + w / 2 for i in xs], [r["gain"] for r in R["Seminar"]["topics"]], w, color=GREEN, label=LABEL["Seminar"])
bar_labels(ax, a, "{:+.1f}"); bar_labels(ax, b, "{:+.1f}")
ax.set_xticks(list(xs), [SHORT[t] for t in TOPICS]); ax.set_ylabel("Gain (percentage points)"); ax.legend(frameon=False, loc="upper left"); ax.grid(axis="x", visible=False)
ax.set_ylim(0, max(r["gain"] for k in R for r in R[k]["topics"]) * 1.2)
save(fig, "fig_topic_gain.png")

# Fig 6: question-level change; red = below the post-accuracy target
fig, axes = plt.subplots(1, 2, figsize=(9.6, 6.2), sharey=True)
order = [q["id"] for q in QS]
for ax, k in zip(axes, R):
    rows = {r["id"]: r for r in R[k]["questions"]}
    ys = list(range(len(order)))
    ax.barh(ys, [rows[i]["gain"] for i in order], color=[RED if rows[i]["post"] < TARGET * 100 else GREEN for i in order], height=0.65)
    for y, i in zip(ys, order):
        ax.text(rows[i]["gain"] + 1, y, f"{rows[i]['gain']:+.0f}  (post {rows[i]['post']:.0f}%)", va="center", fontsize=7.5)
    ax.set_title(LABEL[k], fontsize=10.5, fontweight="bold"); ax.set_xlabel("Gain (percentage points)")
    ax.set_xlim(0, max(r["gain"] for r in rows.values()) * 1.65); ax.grid(axis="y", visible=False)
axes[0].set_yticks(ys, [textwrap.fill(f"{q['id']} {q['objective']}", 32) for q in QS], fontsize=8); axes[0].invert_yaxis()
fig.text(0.5, -0.01, "Red bars: post-quiz accuracy still below the 60% target.   Green bars: at or above target.", ha="center", fontsize=8.5, color=INK)
save(fig, "fig_question_level.png")

# Fig 7: pre vs post scatter per participant
fig, axes = plt.subplots(1, 2, figsize=(9.2, 4.2), sharey=True)
for ax, k in zip(axes, R):
    d = R[k]
    ax.plot([0, 100], [0, 100], "--", color="#9aa3af", linewidth=1)
    for name, color, lab in zip(names, colors, labels):
        pts = [(a, b) for a, b, c in zip(d["prePct"], d["postPct"], d["change"])
               if ("Substantial" if (c / NQ * 100) >= SUBSTANTIAL_PP - 1e-9 else "Modest" if c > 0 else "Unchanged" if c == 0 else "Lower") == name]
        ax.scatter([p[0] for p in pts], [p[1] for p in pts], s=34, color=color, alpha=0.8, label=lab, edgecolor="white", linewidth=0.5)
    ax.set_title(LABEL[k], fontsize=10.5, fontweight="bold"); ax.set_xlabel("Pre-quiz score (%)"); ax.set_xlim(-4, 104); ax.set_ylim(-4, 104)
axes[0].set_ylabel("Post-quiz score (%)")
axes[0].legend(frameon=False, fontsize=7.5, loc="upper left")
save(fig, "fig_scatter.png")

# stats.json for the report builder (drop bulky per-participant arrays that are not quoted)
out = {"total": total, "nq": NQ, "target": TARGET * 100, "substantialPp": SUBSTANTIAL_PP, "scenarios": {}}
for k, d in R.items():
    slim = {x: v for x, v in d.items() if x not in ("prePct", "postPct", "names", "ids")}
    top = sorted(zip(d["names"], d["ids"], d["change"]), key=lambda t: (-t[2], t[0]))
    slim["bestLearners"] = top[:3]
    out["scenarios"][k] = slim
(ROOT / "stats.json").write_text(json.dumps(out, indent=1))
for k, d in R.items():
    print(k, d["n"], f"pre {d['avgPre']:.1f} post {d['avgPost']:.1f} gain {d['gainPp']:.1f} rel {d['relative']:.1f} improved {d['improvedPct']:.1f} "
          f"d={d['cohenDz']:.2f} hake={d['hakeGain']:.2f} cats={d['cats']}")
print(sorted(p.name for p in FIG.glob("*.png")))
