# MindOS — Personal Growth OS

> *An AI-powered personal growth system for people who think more than they act.*

MindOS is a self-contained HTML widget that runs as a Claude.ai artifact or in any modern browser. It turns AI into a thinking partner that helps you capture thoughts, discover patterns, track growth, plan tasks, and get AI supervision — all in one widget.

Works for anyone who thinks more than they act — students preparing for exams, designers building a portfolio, researchers writing papers, professionals tracking career direction, or anyone who wants a quieter way to make sense of their own mind.

---

## The Eight Tabs

```
01 CAPTURE → 02 UNDERSTAND → 03 GROWTH → 04 REVIEW
  记录          理解            成长         回顾

05 SCHEDULE → 06 ACTION → 07 COACH → 08 CONFIG
   日程          行动         教练        设置
```

| Tab | What it does |
|-----|-------------|
| **01 · Capture** | Zero-friction thought dump. No categories, no filters. Just write. Energy level tracking with a 5-point mood system. **Voice input supported** (Web Speech API / Whisper fallback). |
| **02 · Understand** | AI reads all your captures and surfaces hidden patterns: recurring themes, emotional trends, things you didn't realize you were thinking about. |
| **03 · Growth** | A "growth mirror" — AI generates a narrative of how you've changed, what's rising in your attention, what's fading. Changes you can't see yourself. |
| **04 · Review** | AI-generated periodic retrospectives: **daily / weekly / monthly / yearly**. Monthly uses weekly summaries as input; yearly uses monthly summaries — a hybrid hierarchy that keeps token cost down without losing detail. |
| **05 · Schedule** | A lightweight task list. Add tasks manually, set due dates, filter by today/week/done/all, or import next-steps from your latest weekly review with one click. |
| **06 · Action** | Not a to-do list. One thing. The single most-worthy action today, connected to who you're becoming — with a WHY. |
| **07 · Coach** | AI supervisor. Reads your task completion rate and delivers one of three tones: **encourage** (≥70% done), **push** (30–70%), or **critique** (<30%). Not a cheerleader — a honest mirror. |
| **08 · Config** | Pick AI provider, paste API key, set model/base_url overrides, fill in your user context, toggle dark mode. |

---

## Philosophy

Most productivity tools optimize for *doing more*. MindOS optimizes for *understanding yourself*.

The eight tabs follow a single direction: **chaos → clarity → action → supervision**.

- **Layer 1** is for the brain that generates more ideas than it can execute
- **Layer 2** is for the patterns you can't see when you're inside them
- **Layer 3** is for the growth that's invisible without a long enough lens
- **Layer 4** turns scattered days into structured retrospectives
- **Layer 5** is the bridge between thinking and doing — concrete tasks
- **Layer 6** is for finding the *one* action that matters today
- **Layer 7** is the friend who tells you the truth about your follow-through
- **Layer 8** is for tuning the system to your provider and context

---

## Requirements

- [claude.ai](https://claude.ai) account (free tier works)
- **Settings → Profile → Enable "Create AI-powered artifacts"** (Beta feature)
- An API key from one of the supported AI providers (see below). **智谱 GLM-4-Flash 用户无需付费即可使用全部功能** — register at `open.bigmodel.cn` and create a free API key.
- For voice input: Chrome or Edge browser (uses Web Speech API). Firefox falls back to Whisper API if OpenAI key is configured.

---

## AI Providers (Multi-API Compatible)

MindOS speaks the OpenAI Chat Completions protocol (`/chat/completions`) and supports four providers out of the box. Pick one in the **设置 (Config)** tab inside the widget.

| Provider | base_url | Default model | Cost | Key required |
|----------|----------|---------------|------|--------------|
| **DeepSeek** (default) | `https://api.deepseek.com/v1` | `deepseek-chat` | ~¥0.27 / 1M input tokens | Yes |
| **智谱 GLM-4-Flash** | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` | **Free** | Yes (free tier) |
| **Claude** | `https://api.anthropic.com/v1` | `claude-sonnet-4-5-20250929` | Pay-as-you-go | Yes |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` | Pay-as-you-go | Yes |

DeepSeek's `base_url` is prefilled by default; switching providers in the dropdown updates `base_url` and `model` automatically.

### Where the API key is stored

**The API key lives only in the browser's `localStorage` and is never written to `window.storage`.** This is a deliberate security boundary: `window.storage` (claude.ai's artifact-scoped storage) syncs across sessions and would upload the key to the server, so the widget excludes `apiKey` from any `window.storage` write — even when the rest of the config object is synced.

