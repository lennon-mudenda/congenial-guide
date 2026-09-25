# Swift Certified User — Practice Exams

A browser-based practice app for the Swift Certified User certification,
covering its five domains: Swift Language Usage, SwiftUI, Debugging,
Planning and Design, and Xcode Navigation. It ships with a pool of 500
questions and works in both light and dark mode (toggle in the header;
your choice is remembered).

Pick a mode, then choose how to practice:

- **Full exams** — a fresh mix drawn from the whole pool at real domain
  weighting (55/22/13/5/5) in three lengths: **Speed Blitz** (15
  questions in 15 minutes, 60s each, language-heavy), **Standard** (45
  questions), and **Marathon** (85 questions), the last two at 65s each.
- **By category** — drill one of the five domains, capped to your chosen
  size (15 / 30 / 45 / all) with the "Max questions" selector.
- **By topic** — zero in on a single topic (loops, closures, state
  management, breakpoints, …).

Two modes apply to all of the above:

- **Practice** — untimed, with instant right/wrong feedback and an
  explanation after every answer.
- **Timed exam** — a 65-second-per-question countdown, no feedback until
  you submit, then a score donut, per-category breakdown, and a full
  per-question review.

Other details:

- Questions and answer options are shuffled on every attempt.
- Mark questions for review and jump between them from a review page;
  the last question and the timer both lead there.
- A pop-up calculator, automatic submission when time expires, and a
  warning before leaving mid-exam.

## Data

Questions live in `questions/`: `manifest.json` (categories, weights,
topics, counts) plus one file per category. The app loads the manifest
first and lazy-loads a category's questions only when it's chosen, so
the pool can grow without slowing the initial load. Each question is
tagged with its `category`, a granular `topic`, and a `difficulty`
(`core` / `advanced`), and carries a `question`, four `options`, the
`answer` index, and an `explanation`.

## Project files

- `index.html` — markup and the pre-paint theme script.
- `style.css` — all styling, driven by CSS custom properties with a
  light default and a dark override (OS setting + manual toggle).
- `script.js` — app logic: manifest loading, exam assembly, the
  question/review/results flow, syntax highlighting, and the calculator.
- `questions/` — the manifest and per-category question banks.
- `404.html`, `swift.svg` — not-found page and favicon.

## Running

Open `index.html`. Because the app fetches JSON, opening the file
directly (`file://`) is blocked by browsers — serve the folder instead:

```
python -m http.server 8000
```

then open `http://localhost:8000`. On a static host (GitHub Pages,
Netlify) it works as-is, and `404.html` is served for unknown paths.
