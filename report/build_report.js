/**
 * Builds the project report (.docx). All figures and statistics come from stats.json
 * and figures/*.png (written by make_figures.py from the shared response records),
 * so nothing numeric is typed by hand. Items only the team can supply (names, dates,
 * Instagram metrics, interview findings, photos) are highlighted [[placeholders]].
 */
const fs = require("fs");
const path = require("path");
const D = require("docx");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, ImageRun, Footer, PageNumber, NumberFormat, LevelFormat, TableOfContents, PageBreak,
  VerticalAlign, LineRuleType,
} = D;

const STATS = JSON.parse(fs.readFileSync(path.join(__dirname, "stats.json"), "utf8"));
const QBANK = JSON.parse(fs.readFileSync(path.join(__dirname, "../quiz-app/data/questions.json"), "utf8"));
const S = STATS.scenarios.Social, M = STATS.scenarios.Seminar;
const NQ = STATS.nq;
const f1 = (x) => x.toFixed(1), f0 = (x) => Math.round(x).toString();
const pp = (x) => `${x >= 0 ? "+" : ""}${x.toFixed(1)} pp`;
const sign = (x) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}`;

const FONT = "Times New Roman";
const RED = "C81E2D", GREEN = "15803D";
const W = 9026; // A4 content width in DXA with 1-inch margins

// ---------- inline formatting: **bold** and [[placeholder]] ----------
function runs(text, base = {}) {
  return text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/).filter(Boolean).map((part) => {
    if (part.startsWith("**")) return new TextRun({ text: part.slice(2, -2), bold: true, font: FONT, ...base });
    if (part.startsWith("[[")) return new TextRun({ text: `[${part.slice(2, -2)}]`, highlight: "yellow", font: FONT, ...base });
    return new TextRun({ text: part, font: FONT, ...base });
  });
}
const BODY = { size: 24 };
const LINE = { line: 360, lineRule: LineRuleType.AUTO, after: 120 };
const P = (text, o = {}) => new Paragraph({ children: runs(text, { ...BODY, ...(o.run || {}) }), alignment: o.align ?? AlignmentType.LEFT, spacing: { ...LINE, ...(o.spacing || {}) }, keepNext: o.keepNext, indent: o.indent });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: t, font: FONT, size: 32, bold: true, color: RED })], spacing: { after: 240 } });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({ text: t, font: FONT, size: 28, bold: true })], spacing: { before: 240, after: 120 } });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, children: [new TextRun({ text: t, font: FONT, size: 24, bold: true, italics: true })], spacing: { before: 160, after: 80 } });
const bullets = (items) => items.map((t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(t, BODY), alignment: AlignmentType.LEFT, spacing: { line: 340, after: 60 } }));
const numberingConfigs = [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }];
let numCount = 0;
const numbered = (items) => {
  const reference = `num${numCount++}`;
  numberingConfigs.push({ reference, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] });
  return items.map((t) => new Paragraph({ numbering: { reference, level: 0 }, children: runs(t, BODY), alignment: AlignmentType.LEFT, spacing: { line: 340, after: 60 } }));
};

// ---------- tables, figures, placeholders ----------
const tableList = [], figureList = [];
let chapter = 0, figN = 0, tabN = 0;
const startChapter = (n) => { chapter = n; figN = 0; tabN = 0; };
const border = { style: BorderStyle.SINGLE, size: 4, color: "B6BDC7" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (text, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: String(text).split("\n").map((line) => new Paragraph({ alignment: o.align ?? AlignmentType.LEFT, spacing: { line: 252, after: 0 },
    children: runs(line, { size: 20, bold: o.bold, color: o.color }) })),
});
function table(caption, headers, rows, widths, o = {}) {
  tabN++;
  const label = `Table ${chapter}.${tabN}: ${caption}`;
  tableList.push(label);
  const head = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { fill: RED, bold: true, color: "FFFFFF", align: i ? (o.center ? AlignmentType.CENTER : AlignmentType.LEFT) : AlignmentType.LEFT })) });
  const body = rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? "F6F7F9" : undefined, align: i && o.center ? AlignmentType.CENTER : AlignmentType.LEFT })) }));
  return [
    new Paragraph({ keepNext: true, alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, children: [new TextRun({ text: label, font: FONT, size: 22, bold: true })] }),
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] }),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}
const caption = (text) => {
  figN++;
  const label = `Figure ${chapter}.${figN}: ${text}`;
  figureList.push(label);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 240 }, children: [new TextRun({ text: label, font: FONT, size: 22, italics: true })] });
};
function pngSize(file) { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function figure(file, text, widthPx = 600) {
  const full = path.join(__dirname, "figures", file);
  const [w, h] = pngSize(full);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width: widthPx, height: Math.round((widthPx * h) / w) },
      altText: { title: text, description: text, name: file } })] }),
    caption(text),
  ];
}
const SHOT_DIM = { "ig_profile_grid.jpg": [1240, 730], "ig_phishing_carousel.jpg": [1250, 744], "ig_phishing_post.jpg": [1238, 702], "ig_boss_carousel.jpg": [1232, 566],
  "ig_boss_post.jpg": [1248, 694], "ig_friend_link_carousel.jpg": [1230, 844], "ig_prize_carousel.jpg": [1244, 856], "ig_reel_life_savings.jpg": [1102, 852],
  "ig_job_post.jpg": [1216, 840], "ig_reel_phishing.jpg": [1150, 900] };
function shot(file, text, widthPx = 600) {
  const [w, h] = SHOT_DIM[file];
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [new ImageRun({ type: "jpg", data: fs.readFileSync(path.join(__dirname, "photos", file)),
      transformation: { width: widthPx, height: Math.round((widthPx * h) / w) }, altText: { title: text, description: text, name: file } })] }),
    caption(text),
  ];
}
const dash = { style: BorderStyle.DASHED, size: 8, color: "9AA3AF" };
function photoSlot(what, text, heightDxa = 3600) {
  return [
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ height: { value: heightDxa, rule: "atLeast" }, cantSplit: true, children: [new TableCell({
      width: { size: W, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: dash, bottom: dash, left: dash, right: dash },
      shading: { fill: "F3F4F6", type: ShadingType.CLEAR, color: "auto" },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "INSERT IMAGE HERE", font: FONT, size: 22, bold: true, color: "6B7280" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: what, font: FONT, size: 20, color: "6B7280", highlight: "yellow" })] })],
    })] })] }),
    caption(text),
  ];
}
function noteBox(title, text) {
  const edge = { style: BorderStyle.SINGLE, size: 12, color: RED };
  return [new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ children: [new TableCell({
    width: { size: W, type: WidthType.DXA }, shading: { fill: "FDECEE", type: ShadingType.CLEAR, color: "auto" }, margins: { top: 100, bottom: 100, left: 160, right: 160 },
    borders: { top: border, bottom: border, right: border, left: edge },
    children: [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, font: FONT, size: 22, color: RED })] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { line: 300, after: 0 }, children: runs(text, { size: 22 }) })] })] })] }),
    new Paragraph({ spacing: { after: 160 }, children: [] })];
}

// ---------- derived statements (computed, not typed) ----------
const best = (d) => [...d.topics].sort((a, b) => b.gain - a.gain)[0];
const worstGain = (d) => [...d.topics].sort((a, b) => a.gain - b.gain)[0];
const below = (d) => d.questions.filter((q) => q.post < STATS.target).sort((a, b) => a.post - b.post);
const topQ = (d) => [...d.questions].sort((a, b) => b.gain - a.gain)[0];
const lowQ = (d) => [...d.questions].sort((a, b) => a.post - b.post)[0];
const hakeBand = (g) => (g >= 0.7 ? "high" : g >= 0.3 ? "medium" : "low");
const dBand = (d) => (d >= 0.8 ? "large" : d >= 0.5 ? "medium" : "small");
const sBelow = below(S), mBelow = below(M);
const topicName = (t) => t.topic;
const KIND = { chat: "Reply in the chat", url: "Spot the real website", cards: "Pick the safest move", swipe: "Scam or safe? (swipe cards)", redflags: "Tap the red flags", match: "Match the lines", order: "Put it in order" };
const TOPIC = QBANK.topics;

// =====================================================================
// FRONT MATTER
// =====================================================================
const centre = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: o.before ?? 0, after: o.after ?? 120 }, children: runs(text, { size: o.size ?? 24, bold: o.bold, color: o.color }) });
const frontTitle = (t, first) => new Paragraph({ pageBreakBefore: !first, alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: t, font: FONT, size: 32, bold: true, color: RED })] });
const cover = [
  centre("[[College name]]", { size: 28, bold: true, before: 800 }),
  centre("[[Department]]", { after: 800 }),
  centre("SENIOR PROJECT REPORT", { size: 26, bold: true, color: RED, after: 360 }),
  centre("Scam Shield", { size: 56, bold: true, after: 120 }),
  centre("A Cybersecurity Awareness Program on WhatsApp Scams, Phishing and Online Fraud", { size: 32, bold: true, after: 600 }),
  centre("Submitted by", { bold: true }),
  centre("[[Student name 1]]"), centre("[[Student name 2]]"), centre("[[Student name 3]]"), centre("[[Student name 4]]", { after: 360 }),
  centre("Guided by", { bold: true }),
  centre("[[Instructor name]]", { after: 480 }),
  centre("[[Month Year]]", { bold: true }),
];
const front = [
  frontTitle("Acknowledgement", true),
  P("We thank [[instructor name]] for guiding us through this project and the team at Mahindra Tower for hosting our seminar and giving us a place in their training session. [[Add the names of the people who referred you, if you wish.]]"),
  P(`We also thank the ${STATS.total} students and followers who took our quizzes, and everyone who spent a few minutes in our interviews. [[Add anyone else you want to thank.]]`),
  frontTitle("Abstract"),
  P("Many people lose money to scams that arrive through WhatsApp, SMS and phone calls. This project built a security awareness program called **Scam Shield** for college students and young adults. It teaches four topics: WhatsApp scams, phishing, everyday online fraud and how to stay safe."),
  P("We ran the program in two ways: an Instagram campaign and a short in-person seminar. We built an interactive quiz and used it before and after each program to see what people learned."),
  P(`The social media group (${S.n} people) improved from ${f1(S.avgPre)}% to ${f1(S.avgPost)}% on average. The seminar group (${M.n} students) improved from ${f1(M.avgPre)}% to ${f1(M.avgPost)}%. The report ends with what worked, what was hard and what we would do next.`),
];
const tocFront = [
  frontTitle("Contents"),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "In Word, right-click the contents and choose Update Field to fill in page numbers.", font: FONT, size: 18, italics: true, color: "6B7280" })] }),
];

// =====================================================================
// BODY
// =====================================================================
const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));
const topicsOf = (d, f) => d.topics.map((t) => t.topic);

// ---- Chapter 1
startChapter(1);
add(H1("Chapter 1: Introduction"));
add(H2("1.1 Background"),
  P("Phones, WhatsApp and UPI are part of daily life, and scammers use the same tools. A fake message, a call from a fake officer or a copy of a real website is often enough to make someone share an OTP or send money. These scams work because they create fear and hurry, not because of a technical weakness. That is why people need to be taught what to look for."));
add(H2("1.2 Objectives"), ...bullets([
  "Design a security awareness program on scams for a specific audience.",
  "Deliver it through Instagram and through an in-person seminar.",
  "Test people before and after the program with the same kind of quiz.",
  `Use more than 30 participants in each group (we had ${S.n} and ${M.n}).`,
  "Compare the results and say what should be improved.",
]));
add(H2("1.3 Target audience"),
  P("College students and young adults who use WhatsApp, Instagram and UPI every day. They are also the people who explain these apps to their parents and grandparents."));

// ---- Chapter 2
startChapter(2);
add(H1("Chapter 2: Program Design"));
add(H2("2.1 What we taught"),
  ...table("The four topics", ["Topic", "What people learn"], [
    ["WhatsApp scams", "Fake delivery messages, fake family members, stolen verification codes, fake jobs and investment groups"],
    ["Phishing", "Lookalike websites, QR code tricks, and OTP theft over the phone"],
    ["Everyday online fraud", "UPI collect-request tricks, remote-access apps, digital arrest calls, and fake prize offers"],
    ["Staying safe", "Warning signs, checking who is really calling, and how to report (1930 and cybercrime.gov.in)"],
  ], [2400, 6626]));
add(H2("2.2 Instagram campaign"),
  P("We ran the campaign on Instagram as **Cyber Jaagrukta Mohim** (@cyberjaagrukta), and every post carries the line \"Trust Nothing. Verify Everything.\" We published 8 posts: four carousels, two single posts and two reels, each on one scam."),
  ...table("Posts published", ["Scam", "Format", "Main message"], [
    ["Phishing emails", "Carousel, 8 slides", "\"Looks real? Would you click?\" How a fake \"account suspended\" email works and how to spot it"],
    ["Phishing emails", "Reel", "\"Your account will be suspended in 10 minutes! Would you panic?\""],
    ["Boss impersonation", "Carousel, 3 slides", "\"Your boss just texted. Or did they?\" Authority, urgency and secrecy; pause, verify, follow the process"],
    ["Hacked friend account", "Carousel, 5 slides", "\"What if your friend is the next link in the attack?\" A familiar name does not make a link safe"],
    ["Fake prizes", "Carousel, 5 slides", "\"Congratulations! You've won nothing.\" Five signs a prize is a scam"],
    ["Fake jobs", "Post", "\"Dream job or trap?\" Red flags such as paying a fee to get hired"],
    ["Delivery OTP scam", "Post", "\"Expecting a delivery? OTP bhi aapka?\" Fake delivery agents asking for your OTP"],
    ["Targeted psychological scams", "Reel", "How scammers target people's fears, and how to protect your savings"],
  ], [2300, 1900, 4826]),
  P("The posts follow the same pattern. Each shows a realistic fake message, labels the red flags, and ends with what to do and a call to comment, save or share. They use one dark design and one slogan so they are easy to recognise, and one post uses Hinglish (\"OTP bhi aapka?\") to sound closer to everyday speech. The graphics were created with AI tools, so Instagram marks the posts as \"AI content\"."),
  ...shot("ig_profile_grid.jpg", "The Cyber Jaagrukta Mohim profile: 8 posts and 61 followers", 600),
  P("More screenshots of the posts are in Appendix A."));
add(H2("2.3 In-person seminar"),
  P("The seminar was held at Mahindra Tower for students. The organisation there was running a training session, and we got a 10-minute slot in it through referrals. With so little time, we kept only the most important points."),
  ...table("Seminar plan (10-minute slot)", ["Time", "Activity"], [
    ["2 min", "Why scams work: fear, hurry and trust"],
    ["5 min", "Live demo of a fake bank call and a digital arrest call, with the one rule to remember for each"],
    ["2 min", "How to report a scam: 1930 and cybercrime.gov.in"],
    ["1 min", "Link to the quiz"],
  ], [1800, 7226]),
  P("[[Adjust this plan to what you actually covered, and say when the before-quiz and after-quiz were taken.]]"));
add(H2("2.4 The quiz"),
  P("We built a web quiz that people can finish in a few minutes. It asks only for a name. It has 12 questions (3 for each topic) and gives a short explanation after every answer, so people learn as they go. To keep it fun, the questions use different styles:"),
  ...bullets([
    "**Match the lines:** connect a scammer's line to the right response.",
    "**Scam or safe:** swipe cards left or right.",
    "**Tap the red flags:** tap the suspicious parts of a message.",
    "**Put it in order:** arrange the steps in the right order.",
    "**Chat, website and multiple choice** questions.",
  ]),
  P("The before-quiz and after-quiz test the same things but use different scenarios, so people cannot just remember their old answers."));
add(...photoSlot("Screenshots of the quiz: start page and two question styles", "The Scam Shield quiz"));
add(H2("2.5 Timeline"),
  ...table("Project timeline", ["Phase", "What we did", "Dates"], [
    ["Plan", "Chose topic and audience, set goals", "[[dates]]"],
    ["Build", "Wrote content, built the quiz, planned the posts", "[[dates]]"],
    ["Before", "Pre-quiz for both groups", "[[dates]]"],
    ["Run", "Instagram campaign and the seminar", "[[dates]]"],
    ["After", "Post-quiz and interviews", "[[dates]]"],
    ["Report", "Analysed results and wrote this report", "[[dates]]"],
  ], [1600, 5426, 2000]));

// ---- Chapter 3
startChapter(3);
add(H1("Chapter 3: Implementation"));
add(H2("3.1 Who took part"),
  P(`The Instagram group had ${S.n} followers. The seminar group had ${M.n} students from [[class or department]]. Everyone took the quiz before and after, and each person's two results were matched, so we could see how each person changed.`));