Non-sensitive config (provider, model, base_url, userCtx, theme) is dual-written to both `localStorage` and `window.storage`, so your provider preference survives across sessions without exposing the key.

### Adding a new provider

The provider registry lives at the top of the `<script>` in `widget.md`:

```js
const PROVIDERS = {
  deepseek: { label:'DeepSeek', base_url:'https://api.deepseek.com/v1', model:'deepseek-chat', ... },
  // add a new entry here…
};
```

Append an entry to `PROVIDERS` and an `<option>` to the dropdown in the config view. As long as the provider exposes an OpenAI-compatible `/chat/completions` endpoint, it will work without further changes. The architecture mirrors CaseForge's `config.example.py` — a single registry with `base_url` + `model` per entry, resolved at call time.

---

## Voice Input

The microphone button next to the capture textarea uses the browser-native **Web Speech API** (Chrome/Edge) for free, on-device speech-to-text. No API key needed. Interim results stream live into the textarea; the recognizer auto-restarts on silence to keep recording continuous until you click stop.

If the browser does not support Web Speech API (e.g. Firefox), the widget falls back to **OpenAI Whisper API** — but only when the user has selected the `openai` provider and entered their API key in the Config tab. Audio is sent directly from the browser to OpenAI; nothing is routed through any other server.

---

## Installation

### Option A: Run the widget directly (recommended)

1. Open a new Claude conversation
2. Paste the contents of `widget.md` into the prompt
3. Ask Claude to render it as an artifact
4. Open the **设置** tab, pick a provider, paste your API key, and start capturing

### Option B: Run locally for development

```bash
# Clone the repo, then serve widget.md as an HTML test page
git clone <repo-url> mindos-skill
cd mindos-skill
# Extract the HTML block from widget.md and wrap with a test harness,
# then serve with any static server, e.g.:
python -m http.server 8766
```

A Node.js build script (`build_mindos_test.js`) is included in development setups to extract the HTML block from `widget.md` and wrap it with a mock `window.storage` harness for local browser testing.

---

## Customization

### Personalize AI prompts

Open the **设置 (Config)** tab inside the widget and fill in the **用户背景 (User Context)** field with a one-line description of your situation and goals, e.g.:

- A student preparing for exams: `正在备考的学生，主攻方向是 XX`
- A designer building a portfolio: `设计师，正在准备作品集`
- A researcher writing a thesis: `正在写毕业论文，研究方向是 XX`
- A general user: leave blank — the AI will infer from your captures

When filled, this line is appended to each AI system prompt (Understand / Growth / Action / Review / Coach) at call time. When blank, no context is added — the system works fine without it.

### Dark mode

Toggle the **LIGHT/DARK** button in the top bar. Your preference is saved to `window.storage` under `mindos:cfg:theme` and persists across sessions. The dark theme uses the same `--ms-*` CSS variables as the light theme, just with different values — no separate stylesheet.

### Language

The widget defaults to Chinese (zh-CN). To switch to English:

- Change all `toLocaleDateString('zh-CN', ...)` calls
- Update placeholder text in the textarea
- Replace `MN` mood label array with English equivalents
- Update all Chinese UI strings

### Visual style

The design uses:

- **Crimson Pro** (all AI-generated content, in italic — insights, reviews, coach messages, action text)
- **Instrument Sans** (body text, inputs, UI labels)
- **DM Mono** (metadata, timestamps, labels, eyebrows)

Mood colors are hardcoded hex values in the CSS (`.m1`–`.m5`). Change these to match your aesthetic.

---

## Data Storage

MindOS uses two storage layers with a strict security boundary:

