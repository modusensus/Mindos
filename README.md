# MindOS — Personal Growth OS

> *A four-layer AI-powered system for people who think more than they act.*

MindOS is a Claude skill that builds a persistent, AI-enhanced personal growth tool directly inside claude.ai. It turns AI into a thinking partner that helps you capture thoughts, discover patterns, track growth, and find today's most meaningful action.

Works for anyone who thinks more than they act — students preparing for exams, designers building a portfolio, researchers writing papers, professionals tracking career direction, or anyone who wants a quieter way to make sense of their own mind.

---

## The Four Layers

```
01 CAPTURE → 02 UNDERSTAND → 03 GROWTH → 04 ACTION
  记录           理解           成长          行动
```

| Layer | What it does |
|-------|-------------|
| **01 · Capture** | Zero-friction thought dump. No categories, no filters. Just write. Energy level tracking with a 5-point mood system. |
| **02 · Understand** | AI reads all your captures and surfaces hidden patterns: recurring themes, emotional trends, things you didn't realize you were thinking about. |
| **03 · Growth** | A "growth mirror" — AI generates a narrative of how you've changed, what's rising in your attention, what's fading. Changes you can't see yourself. |
| **04 · Action** | Not a to-do list. One thing. The single most-worthy action today, connected to who you're becoming — with a WHY. |

---

## Philosophy

Most productivity tools optimize for *doing more*. MindOS optimizes for *understanding yourself*.

The four layers follow a single direction: **chaos → clarity → action**.

- **Layer 1** is for the brain that generates more ideas than it can execute
- **Layer 2** is for the patterns you can't see when you're inside them
- **Layer 3** is for the growth that's invisible without a long enough lens
- **Layer 4** is for bridging the gap between thinking and doing

---

## Requirements

- [claude.ai](https://claude.ai) account (free tier works)
- **Settings → Profile → Enable "Create AI-powered artifacts"** (Beta feature)
- An API key from one of the supported AI providers (see below). **智谱 GLM-4-Flash 用户无需付费即可使用全部功能** — register at `open.bigmodel.cn` and create a free API key.

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

The API key, selected provider, model override, base_url override, and user context are all stored in the browser's **`localStorage`** only. They are never sent to any server other than the AI provider you select (the request goes directly from your browser to the provider's endpoint). Captures, AI cache, and past actions are stored in `window.storage` (claude.ai's persistent artifact storage).

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

## Installation

### Option A: Use as a Claude Skill (recommended)

1. Copy `SKILL.md` into your Claude skills directory
2. Claude will automatically trigger MindOS when you mention "second brain", "思维管理", "personal growth system", etc.

### Option B: Run the widget directly

1. Open a new Claude conversation
2. Paste the contents of `widget.md` into the prompt
3. Ask Claude to render it as an artifact
4. Open the **设置** tab, pick a provider, paste your API key, and start capturing

---

## Customization

### Personalize AI prompts

Open the **设置 (Config)** tab inside the widget and fill in the **用户背景 (User Context)** field with a one-line description of your situation and goals, e.g.:

- A student preparing for exams: `正在备考的学生，主攻方向是 XX`
- A designer building a portfolio: `设计师，正在准备作品集`
- A researcher writing a thesis: `正在写毕业论文，研究方向是 XX`
- A general user: leave blank — the AI will infer from your captures

When filled, this line is appended to each of the three AI system prompts (Understand / Growth / Action) at call time. When blank, no context is added — the system works fine without it.

### Language

The widget defaults to Chinese (zh-CN). To switch to English:

- Change all `toLocaleDateString('zh-CN', ...)` calls
- Update placeholder text in the textarea
- Replace `MN` mood label array with English equivalents
- Update all Chinese UI strings

### Visual style

The design uses:

- **Playfair Display** (all AI-generated content, in italic)
- **Inter** (body text)
- **DM Mono** (metadata, labels, timestamps)

Mood colors are hardcoded hex values in the CSS (`.m1`–`.m5`). Change these to match your aesthetic.

---

## Data Storage

MindOS uses two storage layers:

```
window.storage (artifact-scoped, persists across sessions):
  mindos:captures   →  thought entries [{id, text, mood, ts}]
  mindos:cache      →  AI analysis cache (avoids redundant calls)
  mindos:actions    →  daily action history [{text, why, date, done}]

localStorage (browser-only, never sent to any server):
  mindos:provider   →  selected AI provider key
  mindos:apiKey     →  API key (plaintext in browser only)
  mindos:model      →  optional model name override
  mindos:baseUrl    →  optional base_url override
  mindos:userCtx    →  optional user background line
```

Cached AI results stay until you manually re-trigger analysis. To fully reset, clear both `window.storage` keys (prefix `mindos:`) and the `mindos:*` keys in `localStorage`.

---

## Roadmap

- [ ] JSON export / import
- [ ] Weekly AI digest
- [ ] Tag system for captures
- [ ] Timeline view
- [ ] Multiple life areas / projects
- [ ] English UI mode
- [ ] Dark mode toggle
- [ ] Obsidian / Notion export

---

## File Structure

```
mindos-skill/
├── SKILL.md              — Claude skill instructions (triggers + deployment guide)
├── README.md             — This file
└── widget.md             — Complete widget implementation (HTML/CSS/JS)
```

The widget is a single self-contained HTML file. No build step. No npm. No framework.

---

## Design Notes

**Why magazine typography?**
AI-generated insights use Playfair Display in italic — creating the sensation of reading a magazine *about yourself*. This is intentional: it signals that the AI's output is a different kind of object than your raw input.

**Why one action?**
Productivity systems fail by optimizing for quantity. One action, with a reason connected to your long-term self, is harder to ignore than a list of three.

**Why no forced categories in Capture?**
Because categorization is a form of pre-judgment. The system learns your categories from the patterns — not the other way around.

---

## Contributing

This project is built as a Claude skill and is designed to be iterated on. Areas where contributions would be most welcome:

- English translation / i18n support
- Export/import functionality
- Additional AI analysis dimensions
- Additional AI providers
- Mobile-optimized layout

---

*Built with Claude.*