add(H2("3.2 Before the program"),
  P("Everyone took the before-quiz first. Followers got a link on Instagram on [[date]], and seminar students took it on their phones at the start of the session on [[date]]. [[Explain how the quizzes were fitted around the 10-minute slot.]]"));
add(H2("3.3 Instagram campaign"),
  P("The posts were published in October 2026; the dates visible on the posts run from 9 to 18 October. Each post showed a fake scam message, labelled the red flags and ended with what to do. We asked followers to comment, save and share. [[Mention anything that went differently from the plan, and the date of the last post.]]"),
  ...shot("ig_phishing_post.jpg", "The phishing carousel, with 51 likes and 5 comments", 600),
  ...shot("ig_boss_post.jpg", "The boss-impersonation carousel, with 65 likes and 7 comments", 600));
add(H2("3.4 Seminar"),
  P("The seminar was held at Mahindra Tower on [[date]]. We got a 10-minute slot in a training session there through referrals, and used it for the key rules and the live demo of a fake bank call. [[Add which part got the most reaction.]]"));
add(...photoSlot("Photos from the seminar", "The in-person seminar"));
add(H2("3.5 After the program"),
  P("Everyone took the after-quiz, which tests the same ideas with new scenarios. Followers took it after the campaign on [[date]], and seminar students took it at the end of the session."));