```
window.storage (artifact-scoped, syncs across sessions):
  mindos:cfg         →  non-sensitive config object {provider, model, baseUrl, userCtx} (apiKey always empty)
  mindos:cfg:theme   →  'light' | 'dark'
  mindos:captures    →  thought entries [{id, text, mood, ts}]
  mindos:cache       →  AI analysis cache (avoids redundant calls)
  mindos:actions     →  daily action history [{text, why, date, done}]
  mindos:reviews     →  periodic retrospectives keyed by period + revKey
  mindos:tasks       →  schedule tasks [{id, text, dueDate, createdAt, done, doneAt, source}]
  mindos:coach       →  coach history [{tone, message, ts, completionRate}]

localStorage (browser-only, NEVER sent to any server except the chosen AI provider):
  mindos:cfg:apiKey  →  API key (plaintext, lives only in the user's browser)
  mindos:cfg:provider / model / baseUrl / userCtx  →  also mirrored here as fallback
  mindos:cfg:theme   →  theme preference (mirrored)
```

**The API key is intentionally excluded from `window.storage` writes.** When `saveSetting` writes the config object to `window.storage`, it replaces `apiKey` with an empty string first. When `loadSettings` reads from `window.storage`, it overrides `apiKey` with the value from `localStorage`. This guarantees the key never leaves the browser even if other config syncs across sessions.

Cached AI results stay until you manually re-trigger analysis. To fully reset, clear both `window.storage` keys (prefix `mindos:`) and the `mindos:cfg:*` keys in `localStorage`.

---

## Roadmap

- [x] Multi-provider AI (DeepSeek / 智谱 / Claude / OpenAI)
- [x] Dark mode toggle
- [x] Weekly / monthly / yearly AI digest (Review tab)
- [x] Schedule / task management with import from weekly review
- [x] AI coach with tone-based supervision (encourage / push / critique)
- [x] Voice input (Web Speech API + Whisper fallback)
- [ ] JSON export / import
- [ ] Tag system for captures
- [ ] Timeline view
- [ ] Multiple life areas / projects
- [ ] English UI mode
- [ ] Obsidian / Notion export

---

## File Structure

```
mindos-skill/
├── README.md             — This file
├── widget.md             — Complete widget implementation (HTML/CSS/JS, single self-contained file)
├── LICENSE                — CC-BY-NC 4.0
├── .gitignore
└── docs/
    ├── devlog.md         — Development journal (design decisions, pitfalls, demo screenshots)
    └── devlog-assets/    — 8 demo screenshots referenced by devlog.md
```

The widget is a single self-contained HTML file inside a markdown code block. No build step. No npm. No framework. Just paste into Claude and render as an artifact.

For the full development story — architecture decisions, pitfalls, and screenshots of all 8 tabs in action — see [docs/devlog.md](docs/devlog.md).

---

## Design Notes

**Why magazine typography?**
AI-generated insights use Crimson Pro in italic — creating the sensation of reading a magazine *about yourself*. This is intentional: it signals that the AI's output is a different kind of object than your raw input.

**Why one action?**
Productivity systems fail by optimizing for quantity. One action, with a reason connected to your long-term self, is harder to ignore than a list of three.

**Why no forced categories in Capture?**
Because categorization is a form of pre-judgment. The system learns your categories from the patterns — not the other way around.

**Why a coach instead of a habit tracker?**
Habit trackers let you lie to yourself. The coach reads your actual completion rate and responds with the tone you've earned — encouragement when you're following through, a push when you're slipping, critique when you're avoiding the work. No badges, no streaks, just honesty.

**Why hybrid review hierarchy?**
Monthly reviews read weekly summaries as input; yearly reviews read monthly summaries. This avoids feeding the AI hundreds of raw captures at year-end (expensive and lossy) while preserving narrative continuity across periods.

---

## Contributing

This project is built as a Claude skill and is designed to be iterated on. Areas where contributions would be most welcome:

- English translation / i18n support
- Export/import functionality (JSON, Markdown, Obsidian)
- Additional AI analysis dimensions
- Additional AI providers
- Mobile-optimized layout
- PWA / offline support

---

*Built with Claude.*
