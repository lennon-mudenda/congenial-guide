let manifest,
  selectedMode = "timed",
  catSize = "all",
  categoryCache = {},
  exam,
  mode,
  current = 0,
  answers = [],
  revealed = [],
  marked = [],
  timedOut = false,
  totalQuestions = 0,
  totalSeconds = 0,
  left = 0,
  deadline = 0,
  timer;
const $ = (x) => document.getElementById(x);
fetch("questions/manifest.json")
  .then((r) => r.json())
  .then((m) => {
    manifest = m;
    buildLanding();
  })
  .catch(() => {
    $("startError").innerHTML =
      '<p class="error">Couldn\'t load question data. If this file was opened directly (file://), serve it locally instead — e.g. run <code>python -m http.server</code> in this folder and open the printed address.</p>';
  });
function buildSegToggle(container, options, current, onPick) {
  container.innerHTML = "";
  options.forEach(([value, label]) => {
    let b = document.createElement("button");
    b.className = "segOpt" + (value === current ? " active" : "");
    b.dataset.value = value;
    b.textContent = label;
    b.onclick = () => {
      container
        .querySelectorAll(".segOpt")
        .forEach((x) => x.classList.toggle("active", x === b));
      onPick(value);
    };
    container.appendChild(b);
  });
}
function setMode(m) {
  selectedMode = m;
  $("modeExplain").textContent =
    m === "practice"
      ? "Practice — untimed. You get instant right/wrong feedback and an explanation after every answer."
      : "Timed exam — a countdown of 65 seconds per question. No feedback until you submit, then a full breakdown.";
}
function buildLanding() {
  // mode toggle
  buildSegToggle(
    $("modeToggle"),
    [["practice", "Practice"], ["timed", "Timed exam"]],
    selectedMode,
    setMode,
  );
  setMode(selectedMode);
  // category size selector
  buildSegToggle(
    $("catSizeToggle"),
    [["15", "15"], ["30", "30"], ["45", "45"], ["all", "All"]],
    catSize,
    (v) => (catSize = v),
  );
  // full exams
  $("fullExam").innerHTML = "";
  EXAM_TYPES.forEach((t) => {
    let size = examTypeSize(t),
      mins = Math.round((size * t.spq) / 60);
    let card = document.createElement("button");
    card.className = "examTypeCard";
    card.innerHTML =
      "<strong>" + esc(t.name) + "</strong>" +
      "<span class=\"examTypeMeta\">" + size + " questions · " + mins + " min</span>" +
      "<span class=\"examTypeBlurb\">" + esc(t.blurb) + "</span>";
    card.onclick = () => startExamType(t);
    $("fullExam").appendChild(card);
  });
  // by category
  $("byCategory").innerHTML = "";
  manifest.categories.forEach((c) => {
    let card = document.createElement("button");
    card.className = "catCard";
    card.innerHTML =
      "<strong>" + esc(c.name) + "</strong><span>" + c.count + " questions</span>";
    card.onclick = () => startCategory(c.id, c.name);
    $("byCategory").appendChild(card);
  });
  // by topic
  $("byTopic").innerHTML = "";
  manifest.categories.forEach((c) => {
    let d = document.createElement("details");
    d.className = "topicGroup";
    let s = document.createElement("summary");
    s.innerHTML =
      esc(c.name) + " <span class=\"topicGroupCount\">" + c.topics.length + " topics</span>";
    d.appendChild(s);
    let wrap = document.createElement("div");
    wrap.className = "topicList";
    c.topics.forEach((t) => {
      let b = document.createElement("button");
      b.className = "topicRow";
      b.innerHTML =
        "<span>" + esc(t.name) + "</span><span class=\"topicRowCount\">" + t.count + "</span>";
      b.onclick = () => startTopic(c.id, t.id, c.name + " · " + t.name);
      wrap.appendChild(b);
    });
    d.appendChild(wrap);
    $("byTopic").appendChild(d);
  });
}
function loadCategory(id) {
  if (categoryCache[id]) return Promise.resolve(categoryCache[id]);
  let c = manifest.categories.find((x) => x.id === id);
  return fetch("questions/" + c.file)
    .then((r) => r.json())
    .then((qs) => (categoryCache[id] = qs));
}
function loadAll() {
  return Promise.all(manifest.categories.map((c) => loadCategory(c.id)));
}
const EXAM_TYPES = [
  {
    id: "blitz",
    name: "Speed Blitz",
    spq: 60,
    composition: {
      "swift-language": 8,
      swiftui: 3,
      debugging: 2,
      "planning-design": 1,
      "xcode-navigation": 1,
    },
    blurb: "Fast pace — 60s per question, language-heavy.",
  },
  {
    id: "standard",
    name: "Standard Exam",
    spq: 65,
    size: 45,
    blurb: "Exam weighting across all five domains.",
  },
  {
    id: "marathon",
    name: "Marathon",
    spq: 65,
    size: 85,
    blurb: "The full endurance run at exam weighting.",
  },
];
function examTypeSize(t) {
  return t.size || Object.values(t.composition).reduce((a, b) => a + b, 0);
}
function assembleWeighted(size) {
  let picks = [];
  manifest.categories.forEach((c) => {
    let pool = categoryCache[c.id].slice();
    shuffle(pool);
    picks.push(...pool.slice(0, Math.round((size * c.weight) / 100)));
  });
  if (picks.length > size) {
    shuffle(picks);
    picks = picks.slice(0, size);
  } else if (picks.length < size) {
    let rest = manifest.categories
      .flatMap((c) => categoryCache[c.id])
      .filter((q) => !picks.includes(q));
    shuffle(rest);
    picks.push(...rest.slice(0, size - picks.length));
  }
  return shuffle(picks);
}
function assembleComposition(comp) {
  let picks = [];
  Object.entries(comp).forEach(([catId, n]) => {
    let pool = (categoryCache[catId] || []).slice();
    shuffle(pool);
    picks.push(...pool.slice(0, n));
  });
  return shuffle(picks);
}
function startExamType(t) {
  loadAll().then(() => {
    let qs = t.composition
      ? assembleComposition(t.composition)
      : assembleWeighted(t.size);
    startExam(qs, t.name, t.spq);
  });
}
function startCategory(id, name) {
  loadCategory(id).then((qs) => {
    let pool = qs.slice();
    let cap = parseInt(catSize, 10);
    if (!isNaN(cap) && pool.length > cap) {
      shuffle(pool);
      pool = pool.slice(0, cap);
    }
    startExam(pool, name);
  });
}
function startTopic(catId, topicId, label) {
  loadCategory(catId).then((qs) =>
    startExam(qs.filter((q) => q.topicId === topicId), label),
  );
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function prepQuestions(src) {
  let qs = JSON.parse(JSON.stringify(src));
  qs.forEach((q) => {
    let order = shuffle(q.options.map((_, i) => i));
    q.options = order.map((i) => q.options[i]);
    q.answer = order.indexOf(q.answer);
  });
  return shuffle(qs);
}
function startExam(qs, title, spq) {
  if (!qs.length) return;
  exam = { title: title, questions: prepQuestions(qs) };
  mode = selectedMode;
  totalQuestions = exam.questions.length;
  totalSeconds = (spq || manifest.settings.secondsPerQuestion) * totalQuestions;
  answers = Array(totalQuestions).fill(null);
  revealed = Array(totalQuestions).fill(false);
  marked = Array(totalQuestions).fill(false);
  timedOut = false;
  current = 0;
  $("start").classList.add("hidden");
  $("reviewPage").classList.add("hidden");
  $("exam").classList.remove("hidden");
  $("title").textContent =
    title + (mode === "practice" ? " — Practice" : " — Timed");
  clearInterval(timer);
  window.onbeforeunload = () => "";
  if (mode === "timed") {
    $("timer").classList.remove("hidden");
    deadline = Date.now() + totalSeconds * 1000;
    tick();
    timer = setInterval(tick, 1000);
  } else {
    $("timer").classList.add("hidden");
  }
  render();
}
function tick() {
  left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
  clock();
  if (left <= 0) {
    clearInterval(timer);
    openReview(true);
  }
}
function clock() {
  let m = Math.floor(left / 60),
    s = left % 60;
  $("timer").textContent =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function render() {
  let x = exam.questions[current];
  $("num").textContent = "Question " + (current + 1) + " of " + totalQuestions;
  $("q").innerHTML = renderRich(x.question);
  $("progress").style.width = ((current + 1) / totalQuestions) * 100 + "%";
  $("opts").innerHTML = "";
  let locked = mode === "practice" && revealed[current];
  x.options.forEach((o, i) => {
    let l = document.createElement("label");
    l.className = "opt";
    if (locked) {
      if (i === x.answer) l.classList.add("correct");
      else if (answers[current] === i) l.classList.add("incorrect");
    }
    l.innerHTML =
      '<input type="radio" name="a" value="' +
      i +
      '" ' +
      (answers[current] === i ? "checked" : "") +
      (locked ? " disabled" : "") +
      "> " +
      fmt(o);
    l.querySelector("input").onchange = (e) => {
      answers[current] = +e.target.value;
      if (mode === "practice") {
        revealed[current] = true;
        render();
      }
    };
    $("opts").appendChild(l);
  });
  if (locked) {
    $("explain").innerHTML = "<strong>Explanation:</strong> " + fmt(x.explanation);
    $("explain").classList.remove("hidden");
  } else {
    $("explain").innerHTML = "";
    $("explain").classList.add("hidden");
  }
  $("markBtn").textContent = marked[current]
    ? "★ Marked for review"
    : "☆ Mark for review";
  $("markBtn").classList.toggle("active", marked[current]);
  $("prev").disabled = current === 0;
  $("next").textContent = current === totalQuestions - 1 ? "Review →" : "Next";
}
function esc(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function fmt(s) {
  return esc(s)
    .split("`")
    .map((p, i) => (i % 2 ? "<code>" + p + "</code>" : p))
    .join("");
}
const SWIFT_KEYWORDS = new Set([
  "func", "var", "let", "class", "struct", "enum", "protocol", "extension",
  "if", "else", "guard", "switch", "case", "default", "for", "while", "repeat",
  "return", "throw", "throws", "rethrows", "try", "catch", "do", "in", "break",
  "continue", "defer", "mutating", "private", "public", "internal",
  "fileprivate", "static", "final", "override", "init", "deinit", "self",
  "Self", "nil", "true", "false", "import", "where", "is", "as", "some", "any",
  "weak", "unowned", "lazy", "willSet", "didSet", "newValue", "oldValue",
  "indirect", "associatedtype", "typealias", "subscript", "inout",
  "convenience", "required", "optional", "get", "set", "open", "operator",
  "precedencegroup", "dynamic", "associativity", "async", "await", "actor",
]);
function highlightSwift(code) {
  let tokenRe =
    /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|(@[A-Za-z_][A-Za-z0-9_]*)|(\$[A-Za-z0-9_]+)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  let out = "",
    last = 0,
    m;
  while ((m = tokenRe.exec(code))) {
    out += esc(code.slice(last, m.index));
    let [, comment, str, num, attr, closureArg, word] = m;
    if (comment) out += '<span class="tok-comment">' + esc(comment) + "</span>";
    else if (str) out += '<span class="tok-string">' + esc(str) + "</span>";
    else if (num) out += '<span class="tok-number">' + esc(num) + "</span>";
    else if (attr) out += '<span class="tok-keyword">' + esc(attr) + "</span>";
    else if (closureArg) out += '<span class="tok-type">' + esc(closureArg) + "</span>";
    else if (SWIFT_KEYWORDS.has(word))
      out += '<span class="tok-keyword">' + esc(word) + "</span>";
    else if (/^[A-Z]/.test(word))
      out += '<span class="tok-type">' + esc(word) + "</span>";
    else out += esc(word);
    last = tokenRe.lastIndex;
  }
  out += esc(code.slice(last));
  return out;
}
function splitQuestion(text) {
  if (text.includes("```")) {
    let first = text.indexOf("```");
    let second = text.indexOf("```", first + 3);
    let before = text.slice(0, first).trim();
    let code = text
      .slice(first + 3, second)
      .replace(/^\n/, "")
      .replace(/\n$/, "");
    let after = text.slice(second + 3).trim();
    let segs = [];
    if (before) segs.push({ type: "text", content: before });
    segs.push({ type: "code", content: code });
    if (after) segs.push({ type: "text", content: after });
    return segs;
  }
  let paras = text.split("\n\n");
  let segs = [{ type: "text", content: paras[0] }];
  for (let i = 1; i < paras.length; i++) {
    let p = paras[i];
    let looksProse = p.trim().endsWith("?") && !p.includes("{") && !p.includes("}");
    let type = looksProse ? "text" : "code";
    let last = segs[segs.length - 1];
    if (last.type === type) last.content += "\n\n" + p;
    else segs.push({ type, content: p });
  }
  return segs;
}
function renderRich(text) {
  return splitQuestion(text)
    .map((seg) =>
      seg.type === "code"
        ? '<pre class="codeblock"><code>' + highlightSwift(seg.content) + "</code></pre>"
        : '<div class="qtext">' + fmt(seg.content) + "</div>",
    )
    .join("");
}
function previewText(text) {
  let firstText = splitQuestion(text).find((s) => s.type === "text");
  let t = (firstText ? firstText.content : text)
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 110 ? t.slice(0, 110) + "…" : t;
}
function goToQuestion(i) {
  current = i;
  $("reviewPage").classList.add("hidden");
  $("exam").classList.remove("hidden");
  render();
}
function openReview(fromTimeout) {
  if (fromTimeout) timedOut = true;
  $("reviewTitle").textContent = timedOut
    ? "Time expired — review"
    : "Review your answers";
  $("reviewAll").disabled = timedOut;
  $("reviewGrid").innerHTML = "";
  exam.questions.forEach((x, i) => {
    let b = document.createElement("button");
    b.className =
      "rq " + (answers[i] !== null ? "rq-ans" : "rq-un") + (marked[i] ? " rq-marked" : "");
    b.textContent = i + 1;
    b.disabled = timedOut;
    b.onclick = () => goToQuestion(i);
    $("reviewGrid").appendChild(b);
  });
  $("exam").classList.add("hidden");
  $("reviewPage").classList.remove("hidden");
}
function quitExam() {
  if (
    confirm(
      "Quit this exam? Your progress will be lost and no results will be shown.",
    )
  ) {
    clearInterval(timer);
    window.onbeforeunload = null;
    location.reload();
  }
}
$("prev").onclick = () => {
  if (current) {
    current--;
    render();
  }
};
$("next").onclick = () => {
  if (current < totalQuestions - 1) {
    current++;
    render();
  } else {
    openReview(false);
  }
};
$("reviewBtn").onclick = () => openReview(false);
$("markBtn").onclick = () => {
  marked[current] = !marked[current];
  render();
};
$("reviewAll").onclick = () => {
  if (!timedOut) goToQuestion(0);
};
$("reviewSubmit").onclick = () => finish(timedOut);
$("quit").onclick = quitExam;
$("reviewQuit").onclick = quitExam;
// --- Calculator ---
let calcExpr = "";
const CALC_KEYS = [
  "C", "←", "(", ")",
  "7", "8", "9", "÷",
  "4", "5", "6", "×",
  "1", "2", "3", "-",
  "0", ".", "%", "+",
  "=",
];
const CALC_OPS = "+-×÷";
function calcRender() {
  $("calcDisplay").value = calcExpr === "" ? "0" : calcExpr;
}
function calcLastNumber(s) {
  let parts = s.split(/[+\-×÷()]/);
  return parts[parts.length - 1];
}
function calcOpenParens(s) {
  return (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
}
function calcInput(k) {
  let lastChar = calcExpr.slice(-1);
  if (k === "C") calcExpr = "";
  else if (k === "←") calcExpr = calcExpr === "Error" ? "" : calcExpr.slice(0, -1);
  else if (k === "=") {
    try {
      let e = calcExpr.replace(/[+\-×÷]$/, "");
      e += ")".repeat(Math.max(0, calcOpenParens(e))); // auto-close open brackets
      e = e.replace(/×/g, "*").replace(/÷/g, "/");
      if (e === "" || !/^[-0-9+\-*/.()]+$/.test(e)) throw 0;
      let r = Function('"use strict";return (' + e + ")")();
      calcExpr = !isFinite(r) ? "Error" : String(Math.round(r * 1e10) / 1e10);
    } catch (_) {
      calcExpr = "Error";
    }
  } else if (k === "(") {
    if (calcExpr === "Error") calcExpr = "";
    if (calcExpr === "" || CALC_OPS.includes(lastChar) || lastChar === "(")
      calcExpr += "(";
  } else if (k === ")") {
    if (
      calcOpenParens(calcExpr) > 0 &&
      (lastChar === ")" || /[0-9.]/.test(lastChar))
    )
      calcExpr += ")";
  } else if (k === "%") {
    // apply immediately to the trailing number (postfix "/100"), guardrail against dangling ops
    let seg = calcLastNumber(calcExpr);
    if (seg !== "" && !CALC_OPS.includes(lastChar)) {
      calcExpr =
        calcExpr.slice(0, calcExpr.length - seg.length) +
        String(parseFloat(seg) / 100);
    }
  } else if (k === ".") {
    if (calcExpr === "Error") calcExpr = "";
    if (calcExpr === "" || CALC_OPS.includes(lastChar) || lastChar === "(")
      calcExpr += "0.";
    else if (!calcLastNumber(calcExpr).includes(".")) calcExpr += ".";
    // otherwise the current number already has a decimal — ignore
  } else if (CALC_OPS.includes(k)) {
    if (calcExpr === "Error") calcExpr = "";
    if (calcExpr === "" || lastChar === "(") {
      if (k === "-") calcExpr += "-"; // allow a leading negative only
    } else if (CALC_OPS.includes(lastChar)) {
      calcExpr = calcExpr.slice(0, -1) + k; // replace a trailing operator, never stack
    } else {
      calcExpr += k;
    }
  } else {
    // digit
    if (calcExpr === "Error") calcExpr = "";
    calcExpr += k;
  }
  calcRender();
}
function buildCalc() {
  $("calcKeys").innerHTML = "";
  CALC_KEYS.forEach((k) => {
    let b = document.createElement("button");
    b.textContent = k;
    b.className =
      "calcKey" +
      (k === "=" ? " calcEq" : "") +
      ("÷×-+%".includes(k) ? " calcOp" : "") +
      (k === "C" || k === "←" || k === "(" || k === ")" ? " calcFn" : "");
    b.onclick = () => calcInput(k);
    $("calcKeys").appendChild(b);
  });
}
buildCalc();
function openCalc() {
  calcRender();
  $("calcModal").classList.remove("hidden");
}
function closeCalc() {
  $("calcModal").classList.add("hidden");
}
$("calc").onclick = openCalc;
$("calcClose").onclick = closeCalc;
$("calcModal").onclick = (e) => {
  if (e.target === $("calcModal")) closeCalc();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("calcModal").classList.contains("hidden")) closeCalc();
});
// --- Dark mode ---
function currentTheme() {
  return (
    document.documentElement.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem("theme", t);
  } catch (e) {}
  $("themeToggle").textContent = t === "dark" ? "☀️" : "🌙";
}
$("themeToggle").onclick = () =>
  setTheme(currentTheme() === "dark" ? "light" : "dark");
$("themeToggle").textContent = currentTheme() === "dark" ? "☀️" : "🌙";
function donutSVG(correct, incorrect, unanswered, total) {
  let r = 52,
    sw = 16,
    cx = 64,
    cy = 64,
    c = 2 * Math.PI * r,
    gap = 2;
  let allSegs = [
    { v: correct, cls: "seg-correct", label: "Correct" },
    { v: incorrect, cls: "seg-incorrect", label: "Incorrect" },
    { v: unanswered, cls: "seg-unanswered", label: "Unanswered" },
  ];
  let segs = allSegs.filter((s) => s.v > 0);
  let offset = 0;
  let circles = segs
    .map((s) => {
      let dash = Math.max((s.v / total) * c - gap, 0);
      let el =
        '<circle class="' + s.cls + '" cx="' + cx + '" cy="' + cy + '" r="' + r +
        '" fill="none" stroke-width="' + sw +
        '" stroke-dasharray="' + dash + " " + (c - dash) +
        '" stroke-dashoffset="' + -offset + '" transform="rotate(-90 ' + cx + " " + cy + ')"/>';
      offset += (s.v / total) * c;
      return el;
    })
    .join("");
  let pct = Math.round((correct / total) * 100);
  let legend = allSegs
    .map(
      (s) =>
        '<div class="donutLegendRow"><i class="donutKey ' + s.cls + '"></i>' +
        s.label + " " + s.v + "</div>",
    )
    .join("");
  return (
    '<div class="donutWrap"><svg viewBox="0 0 128 128" width="150" height="150" role="img" aria-label="' +
    correct + " correct, " + incorrect + " incorrect, " + unanswered +
    " unanswered, out of " + total + '">' +
    '<circle class="donutTrack" cx="' + cx + '" cy="' + cy + '" r="' + r +
    '" fill="none" stroke-width="' + sw + '"/>' +
    circles +
    '<text class="donutPct" x="' + cx + '" y="' + (cy - 2) +
    '" text-anchor="middle" font-size="24" font-weight="800">' + pct + "%</text>" +
    '<text class="donutSub" x="' + cx + '" y="' + (cy + 18) +
    '" text-anchor="middle" font-size="11">' + correct + " / " + total + "</text>" +
    "</svg><div class=\"donutLegend\">" + legend + "</div></div>"
  );
}
function finish(auto) {
  if (!auto) {
    let n = answers.filter((x) => x === null).length;
    if (n && !confirm(n + " unanswered question(s). Submit anyway?")) return;
  }
  clearInterval(timer);
  window.onbeforeunload = null;
  let score = 0,
    topics = {};
  exam.questions.forEach((x, i) => {
    let ok = answers[i] === x.answer;
    if (ok) score++;
    let key = x.category || x.topic;
    topics[key] ??= { c: 0, t: 0 };
    topics[key].t++;
    if (ok) topics[key].c++;
  });
  $("resultTitle").textContent = auto ? "Time expired — Results" : "Results";
  let incorrect = answers.filter((a, i) => a !== null && a !== exam.questions[i].answer).length;
  let unanswered = totalQuestions - score - incorrect;
  $("score").innerHTML = donutSVG(score, incorrect, unanswered, totalQuestions);
  $("breakdown").innerHTML =
    "<h3>Topic breakdown</h3>" +
    Object.entries(topics)
      .map(([k, v]) => {
        let pct = v.t ? Math.round((v.c / v.t) * 100) : 0;
        return (
          '<div class="topicBar"><div class="topicBarLabel"><span>' +
          esc(k) +
          "</span><strong>" +
          v.c +
          "/" +
          v.t +
          '</strong></div><div class="topicBarTrack"><div class="topicBarFill" style="width:' +
          pct +
          '%"></div></div></div>'
        );
      })
      .join("");
  $("review").innerHTML = "<h3>Question review</h3>";
  exam.questions.forEach((x, i) => {
    let a = answers[i],
      ok = a === x.answer,
      status = a === null ? "unanswered" : ok ? "pass" : "fail",
      label = a === null ? "Unanswered" : ok ? "Correct" : "Incorrect";
    $("review").innerHTML +=
      '<details class="revq ' +
      status +
      '"><summary><span class="revNum">Q' +
      (i + 1) +
      '</span><span class="revPreview">' +
      esc(previewText(x.question)) +
      '</span><strong class="revBadge">' +
      label +
      "</strong></summary>" +
      '<div class="revBody"><div class="revQ">' +
      renderRich(x.question) +
      "</div>" +
      '<p class="revA">Your answer: ' +
      (a === null ? "<em>No answer</em>" : fmt(x.options[a])) +
      "</p>" +
      (ok
        ? ""
        : '<p class="revC">Correct answer: ' + fmt(x.options[x.answer]) + "</p>") +
      '<p class="revE">' +
      fmt(x.explanation) +
      "</p></div></details>";
  });
  $("exam").classList.add("hidden");
  $("reviewPage").classList.add("hidden");
  $("result").classList.remove("hidden");
}