add(H2("3.6 Interviews and feedback"),
  P("We talked to [[number]] participants for about five minutes each and also read comments and messages on Instagram. The questions are in Appendix B."));
add(...photoSlot("Photos of the in-person interviews (with permission)", "Interviews with participants"));
add(H2("3.7 Tools and data"),
  P("The quiz was built with Next.js. All answers are kept in an Excel workbook that calculates the scores, and a web dashboard shows the same results as charts. The charts in this report use the same data."));
add(...noteBox("Note on the data", `The answers in the workbook were produced with a simple model (Appendix C) so that the workbook, dashboard and this report could be built and tested. [[Before submitting, replace them with the answers collected from your real participants and re-run the build. Then re-read Chapter 4, because the numbers will change.]]`));

// ---- Chapter 4
startChapter(4);
add(H1("Chapter 4: Results"));
add(H2("4.1 How we scored"),
  P(`Each quiz has ${NQ} questions, so one point is about 8 percentage points. We compared each person's before and after score. "Improved a lot" means 3 or more extra correct answers.`));
add(H2("4.2 Overall results"),
  ...table("Before and after", ["", "Instagram campaign", "Seminar"], [
    ["Participants", `${S.n}`, `${M.n}`],
    ["Average before", `${f1(S.avgPre)}%`, `${f1(M.avgPre)}%`],
    ["Average after", `${f1(S.avgPost)}%`, `${f1(M.avgPost)}%`],
    ["Improvement", pp(S.gainPp), pp(M.gainPp)],
    ["People who improved", `${f1(S.improvedPct)}%`, `${f1(M.improvedPct)}%`],
  ], [3600, 2713, 2713], { center: true }),
  P(`Both programs worked, even though the seminar was only a 10-minute session. The Instagram group gained ${f1(S.gainPp)} points and the seminar group gained ${f1(M.gainPp)} points. (Here "pp" means percentage points, the plain difference between the after and before scores.)`),
  ...figure("fig_avg_scores.png", "Average score before and after", 480));
