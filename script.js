let data,
  exam,
  current = 0,
  answers = [],
  left = 3900,
  timer;
const $ = (x) => document.getElementById(x);
fetch("exams.json")
  .then((r) => r.json())
  .then((d) => {
    data = d;
    d.exams.forEach((e, i) => {
      let b = document.createElement("button");
      b.textContent = e.title + " — 60 questions";
      b.onclick = () => start(i);
      $("buttons").appendChild(b);
    });
  });
function start(i) {
  exam = data.exams[i];
  answers = Array(60).fill(null);
  current = 0;
  left = 3900;
  $("start").classList.add("hidden");
  $("exam").classList.remove("hidden");
  $("title").textContent = exam.title;
  render();
  clearInterval(timer);
  timer = setInterval(() => {
    left--;
    clock();
    if (left <= 0) finish(true);
  }, 1000);
  clock();
}
function clock() {
  let m = Math.floor(left / 60),
    s = left % 60;
  $("timer").textContent =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function render() {
  let x = exam.questions[current];
  $("num").textContent = "Question " + (current + 1) + " of 60";
  $("topic").textContent = x.topic;
  $("q").textContent = x.question;
  $("progress").style.width = ((current + 1) / 60) * 100 + "%";
  $("opts").innerHTML = "";
  x.options.forEach((o, i) => {
    let l = document.createElement("label");
    l.className = "opt";
    l.innerHTML =
      '<input type="radio" name="a" value="' +
      i +
      '" ' +
      (answers[current] === i ? "checked" : "") +
      "> " +
      esc(o);
    l.querySelector("input").onchange = (e) => {
      answers[current] = +e.target.value;
      palette();
    };
    $("opts").appendChild(l);
  });
  $("prev").disabled = current === 0;
  $("next").disabled = current === 59;
  palette();
}
function esc(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
  if (current < 59) {
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
    score + " / 60 (" + Math.round((score / 60) * 100) + "%)";
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
  $("exam").classList.add("hidden");
  $("result").classList.remove("hidden");
}
