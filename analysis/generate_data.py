"""Pre/post quiz responses for the two awareness scenarios.

Separated from the workbook builder so the behavioural assumptions (how much each
intervention helps, which questions stay hard) live in one reviewable place and
the Excel code only deals with layout and formulas.

"""
import json
import math
import random
from pathlib import Path

SEED = 20261030
LETTERS = "ABCD"
BANK = json.loads((Path(__file__).parent.parent / "quiz-app/data/questions.json").read_text())
TOPIC_LABELS = BANK["topics"]
QUESTIONS = BANK["questions"]

# Baseline difficulty per question (logit scale, higher = harder). Pre and post
# forms of a question share one difficulty so the two forms stay comparable.
DIFFICULTY = {
    "Q01": -0.2, "Q02": 0.1, "Q03": 0.0,
    "Q04": 0.3, "Q05": 0.6, "Q06": -0.3,
    "Q07": 0.4, "Q08": 0.5, "Q09": 0.2,
    "Q10": -0.4, "Q11": -0.1, "Q12": 0.9,
}

# Questions where misconceptions persist: the intervention helps these less.
# The social posts were short and mostly visual, so they stick less than the seminar.
STUBBORN_PENALTY = {"Q05": 0.8, "Q09": 0.9}

SCENARIOS = {
    "Social": dict(
        group="Social Media Campaign", id_prefix="SM", n=47,
        gain_mean=0.55, gain_sd=0.75, stubborn_scale=1.0,
        topic_gain={"whatsapp": 0.25, "phishing": 0.15, "everyday": -0.10, "prevention": 0.05},
    ),
    "Seminar": dict(
        group="In-Person Seminar", id_prefix="SEM", n=43,
        gain_mean=3.25, gain_sd=0.85, stubborn_scale=0.45,
        topic_gain={"whatsapp": 0.05, "phishing": 0.10, "everyday": 0.15, "prevention": 0.20},
    ),
}


FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Arjun", "Rohan", "Karthik", "Siddharth", "Rahul", "Imran", "Harpreet",
    "Manoj", "Suresh", "Vikram", "Nikhil", "Pranav", "Dev", "Ishaan", "Kabir", "Yash", "Varun", "Akash",
    "Harsh", "Tarun", "Mohit", "Zaid", "Aman", "Ravi", "Sandeep", "Venkat", "Ramesh", "Tanvi", "Ananya",
    "Diya", "Isha", "Priya", "Meera", "Kavya", "Sneha", "Pooja", "Neha", "Riya", "Shruti", "Aishwarya",
    "Lakshmi", "Fatima", "Simran", "Divya", "Nandini", "Ritika", "Swati", "Anjali", "Bhavna", "Deepa",
    "Farah", "Jaspreet", "Mahima", "Sanya", "Trisha", "Sunita",
]
LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Menon", "Gupta", "Singh", "Kaur", "Khan", "Joshi",
    "Kulkarni", "Deshmukh", "Mehta", "Shah", "Banerjee", "Chatterjee", "Das", "Bose", "Pillai", "Rao",
    "Naidu", "Chopra", "Kapoor", "Malhotra", "Bhatia", "Agarwal", "Mishra", "Pandey", "Yadav", "Thakur",
    "Ansari", "Siddiqui", "Fernandes", "Gill", "Sandhu", "Hegde", "Shetty", "Bhat", "Jain", "Saxena",
    "Srivastava", "Choudhary", "Sinha", "Mukherjee", "Ghosh",
]


def participant_names(scenario_key):
    """(participant_id, full name) pairs. Uses its own RNG so adding names never shifts the response data."""
    cfg = SCENARIOS[scenario_key]
    rng = random.Random(f"{SEED}-names-{scenario_key}")
    names = set()
    while len(names) < cfg["n"]:
        names.add(f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}")
    ordered = sorted(names, key=lambda _: rng.random())
    return [(f"{cfg['id_prefix']}{i:03d}", ordered[i - 1]) for i in range(1, cfg["n"] + 1)]


def _sigmoid(x):
    return 1 / (1 + math.exp(-x))


def _pick_answer(rng, is_correct, correct_index):
    if is_correct:
        return LETTERS[correct_index]
    wrong = [i for i in range(4) if i != correct_index]
    return LETTERS[rng.choice(wrong)]


def generate(scenario_key):
    """Return {"Pre": rows, "Post": rows}; each row is (participant_id, question_id, letter)."""
    cfg = SCENARIOS[scenario_key]
    rng = random.Random(f"{SEED}-{scenario_key}")
    out = {"Pre": [], "Post": []}
    for i in range(1, cfg["n"] + 1):
        pid = f"{cfg['id_prefix']}{i:03d}"
        ability = rng.gauss(0, 0.9)
        topic_offset = {t: rng.gauss(0, 0.35) for t in TOPIC_LABELS}
        personal_gain = rng.gauss(cfg["gain_mean"], cfg["gain_sd"])
        for q in QUESTIONS:
            base = ability + topic_offset[q["topic"]] - DIFFICULTY[q["id"]]
            gain = (personal_gain + cfg["topic_gain"][q["topic"]] + rng.gauss(0, 0.3)
                    - STUBBORN_PENALTY.get(q["id"], 0) * cfg["stubborn_scale"])
            for stage, form, shift in (("Pre", "a", 0.0), ("Post", "b", gain)):
                correct = rng.random() < _sigmoid(base + shift)
                letter = _pick_answer(rng, correct, q[form]["answer"])
                out[stage].append((pid, q["id"], letter))
    return out


if __name__ == "__main__":
    for key in SCENARIOS:
        data = generate(key)
        for stage, rows in data.items():
            hits = sum(
                LETTERS[next(q for q in QUESTIONS if q["id"] == qid)["a" if stage == "Pre" else "b"]["answer"]] == letter
                for _, qid, letter in rows
            )
            print(f"{key:8} {stage:4} rows={len(rows)} accuracy={hits / len(rows):.1%}")