add(H2("4.3 Results by topic"),
  P(`On Instagram, **${best(S).topic}** improved most (${pp(best(S).gain)}) and **${worstGain(S).topic}** improved least (${pp(worstGain(S).gain)}). In the seminar, **${best(M).topic}** improved most (${pp(best(M).gain)}), and all four topics improved a lot.`),
  ...figure("fig_topic_accuracy.png", "Score by topic, before and after", 600));
add(H2("4.4 Who improved"),
  ...figure("fig_categories.png", "How many people improved (numbers show people)", 540),
  P(`On Instagram, ${S.cats.Substantial + S.cats.Modest} of ${S.n} people improved, ${S.cats.Unchanged} stayed the same and ${S.cats.Lower} scored lower. In the seminar, ${M.cats.Substantial + M.cats.Modest} of ${M.n} improved, ${M.cats.Unchanged} stayed the same and ${M.cats.Lower} scored lower. With only 12 questions, small ups and downs are partly luck.`));
add(H2("4.5 Which questions need more teaching"),
  P(`We marked a question as "needs more teaching" if fewer than 60% got it right after the program. After Instagram, ${sBelow.length} of ${NQ} questions were below that line, the lowest being ${sBelow.slice(0, 3).map((q) => `${q.objective.toLowerCase()} (${f0(q.post)}%)`).join(", ")}. After the seminar, ${mBelow.length === 0 ? "none were below it" : `${mBelow.length} was below it`}. Red bars below show these questions.`),
  ...figure("fig_question_level.png", "Improvement for each question (red = still below 60% after)", 620));
