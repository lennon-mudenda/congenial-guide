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
        ? '<pre class="codeblock"><code>' + esc(seg.content) + "</code></pre>"
        : '<div class="qtext">' + fmt(seg.content) + "</div>",
    )
    .join("");
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
  $("score").textContent =
    score +
    " / " +
    totalQuestions +
    " (" +
    Math.round((score / totalQuestions) * 100) +
    "%)";
  $("breakdown").innerHTML = "<h3>Topic breakdown</h3>";
  Object.entries(topics).forEach(
    ([k, v]) =>
      ($("breakdown").innerHTML +=
        '<div class="row"><span>' +
        esc(k) +
        "</span><strong>" +
        v.c +
        "/" +
        v.t +
        "</strong></div>"),
  );
  $("review").innerHTML = "<h3>Question review</h3>";
  exam.questions.forEach((x, i) => {
    let a = answers[i],
      ok = a === x.answer;
    $("review").innerHTML +=
      '<div class="revq ' +
      (ok ? "pass" : "fail") +
      '"><div class="revHead"><span>Question ' +
      (i + 1) +
      "</span><strong>" +
      (ok ? "Correct" : "Incorrect") +
      "</strong></div>" +
      '<div class="revQ">' +
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
      "</p></div>";
  });
  $("exam").classList.add("hidden");
  $("result").classList.remove("hidden");
}
