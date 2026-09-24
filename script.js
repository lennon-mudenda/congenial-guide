let data,
  exam,
  mode,
  current = 0,
  answers = [],
  revealed = [],
  totalQuestions = 0,
  totalSeconds = 0,
  left = 0,
  deadline = 0,
  timer;
const $ = (x) => document.getElementById(x);
fetch("exams.json")
  .then((r) => r.json())
  .then((d) => {
    data = d;
    $("introMeta").textContent =
      d.settings.totalQuestions +
      " questions • " +
      d.settings.secondsPerQuestion +
      " seconds each • " +
      Math.round(d.settings.totalSeconds / 60) +
      " minutes total (timed mode)";
    d.exams.forEach((e, i) => {
      let row = document.createElement("div");
      row.className = "examRow";
      let name = document.createElement("span");
      name.className = "examName";
      name.textContent = e.title + " — " + d.settings.totalQuestions + " questions";
      let bp = document.createElement("button");
      bp.className = "modeBtn practiceBtn";
      bp.textContent = "Practice";
      bp.onclick = () => start(i, "practice");
      let bt = document.createElement("button");
      bt.className = "modeBtn timedBtn";
      bt.textContent = "Timed Exam";
      bt.onclick = () => start(i, "timed");
      row.append(name, bp, bt);
      $("buttons").appendChild(row);
    });
  })
  .catch(() => {
    let p = document.createElement("p");
    p.className = "error";
    p.innerHTML =
      "Couldn't load exam data. If this file was opened directly (file://), serve it locally instead — e.g. run <code>python -m http.server</code> in this folder and open the printed address.";
    $("start").appendChild(p);
  });
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function prepExam(src) {
  let qs = JSON.parse(JSON.stringify(src.questions));
  qs.forEach((q) => {
    let order = shuffle(q.options.map((_, i) => i));
    q.options = order.map((i) => q.options[i]);
    q.answer = order.indexOf(q.answer);
  });
  shuffle(qs);
  return Object.assign({}, src, { questions: qs });
}
function start(i, m) {
  exam = prepExam(data.exams[i]);
  mode = m;
  totalQuestions = data.settings.totalQuestions;
  totalSeconds = data.settings.totalSeconds;
  answers = Array(totalQuestions).fill(null);
  revealed = Array(totalQuestions).fill(false);
  current = 0;
  $("start").classList.add("hidden");
  $("exam").classList.remove("hidden");
  $("title").textContent =
    exam.title + (mode === "practice" ? " — Practice" : " — Timed Exam");
  $("submit").textContent = mode === "practice" ? "Finish" : "Submit Exam";
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
  if (left <= 0) finish(true);
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
  $("topic").textContent = x.topic;
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
      } else {
        palette();
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
  $("prev").disabled = current === 0;
  $("next").disabled = current === totalQuestions - 1;
  palette();
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
function palette() {
  $("palette").innerHTML = "";
  answers.forEach((a, i) => {
    let b = document.createElement("button");
    b.className = "p " + (a !== null ? "a " : "") + (i === current ? "c" : "");
    b.textContent = i + 1;
    b.onclick = () => {
      current = i;
      render();
    };
    $("palette").appendChild(b);
  });
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
  }
};
$("submit").onclick = () => finish(false);
function donutSVG(correct, incorrect, unanswered, total) {
  let r = 52,
    sw = 16,
    cx = 64,
    cy = 64,
    c = 2 * Math.PI * r,
    gap = 2;
  let segs = [
    { v: correct, color: "#3d6b4f", label: "Correct" },
    { v: incorrect, color: "#8b2f2f", label: "Incorrect" },
    { v: unanswered, color: "#8a94a3", label: "Unanswered" },
  ].filter((s) => s.v > 0);
  let offset = 0;
  let circles = segs
    .map((s) => {
      let dash = Math.max((s.v / total) * c - gap, 0);
      let el =
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
        '" fill="none" stroke="' + s.color + '" stroke-width="' + sw +
        '" stroke-dasharray="' + dash + " " + (c - dash) +
        '" stroke-dashoffset="' + -offset + '" transform="rotate(-90 ' + cx + " " + cy + ')"/>';
      offset += (s.v / total) * c;
      return el;
    })
    .join("");
  let pct = Math.round((correct / total) * 100);
  let legend = segs
    .map(
      (s) =>
        '<div class="donutLegendRow"><i style="background:' + s.color + '"></i>' +
        s.label + " " + s.v + "</div>",
    )
    .join("");
  return (
    '<div class="donutWrap"><svg viewBox="0 0 128 128" width="150" height="150" role="img" aria-label="' +
    correct + " correct, " + incorrect + " incorrect, " + unanswered +
    " unanswered, out of " + total + '">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
    '" fill="none" stroke="#e5e9ec" stroke-width="' + sw + '"/>' +
    circles +
    '<text x="' + cx + '" y="' + (cy - 2) +
    '" text-anchor="middle" font-size="24" font-weight="800" fill="#18212b">' + pct + "%</text>" +
    '<text x="' + cx + '" y="' + (cy + 18) +
    '" text-anchor="middle" font-size="11" fill="#65788a">' + correct + " / " + total + "</text>" +
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
    topics[x.topic] ??= { c: 0, t: 0 };
    topics[x.topic].t++;
    if (ok) topics[x.topic].c++;
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
  $("result").classList.remove("hidden");
}