add(H2("4.6 Instagram engagement"),
  P("At the time of our screenshots the account had 8 posts and 61 followers. Likes and comments below are as shown on each post; counts for the other posts can be added from the app."),
  ...table("Likes and comments per post", ["Post", "Date", "Likes", "Comments"], [
    ["Phishing carousel", "9 Oct 2026", "51", "5"],
    ["Boss-impersonation carousel", "10 Oct 2026", "65", "7"],
    ["Phishing reel", "18 Oct 2026", "83", "7"],
    ["Fake jobs post", "[[date]]", "49", "3"],
    ["Reel: targeted psychological scams", "[[date]]", "45", "2"],
    ["Hacked friend account carousel", "[[date]]", "[[likes]]", "[[comments]]"],
    ["Fake prizes carousel", "[[date]]", "[[likes]]", "[[comments]]"],
    ["Delivery OTP post", "[[date]]", "[[likes]]", "[[comments]]"],
  ], [4000, 1900, 1563, 1563], { center: true }),
  P(`The five posts with visible counts together received ${51 + 65 + 83 + 49 + 45} likes and ${5 + 7 + 7 + 3 + 2} comments. The phishing reel did best (83 likes). [[Add reach, shares, saves and quiz-link clicks from Instagram Insights.]]`),
  ...photoSlot("Screenshot of Instagram Insights (reach, interactions, top posts)", "Instagram Insights"));
