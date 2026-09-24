# Swift Certified User — Practice Exams

A browser-based practice app for the Swift Certified User certification,
covering its five domains: Swift Language Usage, SwiftUI, Debugging,
Planning and Design, and Xcode Navigation.

Pick a mode, then choose how to practice:

- **Full exams** — a fresh mix drawn from the whole pool at real domain
  weighting (35/20/20/15/10) in three lengths: **Speed Blitz** (15
  questions in 15 minutes, 60s each, language-heavy), **Standard** (45
  questions), and **Marathon** (85 questions), the last two at 65s each.
- **By category** — drill every question in one of the five domains.
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
tagged with its `category`, a granular `topic`, and a `difficulty`.

## Running

Open `index.html`. Because the app fetches JSON, opening the file
directly (`file://`) is blocked by browsers — serve the folder instead:

```
python -m http.server 8000
```

then open `http://localhost:8000`. On a static host (GitHub Pages,
Netlify) it works as-is, and `404.html` is served for unknown paths.