add(H2("4.7 What people told us"),
  P("[[Write 3 to 4 sentences about the main things people said in the interviews and comments: what helped, what was confusing, and what they will do differently. Add one or two short quotes with permission.]]"));
add(H2("4.8 Dashboard"),
  P("The dashboard lets organisers switch between Instagram and the seminar, see before and after results, and filter by topic."));
add(...photoSlot("Screenshot of the dashboard", "The analytics dashboard"));

// ---- Chapter 5
startChapter(5);
add(H1("Chapter 5: Discussion and Recommendations"));
add(H2("5.1 What worked"), ...bullets([
  "Both groups improved, and each group had more than 30 people.",
  "The quiz was short and fun, and the explanations taught people while they played.",
  "Different questions for before and after meant people could not just copy their earlier answers.",
  "Using Instagram and a seminar together showed what each does well: Instagram reaches many people, and the seminar teaches more deeply.",
]));
add(H2("5.2 Challenges"), ...bullets([
  "Short posts get attention but cannot explain why a trick works.",
  "Instagram followers are anonymous, so we gave each person an automatic ID stored in their browser to match their two quizzes.",
  "Writing two equal-difficulty versions of every question took several tries.",
  "The Instagram account was new (61 followers), so the campaign could only reach a small audience.",
  "The seminar slot was only 10 minutes, so we had to choose the few most important rules and leave the rest out.",
  "Some people took the before-quiz but never came back for the after-quiz. [[Add your own challenges.]]",
]));
add(H2("5.3 Lessons learned"), ...bullets([
  "Teach one clear rule per post, for example \"an OTP never cancels a payment\".",
  "Practise what to do, not only what to spot.",
  "Plan how you will measure the program before you make the content.",
  "When time is short, teach only the few most important rules.",
]));
add(H2("5.4 Limits"), ...bullets([
  "The two groups were different kinds of people and were not chosen at random, so the comparison between Instagram and the seminar is a rough guide only.",
  "The seminar lasted only 10 minutes and ran inside another organisation's training session, so conditions were different from the Instagram group's.",
  "We tested right after the program, not months later.",
  "We assumed the before and after quizzes were equally hard; we did not test this separately.",
]));
add(H2("5.5 Recommendations"), ...numbered([
  `Make more content on the topics that stayed low, such as ${sBelow.slice(0, 3).map((q) => q.objective.toLowerCase()).join(", ")}.`,
  "Teach digital arrest with one rule: no agency arrests or questions anyone over a video call. Hang up and call a family member or 1930.",
  "Use both channels: Instagram to reach people, then a short live session or Q&A to teach more deeply.",
  "Send a short quiz again after a few weeks to see what people remember.",
  "Make versions in regional languages that parents and grandparents can follow.",
]));

// ---- Chapter 6
startChapter(6);
add(H1("Chapter 6: Conclusion"));
add(P(`We built and tested a scam awareness program using Instagram, a seminar and an interactive quiz. Scores rose from ${f1(S.avgPre)}% to ${f1(S.avgPost)}% for the Instagram group and from ${f1(M.avgPre)}% to ${f1(M.avgPost)}% for the seminar group. The seminar gained more, and the Instagram campaign showed which topics still need work.`));
add(P("No program stops every scam, but practising the right response gives people something to remember when a suspicious message or call arrives. We hope other groups can reuse Scam Shield."));

// ---- References
const refs = [
  "National Cyber Crime Reporting Portal, Government of India. https://cybercrime.gov.in (helpline 1930).",
  "Wilson, M., & Hash, J. (2003). *Building an Information Technology Security Awareness and Training Program* (NIST Special Publication 800-50). National Institute of Standards and Technology.",
  "WhatsApp Help Center. Two-step verification. https://faq.whatsapp.com",
];
const refParas = refs.map((r) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 320, after: 120 }, indent: { left: 540, hanging: 540 },
  children: r.split(/(\*[^*]+\*)/).filter(Boolean).map((t) => t.startsWith("*") ? new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, size: 24 }) : new TextRun({ text: t, font: FONT, size: 24 })) }));
add(H1("References"), ...refParas, P("[[Add any other sources you used.]]"));

// ---- Appendices
add(H1("Appendix A: Instagram Posts"));
startChapter("A");
add(P("These screenshots show the posts as published. All carry the slogan \"Trust Nothing. Verify Everything.\""));
add(...shot("ig_phishing_carousel.jpg", "Phishing carousel (8 slides): how a fake email works and how to stay safe", 600),
  ...shot("ig_boss_carousel.jpg", "Boss-impersonation carousel (3 slides): pause, verify, follow the process", 600),
  ...shot("ig_friend_link_carousel.jpg", "Hacked friend account carousel (5 slides)", 600),
  ...shot("ig_prize_carousel.jpg", "Fake prize carousel (5 slides)", 600),
  ...shot("ig_job_post.jpg", "Fake job post: \"Dream job or trap?\" with 49 likes and 3 comments", 600),
  ...shot("ig_reel_phishing.jpg", "Phishing reel with 83 likes and 7 comments", 560),
  ...shot("ig_reel_life_savings.jpg", "Reel on targeted psychological scams with 45 likes and 2 comments", 560));
add(H1("Appendix B: Interview Questions"));
add(...numbered([
  "Before the program, how confident were you in spotting a scam? Why?",
  "Which scam was new to you?",
  "What helped you most: the posts, the seminar or the quiz?",
  "Was anything confusing or missing?",
  "What will you do differently next time you get a suspicious message or call?",
]));
add(H1("Appendix C: Quiz Questions and Data Model"));
startChapter("C");
add(...table("The 12 quiz topics", ["ID", "Topic", "What it tests", "Question style"], QBANK.questions.map((q) => [q.id, TOPIC[q.topic], q.objective, KIND[q.kind]]), [700, 2000, 3626, 2700]));
add(P("The full questions, answers and explanations are in the Question_Bank sheet of the Excel workbook. The answers in the workbook were produced with this simple model:"),
  ...bullets([
    "Each person has a random starting skill, and each question has a fixed difficulty.",
    "Each person also has a random amount of improvement, so some improve a lot and some do not.",
    "The seminar is assumed to help more than the Instagram posts on average.",
    "Two questions (QR codes and digital arrest) are assumed to be harder to improve, especially after Instagram.",
    "To use real data, replace the answers in the workbook; everything else recalculates.",
  ]));

// =====================================================================
// ASSEMBLE
// =====================================================================
const pageFooter = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] });
const page = (fmt, start) => ({ page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, pageNumbers: fmt ? { start, formatType: fmt } : undefined } });
const doc = new Document({
  creator: "Scam Shield project team", title: "Scam Shield: A Cybersecurity Awareness Program",
  features: { updateFields: true },
  numbering: { config: numberingConfigs },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 32, bold: true }, paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  sections: [
    { properties: page(), children: cover },
    { properties: page(NumberFormat.LOWER_ROMAN, 1), footers: { default: pageFooter }, children: [...front, ...tocFront] },
    { properties: page(NumberFormat.DECIMAL, 1), footers: { default: pageFooter }, children: body },
  ],
});
Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "..", "Scam_Shield_Project_Report.docx");
  fs.writeFileSync(out, buf);
  console.log("wrote", out, (buf.length / 1024).toFixed(0), "KB;", figureList.length, "figures,", tableList.length, "tables");
});
