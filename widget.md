# MindOS Widget — Complete Implementation

Copy the code block below directly into `show_widget(widget_code: ...)`.

## Multi-Provider AI (OpenAI-compatible)

All AI calls (`Understand` / `Growth` / `Action`) go through a single `callAI()` function that speaks the OpenAI Chat Completions protocol. Users pick a provider in the **设置 (Config)** tab; the request's `base_url`  and `model` switch accordingly. Provider registry lives at the top of the `<script>`:

| Provider                | base_url                                 | Default model                  | Key required    |
| ----------------------- | ---------------------------------------- | ------------------------------ | --------------- |
| DeepSeek (default)      | `https://api.deepseek.com/v1`          | `deepseek-chat`              | Yes             |
| 智谱 GLM-4-Flash (free) | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash`                | Yes (free tier) |
| Claude                  | `https://api.anthropic.com/v1`         | `claude-sonnet-4-5-20250929` | Yes             |
| OpenAI                  | `https://api.openai.com/v1`            | `gpt-4o-mini`                | Yes             |

Architecture follows the same pattern as CaseForge's `config.example.py` — a single `PROVIDERS` registry with `base_url` + `model` per entry, and a single endpoint resolution function. To add a new provider, just append an entry to `PROVIDERS` and an `<option>` to the dropdown in the config view.

## Storage

- **`window.storage`** (artifact-scoped, syncs across sessions): captures, AI cache, past actions.
- **`localStorage`** (browser-only, never sent to any server except the chosen AI provider): API provider, API key, model override, base_url override, user context. The API key lives only in the user's browser.

## Personalization

There are no hardcoded `[INSERT USER CONTEXT]` placeholders in the prompts. Instead, the widget reads `userCtx` from `localStorage` and appends a `\n用户背景：…` line to each system prompt at call time via `ctxLine()`. If the user leaves the field blank in the Config tab, no context is added and the AI infers from their captures.

---

```html
<style>
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500&family=Crimson+Pro:ital,wght@0,400;1,400;1,500&family=DM+Mono:wght@300;400&display=swap');
.app{--ms-bg:#F8F8F6;--ms-bg1:#EFEFED;--ms-bg2:#FFFFFF;--ms-bd:#E0E0DE;--ms-bd-strong:#C4C4C2;--ms-tx:#1A1A1A;--ms-tx2:#555553;--ms-tx3:#909090;--ms-accent:#1A1A1A;--ms-radius:6px}
.app.dark{--ms-bg:#141414;--ms-bg1:#1E1E1E;--ms-bg2:#252525;--ms-bd:#2A2A2A;--ms-bd-strong:#3A3A3A;--ms-tx:#F0F0EE;--ms-tx2:#9A9A98;--ms-tx3:#606060;--ms-accent:#F0F0EE}
.app{background:var(--ms-bg) !important;border-color:var(--ms-bd) !important}
*{box-sizing:border-box;margin:0;padding:0}
.app{font-family:'Instrument Sans',sans-serif;background:var(--ms-bg);border:0.5px solid var(--ms-bd);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-height:580px}
.topbar{height:44px;display:flex;align-items:center;padding:0 20px;border-bottom:0.5px solid var(--ms-bd);background:var(--ms-bg1);flex-shrink:0}
.brand{font-family:'DM Mono',monospace;font-size:13px;font-weight:400;color:var(--ms-tx);letter-spacing:.12em;margin-right:auto;flex-shrink:0}
.brand em{font-style:italic;color:var(--ms-tx2)}
.tdate{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.06em}
.body{flex:1;display:flex;min-height:0}
.sidebar{width:52px;flex-shrink:0;border-right:0.5px solid var(--ms-bd);background:var(--ms-bg1);overflow-y:auto;padding:8px 0;position:relative}
.nav-item{position:relative;display:flex;align-items:center;justify-content:center;width:52px;height:42px;color:var(--ms-tx3);cursor:pointer;border-left:2px solid transparent;transition:color .15s,border-color .15s,background .15s}
.nav-item:hover{color:var(--ms-tx2);background:var(--ms-bg2)}
.nav-item.active{color:var(--ms-tx);border-left-color:var(--ms-tx);background:var(--ms-bg2)}
.nav-item:focus-visible{outline:2px solid var(--ms-tx);outline-offset:-2px}
.nav-item i{font-size:16px;flex-shrink:0}
.nav-label{position:absolute;left:54px;top:50%;transform:translateY(-50%);background:var(--ms-bg2);border:0.5px solid var(--ms-bd);border-radius:var(--ms-radius);padding:4px 10px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.06em;color:var(--ms-tx);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .1s;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.nav-item:hover .nav-label{opacity:1}
.nav-badge{position:absolute;top:7px;right:7px;font-size:8px;background:var(--ms-tx3);color:var(--ms-bg);border-radius:100px;padding:1px 4px;font-family:'DM Mono',monospace;min-width:14px;text-align:center;line-height:14px}
.nav-item.active .nav-badge{background:var(--ms-tx)}
.views{flex:1;min-width:0;min-height:0;scrollbar-width:thin;scrollbar-color:var(--ms-bd-strong) transparent}
.views::-webkit-scrollbar{width:6px;height:6px}
.views::-webkit-scrollbar-track{background:transparent}
.views::-webkit-scrollbar-thumb{background:var(--ms-bd-strong);border-radius:3px}
.views::-webkit-scrollbar-thumb:hover{background:var(--ms-tx3)}
.sidebar{scrollbar-width:thin;scrollbar-color:var(--ms-bd-strong) transparent}
.sidebar::-webkit-scrollbar{width:4px}
.sidebar::-webkit-scrollbar-thumb{background:var(--ms-bd);border-radius:2px}
.view{display:none;flex-direction:column;height:100%;overflow-y:auto}
.view.active{display:flex}
.pad{padding:24px 32px;display:flex;flex-direction:column;flex:1;max-width:640px;width:100%}
.eyebrow{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.1em;margin-bottom:5px}
.headline{font-family:'Crimson Pro',serif;font-size:22px;font-weight:400;color:var(--ms-tx);line-height:1.35;margin-bottom:20px}
.headline em{font-style:italic}
.view-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}
.vtl{}
.vsub{font-size:12.5px;color:var(--ms-tx2);margin-top:3px}
.run-btn{padding:7px 14px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.07em;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:transparent;color:var(--ms-tx2);cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0}
.run-btn:hover{border-color:var(--ms-tx);color:var(--ms-tx)}
.run-btn:disabled{opacity:.5;cursor:default}
.lrow{display:none;align-items:center;gap:8px;padding:10px 0;color:var(--ms-tx3);font-size:13px;margin-bottom:8px}
.spinner{width:14px;height:14px;border:1.5px solid var(--ms-bd);border-top-color:var(--ms-tx);border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.cap-box{width:100%;min-height:88px;resize:none;padding:11px 13px;font-family:'Instrument Sans',sans-serif;font-size:14px;line-height:1.7;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:var(--ms-bg2);color:var(--ms-tx);outline:none;transition:border-color .15s}
.cap-box:focus{border-color:var(--ms-tx);box-shadow:0 0 0 3px rgba(28,25,23,.06)}
.cap-box::placeholder{color:var(--ms-tx3);font-size:13px}
.cap-row{display:flex;align-items:center;gap:8px;margin-top:9px}
.mlbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.06em;flex-shrink:0}
.mdots{display:flex;gap:5px}
.mdot{width:15px;height:15px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform .15s,border-color .15s;flex-shrink:0}
.mdot:hover{transform:scale(1.2)}
.mdot.sel{border-color:var(--ms-tx)}
.m1{background:#7B9BAF}.m2{background:#7FA87B}.m3{background:#C4A882}.m4{background:#D4895A}.m5{background:#B07BAF}
.mname{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3)}
.cap-btn{margin-left:auto;padding:7px 16px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.07em;border:none;border-radius:var(--ms-radius);background:var(--ms-tx);color:var(--ms-bg);cursor:pointer;transition:opacity .15s;flex-shrink:0}
.cap-btn:hover{opacity:.88;transform:translateY(-1px)}
.cap-btn{transition:opacity .15s,transform .15s}
.ehdr{display:flex;align-items:center;justify-content:space-between;padding-top:16px;margin-top:16px;border-top:0.5px solid var(--ms-bd)}
.elbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.1em}
.ect{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3)}
.entry{display:flex;gap:9px;padding:10px 0;border-bottom:0.5px solid var(--ms-bd)}
.entry:last-child{border-bottom:none}
.ebar{width:3px;border-radius:2px;flex-shrink:0;align-self:stretch;min-height:18px}
.ebody{flex:1;min-width:0}
.emeta{display:flex;align-items:center;gap:7px;margin-bottom:2px}
.etime{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.04em}
.emood{font-family:'DM Mono',monospace;font-size:9px;color:var(--ms-tx3)}
.etext{font-size:13px;color:var(--ms-tx2);line-height:1.55;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.mt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:10px;color:var(--ms-tx3);text-align:center;padding:32px 0;min-height:120px}
.mt-empty i{font-size:28px;animation:float 3s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.mt-empty p{font-size:13px;line-height:1.6;max-width:240px}
.icards{display:flex;flex-direction:column;gap:9px}
.icard{border-left:2px solid var(--ms-bd-strong);padding:10px 0 10px 14px;margin-bottom:2px}
.icard-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.08em;margin-bottom:6px}
.icard-body{font-family:'Crimson Pro',serif;font-size:15px;font-style:italic;color:var(--ms-tx);line-height:1.85}
.icard-body b{font-style:normal;font-weight:500}
.cache-ts{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);margin-top:12px}
.gstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.gs{border-bottom:1px solid var(--ms-bd);padding:10px 12px}
.gs-n{font-family:'DM Mono',monospace;font-size:20px;color:var(--ms-tx)}
.gs-l{font-size:11px;color:var(--ms-tx3);margin-top:2px}
.mirror-card{border-left:2px solid var(--ms-tx);padding:12px 0 12px 16px;margin-bottom:16px}
.mirror-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.08em;margin-bottom:8px}
.mirror-txt{font-family:'Crimson Pro',serif;font-size:16px;font-style:italic;color:var(--ms-tx);line-height:1.9}
.chips-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.08em;margin-bottom:6px;margin-top:10px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font-family:'DM Mono',monospace;font-size:10px;padding:3px 9px;border-radius:100px;border:0.5px solid var(--ms-bd-strong);color:var(--ms-tx2);letter-spacing:.04em}
.chip.up{border-color:var(--ms-bd-strong);color:var(--ms-accent)}
.chip.dn{opacity:.45}
.act-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:24px 22px;text-align:center}
.act-ey{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.12em;margin-bottom:18px}
.act-text{font-family:'Crimson Pro',serif;font-size:26px;font-weight:400;color:var(--ms-tx);line-height:1.45;max-width:440px;margin:0 auto 14px}
.act-why{font-family:'Crimson Pro',serif;font-size:13.5px;font-style:italic;color:var(--ms-tx2);line-height:1.75;max-width:360px;margin:0 auto 26px}
.act-btns{display:flex;gap:8px;justify-content:center}
.act-done{padding:8px 26px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;border:0.5px solid var(--ms-tx);border-radius:var(--ms-radius);background:transparent;color:var(--ms-tx);cursor:pointer;transition:all .15s}
.act-done:hover,.act-done.done{background:var(--ms-tx);color:var(--ms-bg)}
.act-regen{padding:8px 14px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.07em;border:0.5px solid var(--ms-bd);border-radius:var(--ms-radius);background:transparent;color:var(--ms-tx3);cursor:pointer;transition:all .15s}
.act-regen:hover{border-color:var(--ms-bd-strong);color:var(--ms-tx2)}
.gen-btn{padding:9px 22px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:transparent;color:var(--ms-tx2);cursor:pointer;transition:all .15s}
.gen-btn:hover{border-color:var(--ms-tx);color:var(--ms-tx)}
.act-hist{width:100%;max-width:440px;margin-top:28px;text-align:left;border-top:0.5px solid var(--ms-bd);padding-top:14px}
.hist-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.1em;margin-bottom:8px}
.hist-item{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:0.5px solid var(--ms-bd)}
.hist-item:last-child{border-bottom:none}
.hchk{width:13px;height:13px;border-radius:3px;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center}
.hchk.done{background:var(--ms-tx)}.hchk.open{border:0.5px solid var(--ms-bd-strong)}
.hinfo{flex:1}
.htxt{font-size:12.5px;color:var(--ms-tx2);line-height:1.4}
.hdate{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);margin-top:1px}
.cfg-sec{margin-bottom:22px}
.coach-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.coach-stat{background:var(--ms-bg2);border:0.5px solid var(--ms-bd);border-radius:var(--ms-radius);padding:10px 12px;text-align:center}
.coach-stat-n{font-family:'DM Mono',monospace;font-size:18px;color:var(--ms-tx)}
.coach-stat-l{font-size:11px;color:var(--ms-tx3);margin-top:2px}
.coach-tone{display:inline-block;font-family:'DM Mono',monospace;font-size:10px;padding:3px 10px;border-radius:100px;letter-spacing:.06em;margin-bottom:10px}
.coach-tone.encourage{background:rgba(127,168,123,.15);color:#5a8a5a;border:0.5px solid rgba(127,168,123,.3)}
.coach-tone.push{background:rgba(196,168,130,.15);color:#8a7a5a;border:0.5px solid rgba(196,168,130,.3)}
.coach-tone.critique{background:rgba(212,137,90,.15);color:#a86040;border:0.5px solid rgba(212,137,90,.3)}
.coach-msg{font-family:'Crimson Pro',serif;font-size:17px;font-style:italic;color:var(--ms-tx);line-height:1.85;padding:14px 0 14px 18px;border-left:3px solid var(--ms-bd-strong);margin-bottom:14px}
.coach-tone.encourage+.coach-msg{border-left-color:#5a8a5a}
.coach-tone.push+.coach-msg{border-left-color:#8a7a5a}
.coach-tone.critique+.coach-msg{border-left-color:#a86040}
.coach-history{margin-top:20px;padding-top:14px;border-top:0.5px solid var(--ms-bd)}
.coach-hist-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.1em;margin-bottom:8px}
.coach-hist-item{padding:8px 0;border-bottom:0.5px solid var(--ms-bd);cursor:pointer;transition:color .15s}
.coach-hist-item:last-child{border-bottom:none}
.coach-hist-item:hover{color:var(--ms-tx)}
.coach-hist-date{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);margin-bottom:3px}
.coach-hist-tone{font-family:'DM Mono',monospace;font-size:9px;padding:1px 6px;border-radius:100px;margin-left:8px}
.coach-hist-msg{font-size:12px;color:var(--ms-tx3);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.cfg-sec-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.1em;margin-bottom:9px;padding-bottom:6px;border-bottom:0.5px solid var(--ms-bd)}
.cfg-row{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.cfg-lbl{font-size:12.5px;color:var(--ms-tx2);font-weight:500}
.cfg-lbl small{font-family:'DM Mono',monospace;font-size:9.5px;color:var(--ms-tx3);letter-spacing:.04em;font-weight:normal;margin-left:6px}
.cfg-input,.cfg-select,.cfg-area{width:100%;padding:9px 11px;font-family:'Instrument Sans',sans-serif;font-size:13px;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:var(--ms-bg2);color:var(--ms-tx);outline:none;transition:border-color .15s;box-sizing:border-box}
.cfg-input:focus,.cfg-select:focus,.cfg-area:focus{border-color:var(--ms-tx);box-shadow:0 0 0 3px rgba(28,25,23,.06)}
.cfg-input::placeholder,.cfg-area::placeholder{color:var(--ms-tx3);font-size:12px}
.cfg-select{appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='round'/></svg>");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
.cfg-area{min-height:60px;resize:vertical;line-height:1.6}
.cfg-hint{font-size:11.5px;color:var(--ms-tx3);line-height:1.6}
.cfg-hint a{color:var(--ms-tx2);text-decoration:underline;text-underline-offset:2px}
.cfg-status{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.06em;margin-top:10px;min-height:14px;transition:color .2s}
.cfg-status.ok{color:var(--ms-tx2)}
.cfg-status.err{color:#c66}
.cfg-prov-info{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.04em;margin-top:5px;line-height:1.6}
@media(max-width:520px){
  .sidebar{width:44px;padding:6px 0}
  .nav-item{width:44px;height:38px}
  .nav-item i{font-size:15px}
  .nav-label{display:none}
  .nav-badge{top:5px;right:4px}
  .pad{padding:16px 14px}
  .coach-stats,.gstats{grid-template-columns:repeat(3,1fr);gap:6px}
  .coach-stat,.gs{padding:8px 6px}
  .coach-stat-n,.gs-n{font-size:16px}
  .sch-add{flex-wrap:wrap}
  .sch-input{min-width:60%;flex:1}
  .headline{font-size:17px}
  .act-text{font-size:20px}
  .coach-msg{font-size:15px;padding:14px}
}
.rev-tabs{display:flex;gap:0;border-bottom:0.5px solid var(--ms-bd);margin-bottom:12px}
.rev-tab{padding:7px 16px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.08em;color:var(--ms-tx3);cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s}
.rev-tab:hover{color:var(--ms-tx2)}
.rev-tab.active{color:var(--ms-tx);border-bottom-color:var(--ms-tx)}
.rev-period-label{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.08em;margin-bottom:14px}
.rev-section{margin-bottom:14px}
.rev-section-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.08em;margin-bottom:5px}
.rev-section-body{font-family:'Crimson Pro',serif;font-size:14px;color:var(--ms-tx);line-height:1.75}
.rev-section-body ul{margin:0;padding-left:18px}
.rev-section-body li{margin-bottom:3px;font-style:italic}
.rev-history{margin-top:22px;border-top:0.5px solid var(--ms-bd);padding-top:14px}
.rev-hist-lbl{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.1em;margin-bottom:8px}
.rev-hist-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--ms-bd);cursor:pointer;font-size:11px;color:var(--ms-tx3);transition:color .15s}
.rev-hist-item:hover{color:var(--ms-tx)}
.rev-hist-item:last-child{border-bottom:none}
.rev-hist-key{font-family:'DM Mono',monospace;font-size:10px;min-width:80px}
.rev-hist-ts{font-family:'DM Mono',monospace;font-size:9px;margin-left:auto}
.sch-add{display:flex;gap:8px;margin-bottom:14px}
.sch-input{flex:1;padding:9px 11px;font-family:'Instrument Sans',sans-serif;font-size:13px;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:var(--ms-bg2);color:var(--ms-tx);outline:none;transition:border-color .15s}
.sch-input:focus{border-color:var(--ms-tx);box-shadow:0 0 0 3px rgba(28,25,23,.06)}
.sch-input::placeholder{color:var(--ms-tx3);font-size:12px}
.sch-date{padding:9px 11px;font-family:'DM Mono',monospace;font-size:11px;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:var(--ms-bg2);color:var(--ms-tx);outline:none;cursor:pointer}
.sch-add-btn{width:34px;height:34px;border:none;border-radius:var(--ms-radius);background:var(--ms-tx);color:var(--ms-bg);cursor:pointer;font-size:18px;line-height:1;transition:opacity .15s;flex-shrink:0}
.sch-add-btn:hover{opacity:.8}
.sch-filters{display:flex;gap:0;border-bottom:0.5px solid var(--ms-bd);margin-bottom:12px;align-items:center}
.sch-filter{padding:7px 14px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;color:var(--ms-tx3);cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s}
.sch-filter:hover{color:var(--ms-tx2)}
.sch-filter.active{color:var(--ms-tx);border-bottom-color:var(--ms-tx)}
.sch-count{margin-left:auto;font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3)}
.sch-list{display:flex;flex-direction:column;gap:0}
.sch-task-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.sch-task-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sch-task-date.overdue{color:#c66}
.sch-task{display:flex;align-items:center;gap:10px;padding:10px 8px;margin:0 -8px;border-bottom:0.5px solid var(--ms-bd);border-radius:var(--ms-radius);transition:background .15s}
.sch-task:hover{background:var(--ms-bg2)}
.sch-task:last-child{border-bottom:none}
.sch-check{width:16px;height:16px;border:0.5px solid var(--ms-bd-strong);border-radius:3px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s}
.sch-check:hover{border-color:var(--ms-tx)}
.sch-check.done{background:var(--ms-tx);border-color:var(--ms-tx)}
.sch-check.done i{color:var(--ms-bg);font-size:10px}
.sch-task-text{flex:1;font-size:13px;color:var(--ms-tx2);line-height:1.4;word-break:break-word}
.sch-task.done .sch-task-text{text-decoration:line-through;opacity:.5}
.sch-task-date{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);flex-shrink:0}
.sch-task-source{font-family:'DM Mono',monospace;font-size:9px;padding:2px 6px;border-radius:100px;border:0.5px solid var(--ms-bd);color:var(--ms-tx3);flex-shrink:0;letter-spacing:.04em}
.sch-task-source.ai{border-color:var(--ms-bd-strong);color:var(--ms-accent)}
.sch-task-source.review{border-color:var(--ms-bd-strong);color:var(--ms-tx2)}
.sch-del{background:none;border:none;color:var(--ms-tx3);cursor:pointer;padding:4px;font-size:14px;flex-shrink:0;transition:color .15s;line-height:1}
.sch-del:hover{color:#c66}
.sch-import{margin-top:18px;padding-top:14px;border-top:0.5px solid var(--ms-bd)}
.sch-import-btn{padding:8px 16px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.07em;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:transparent;color:var(--ms-tx2);cursor:pointer;transition:all .15s}
.sch-import-btn:hover{border-color:var(--ms-tx);color:var(--ms-tx)}
.sch-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:10px;color:var(--ms-tx3);text-align:center;padding:32px 0;min-height:120px}
.sch-empty i{font-size:28px}
.sch-empty p{font-size:13px;line-height:1.6;max-width:240px}
</style>

<h2 class="sr-only">MindOS — 个人成长系统，记录、理解、成长、行动四个层次</h2>

<div class="app">
  <div class="topbar">
    <div class="brand">MIND<em>OS</em></div>
    <div class="tdate" id="tdate"></div>
    <button id="theme-btn" aria-label="切换主题" style="background:none;border:0.5px solid var(--ms-bd);border-radius:var(--ms-radius);padding:4px 9px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.06em;margin-left:12px;transition:all .15s" onmouseover="this.style.color='var(--ms-tx)'" onmouseout="this.style.color='var(--ms-tx3)'">LIGHT</button>
  </div>
  <div class="body">
    <div class="sidebar">
      <div class="nav-item active" role="button" tabindex="0" data-v="capture" aria-label="记录"><i class="ti ti-bolt" aria-hidden="true"></i><span class="nav-label">记录</span><span class="nav-badge" id="nav-cap-cnt"></span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="understand" aria-label="理解"><i class="ti ti-brain" aria-hidden="true"></i><span class="nav-label">理解</span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="growth" aria-label="成长"><i class="ti ti-plant" aria-hidden="true"></i><span class="nav-label">成长</span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="review" aria-label="回顾"><i class="ti ti-history" aria-hidden="true"></i><span class="nav-label">回顾</span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="schedule" aria-label="日程"><i class="ti ti-calendar-check" aria-hidden="true"></i><span class="nav-label">日程</span><span class="nav-badge" id="nav-sch-cnt"></span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="action" aria-label="行动"><i class="ti ti-target" aria-hidden="true"></i><span class="nav-label">行动</span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="coach" aria-label="教练"><i class="ti ti-megaphone" aria-hidden="true"></i><span class="nav-label">教练</span></div>
      <div class="nav-item" role="button" tabindex="0" data-v="config" aria-label="设置"><i class="ti ti-settings" aria-hidden="true"></i><span class="nav-label">设置</span></div>
    </div>
    <div class="views">
    <div class="view active" id="view-capture">
      <div class="pad">
        <div class="eyebrow">01 · CAPTURE</div>
        <div class="headline">把脑子里的东西，<em>倒给我听</em></div>
        <textarea class="cap-box" id="cap-box" placeholder="一个突然的想法、一句触动你的话、今天为什么焦虑、未来五年的某个规划……不用分类，不用整理。"></textarea>
        <div class="cap-row">
          <span class="mlbl">能量</span>
          <div class="mdots">
            <div class="mdot m1" data-m="1" title="耗尽"></div>
            <div class="mdot m2" data-m="2" title="偏低"></div>
            <div class="mdot m3 sel" data-m="3" title="平稳"></div>
            <div class="mdot m4" data-m="4" title="良好"></div>
            <div class="mdot m5" data-m="5" title="亢奋"></div>
          </div>
          <span class="mname" id="mname">平稳</span>
          <button class="cap-btn" id="cap-btn">记下来</button>
        </div>
        <div class="ehdr">
          <span class="elbl">RECENT · 最近记录</span>
          <span class="ect" id="ect">0 条</span>
        </div>
        <div id="entry-list"></div>
      </div>
    </div>
    <div class="view" id="view-understand">
      <div class="pad">
        <div class="view-top">
          <div class="vtl">
            <div class="eyebrow">02 · UNDERSTAND</div>
            <div class="headline" style="margin-bottom:0">AI 读懂<em>你的模式</em></div>
            <div class="vsub">发现你自己没意识到的主题与情绪轨迹</div>
          </div>
          <button class="run-btn" id="und-btn">分析我的想法 ↗</button>
        </div>
        <div class="lrow" id="und-load"><div class="spinner"></div>读取你的想法模式中……</div>
        <div id="und-result"></div>
      </div>
    </div>
    <div class="view" id="view-growth">
      <div class="pad">
        <div class="view-top">
          <div class="vtl">
            <div class="eyebrow">03 · GROWTH</div>
            <div class="headline" style="margin-bottom:0"><em>成长镜子</em></div>
            <div class="vsub">照出你自己看不见的变化与轨迹</div>
          </div>
          <button class="run-btn" id="grow-btn">生成成长镜子 ↗</button>
        </div>
        <div class="lrow" id="grow-load"><div class="spinner"></div>正在照镜子……</div>
        <div class="gstats">
          <div class="gs"><div class="gs-n" id="gs-total">0</div><div class="gs-l">总记录数</div></div>
          <div class="gs"><div class="gs-n" id="gs-days">0</div><div class="gs-l">活跃天数</div></div>
          <div class="gs"><div class="gs-n" id="gs-span">0d</div><div class="gs-l">记录跨度</div></div>
        </div>
        <div id="grow-result"></div>
      </div>
    </div>
    <div class="view" id="view-review">
      <div class="pad">
        <div class="view-top">
          <div class="vtl">
            <div class="eyebrow">04 · REVIEW</div>
            <div class="headline" style="margin-bottom:0">周期<em>回顾</em></div>
            <div class="vsub">AI 把散落的记录整理成日/周/月/年回顾</div>
          </div>
          <button class="run-btn" id="rev-btn">生成 / 重新生成 ↗</button>
        </div>
        <div class="rev-tabs">
          <div class="rev-tab active" data-rp="daily">日</div>
          <div class="rev-tab" data-rp="weekly">周</div>
          <div class="rev-tab" data-rp="monthly">月</div>
          <div class="rev-tab" data-rp="yearly">年</div>
        </div>
        <div class="rev-period-label" id="rev-period-label"></div>
        <div class="lrow" id="rev-load"><div class="spinner"></div>正在生成本期回顾……</div>
        <div id="rev-result"></div>
        <div class="rev-history" id="rev-history" style="display:none">
          <div class="rev-hist-lbl">HISTORY · 历史回顾</div>
          <div id="rev-hist-list"></div>
        </div>
      </div>
    </div>
    <div class="view" id="view-schedule">
      <div class="pad">
        <div class="view-top">
          <div class="vtl">
            <div class="eyebrow">05 · SCHEDULE</div>
            <div class="headline" style="margin-bottom:0">今日<em>日程</em></div>
            <div class="vsub">把回顾里的下一步搬到这里，或直接添加任务</div>
          </div>
        </div>
        <div class="sch-add">
          <input type="text" class="sch-input" id="sch-input" placeholder="添加一条任务……">
          <input type="date" class="sch-date" id="sch-date">
          <button class="sch-add-btn" id="sch-add-btn" title="添加任务">+</button>
        </div>
        <div class="sch-filters">
          <div class="sch-filter active" data-sf="today">今日</div>
          <div class="sch-filter" data-sf="week">本周</div>
          <div class="sch-filter" data-sf="done">已完成</div>
          <div class="sch-filter" data-sf="all">全部</div>
          <span class="sch-count" id="sch-count"></span>
        </div>
        <div class="sch-list" id="sch-list"></div>
        <div class="sch-import" id="sch-import" style="display:none">
          <button class="sch-import-btn" id="sch-import-btn">从最近周报导入下一步 ↗</button>
        </div>
      </div>
    </div>
    <div class="view" id="view-action">
      <div class="act-wrap">
        <div class="act-ey">06 · ACTION</div>
        <div class="lrow" id="act-load" style="justify-content:center"><div class="spinner"></div>为你找今天最值得做的事……</div>
        <div id="act-main" style="display:none;flex-direction:column;align-items:center;width:100%">
          <div class="act-text" id="act-text"></div>
          <div class="act-why" id="act-why"></div>
          <div class="act-btns">
            <button class="act-done" id="act-done-btn">标记完成</button>
            <button class="act-regen" id="act-regen-btn">重新生成</button>
          </div>
        </div>
        <div id="act-empty" style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <i class="ti ti-target" style="font-size:32px;color:var(--ms-tx3)" aria-hidden="true"></i>
          <p style="font-size:13px;color:var(--ms-tx3);line-height:1.6;max-width:280px;text-align:center">先记录一些想法<br>AI 会帮你找到今天最值得做的那一件事</p>
          <button class="gen-btn" id="gen-btn">生成今日行动 ↗</button>
        </div>
        <div class="act-hist" id="act-hist" style="display:none">
          <div class="hist-lbl">HISTORY · 过去的行动</div>
          <div id="hist-list"></div>
        </div>
      </div>
    </div>
    <div class="view" id="view-coach">
      <div class="pad">
        <div class="view-top">
          <div class="vtl">
            <div class="eyebrow">07 · COACH</div>
            <div class="headline" style="margin-bottom:0">AI <em>教练</em></div>
            <div class="vsub">根据任务完成情况，给督促、鼓励或批评</div>
          </div>
          <button class="run-btn" id="coach-btn">请教练点评 ↗</button>
        </div>
        <div class="coach-stats" id="coach-stats"></div>
        <div class="lrow" id="coach-load" style="display:none"><div class="spinner"></div>教练正在看你的表现……</div>
        <div id="coach-result"></div>
        <div class="coach-history" id="coach-history" style="display:none">
          <div class="coach-hist-lbl">HISTORY · 历史点评</div>
          <div id="coach-hist-list"></div>
        </div>
      </div>
    </div>
    <div class="view" id="view-config">
      <div class="pad">
        <div class="eyebrow">08 · CONFIG</div>
        <div class="headline" style="margin-bottom:18px">配置<em>AI 与个性化</em></div>

        <div class="cfg-sec">
          <div class="cfg-sec-lbl">AI PROVIDER · 大模型供应商</div>
          <div class="cfg-row">
            <label class="cfg-lbl" for="cfg-provider">供应商 <small>统一走 OpenAI 兼容接口</small></label>
            <select class="cfg-select" id="cfg-provider">
              <option value="deepseek">DeepSeek（默认，¥0.27/百万 token）</option>
              <option value="zhipu">智谱 GLM-4-Flash（免费）</option>
              <option value="claude">Claude（需填 key）</option>
              <option value="openai">OpenAI（需填 key）</option>
            </select>
            <div class="cfg-prov-info" id="cfg-prov-info"></div>
          </div>
          <div class="cfg-row">
            <label class="cfg-lbl" for="cfg-key">API Key <small>仅存浏览器 localStorage，不传服务器</small></label>
            <input class="cfg-input" id="cfg-key" type="password" placeholder="sk-..." autocomplete="off" spellcheck="false">
            <div class="cfg-hint" id="cfg-key-hint"></div>
          </div>
          <div class="cfg-row">
            <label class="cfg-lbl" for="cfg-model">模型名称 <small>留空使用供应商默认</small></label>
            <input class="cfg-input" id="cfg-model" type="text" placeholder="例如 deepseek-chat / glm-4-flash / gpt-4o-mini" autocomplete="off" spellcheck="false">
          </div>
          <div class="cfg-row">
            <label class="cfg-lbl" for="cfg-baseurl">Base URL <small>高级：覆盖默认接口地址</small></label>
            <input class="cfg-input" id="cfg-baseurl" type="text" placeholder="留空使用供应商默认" autocomplete="off" spellcheck="false">
          </div>
          <div class="cfg-status" id="cfg-status"></div>
        </div>

        <div class="cfg-sec">
          <div class="cfg-sec-lbl">PERSONALIZATION · 个性化背景</div>
          <div class="cfg-row">
            <label class="cfg-lbl" for="cfg-ctx">用户背景 <small>可选 · 留空则由 AI 从记录中推断</small></label>
            <textarea class="cfg-area" id="cfg-ctx" placeholder="例如：正在备考的学生 / 准备作品集的设计师 / 写论文的研究者 / 自由职业者……一句话描述你的身份与目标即可。"></textarea>
            <div class="cfg-hint">填写后，理解 / 成长 / 行动 三个 AI 模块会结合你的背景给出更针对性的洞察。不填也完全可用。</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</div>

<script>
const MC=['','#7B9BAF','#7FA87B','#C4A882','#D4895A','#B07BAF'];
const MN=['','耗尽','偏低','平稳','良好','亢奋'];
let sel=3,captures=[],cache={},pastActions=[],todayAction=null,reviews={},revPeriod='daily',tasks=[],schFilter='today',coach={};

// ── AI Provider Registry (OpenAI-compatible) ───────────────
// 参考 CaseForge config.example.py 多供应商架构：每家供应商单独配置 base_url + model。
// 所有供应商统一走 OpenAI 兼容的 /chat/completions 接口。
const PROVIDERS={
  deepseek:{
    label:'DeepSeek',
    base_url:'https://api.deepseek.com/v1',
    model:'deepseek-chat',
    keyHint:'申请：platform.deepseek.com → API Keys → 创建密钥。价格：输入 ¥0.27/M tokens，输出 ¥1.10/M tokens。',
    keyUrl:'https://platform.deepseek.com/api_keys',
  },
  zhipu:{
    label:'智谱 GLM-4-Flash',
    base_url:'https://open.bigmodel.cn/api/paas/v4',
    model:'glm-4-flash',
    keyHint:'申请：open.bigmodel.cn → 注册 → 控制台 → API 密钥 → 新建。GLM-4-Flash 完全免费，无需付费即可使用全部功能。',
    keyUrl:'https://open.bigmodel.cn/usercenter/apikeys',
  },
  claude:{
    label:'Claude',
    base_url:'https://api.anthropic.com/v1',
    model:'claude-sonnet-4-5-20250929',
    keyHint:'申请：console.anthropic.com → API Keys。走 Anthropic 的 OpenAI 兼容接口。',
    keyUrl:'https://console.anthropic.com/settings/keys',
  },
  openai:{
    label:'OpenAI',
    base_url:'https://api.openai.com/v1',
    model:'gpt-4o-mini',
    keyHint:'申请：platform.openai.com → API Keys → Create new secret key。',
    keyUrl:'https://platform.openai.com/api-keys',
  },
};

// ── Settings ──────────────────────────────────────────────
// 优先存 window.storage（claude.ai artifact 持久化），同步写 localStorage 作为降级。
// 读取时也是 window.storage 优先，保证 API Key 跨会话不丢失。
const LS={
  provider:'mindos:cfg:provider',
  apiKey:'mindos:cfg:apiKey',
  model:'mindos:cfg:model',
  baseUrl:'mindos:cfg:baseUrl',
  userCtx:'mindos:cfg:userCtx',
};

// 内存缓存，避免每次都异步读
let _cfgCache = null;

async function loadSettings(){
  if(_cfgCache) return _cfgCache;
  const defaults={provider:'deepseek',apiKey:'',model:'',baseUrl:'',userCtx:''};
  // 先尝试 window.storage
  if(typeof window.storage !== 'undefined'){
    try{
      const r = await window.storage.get('mindos:cfg');
      if(r && r.value){
        _cfgCache = Object.assign({},defaults,JSON.parse(r.value));
        return _cfgCache;
      }
    }catch{}
  }
  // 降级：localStorage（普通浏览器）
  const ls=(typeof localStorage!=='undefined')?localStorage:null;
  const g=(k)=>{try{return ls?ls.getItem(k)||'':'';}catch{return '';}}
  _cfgCache = {
    provider:g(LS.provider)||'deepseek',
    apiKey:g(LS.apiKey),
    model:g(LS.model),
    baseUrl:g(LS.baseUrl),
    userCtx:g(LS.userCtx),
  };
  return _cfgCache;
}

// 同步读（UI 渲染用，依赖 loadSettings 已经跑过一次）
function getSettings(){
  return _cfgCache || {provider:'deepseek',apiKey:'',model:'',baseUrl:'',userCtx:''};
}

async function saveSetting(k,v){
  if(!_cfgCache) _cfgCache = getSettings();
  // 找到对应字段名
  const fieldMap = {
    [LS.provider]:'provider', [LS.apiKey]:'apiKey',
    [LS.model]:'model', [LS.baseUrl]:'baseUrl', [LS.userCtx]:'userCtx'
  };
  const field = fieldMap[k];
  if(field) _cfgCache[field] = v;
  // 写 window.storage
  if(typeof window.storage !== 'undefined'){
    try{ await window.storage.set('mindos:cfg', JSON.stringify(_cfgCache)); }catch{}
  }
  // 同步写 localStorage 降级
  try{if(typeof localStorage!=='undefined') localStorage.setItem(k,v);}catch{}
}
function resolveEndpoint(s){
  const p=PROVIDERS[s.provider]||PROVIDERS.deepseek;
  const base=(s.baseUrl||p.base_url||'').replace(/\/+$/,'');
  return base+'/chat/completions';
}
function resolveModel(s){
  const p=PROVIDERS[s.provider]||PROVIDERS.deepseek;
  return s.model||p.model;
}
// 动态注入用户背景到 system prompt（替代旧的 [INSERT USER CONTEXT] 占位）
function ctxLine(){
  const s=getSettings();
  return s.userCtx?`\n用户背景：${s.userCtx}`:'';
}

async function sg(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null;}catch{return null;}}
async function ss(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch{}}

async function init(){
  document.getElementById('tdate').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});
  // 先加载 settings（含 API Key），再加载其他数据
  await loadSettings();
  captures=await sg('mindos:captures')||[];
  cache=await sg('mindos:cache')||{};
  pastActions=await sg('mindos:actions')||[];
  reviews=await sg('mindos:reviews')||{};
  tasks=await sg('mindos:tasks')||[];
  coach=await sg('mindos:coach')||{};
  const ts=new Date().toDateString();
  todayAction=pastActions.find(a=>new Date(a.date).toDateString()===ts)||null;
  renderCaptures();renderUnderstand();renderGrowth();renderAction();renderReview();renderRevHistory();renderSchedule();renderCoach();renderCoachHistory();
  updateRevPeriodLabel();
  initConfig();
  // 主题切换
  const appEl = document.querySelector('.app');
  const themeBtn = document.getElementById('theme-btn');
  async function applyTheme(dark){
    if(dark){appEl.classList.add('dark');themeBtn.textContent='DARK';}
    else{appEl.classList.remove('dark');themeBtn.textContent='LIGHT';}
  }
  async function initTheme(){
    const saved = await sg('mindos:cfg:theme');
    applyTheme(saved === 'dark');
  }
  themeBtn.addEventListener('click', async ()=>{
    const isDark = appEl.classList.contains('dark');
    await ss('mindos:cfg:theme', isDark ? 'light' : 'dark');
    applyTheme(!isDark);
  });
  await initTheme();
}

document.querySelectorAll('.nav-item').forEach(t=>{
  t.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();t.click();}});
  t.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('view-'+t.dataset.v).classList.add('active');
  });
});

document.querySelectorAll('.mdot').forEach(d=>{
  d.addEventListener('click',()=>{
    sel=parseInt(d.dataset.m);
    document.querySelectorAll('.mdot').forEach(x=>x.classList.remove('sel'));
    d.classList.add('sel');
    document.getElementById('mname').textContent=MN[sel];
  });
});

const capBox=document.getElementById('cap-box');
capBox.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();addCapture();}});
document.getElementById('cap-btn').addEventListener('click',addCapture);

async function addCapture(){
  const txt=capBox.value.trim();if(!txt)return;
  captures.unshift({id:Date.now()+'',text:txt,mood:sel,ts:new Date().toISOString()});
  await ss('mindos:captures',captures);
  capBox.value='';renderCaptures();
}

function renderCaptures(){
  document.getElementById('nav-cap-cnt').textContent=captures.length;
  document.getElementById('ect').textContent=captures.length+' 条';
  const el=document.getElementById('entry-list');
  if(!captures.length){
    el.innerHTML='<div class="mt-empty"><i class="ti ti-pencil" aria-hidden="true"></i><p>还没有任何记录<br>把脑子里的东西倒在这里吧</p></div>';return;
  }
  el.innerHTML=captures.slice(0,12).map(c=>{
    const d=new Date(c.ts);
    const ds=d.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    return`<div class="entry"><div class="ebar" style="background:${MC[c.mood]||MC[3]}"></div><div class="ebody"><div class="emeta"><span class="etime">${ds}</span><span class="emood">${MN[c.mood]||''}</span></div><div class="etext">${esc(c.text)}</div></div></div>`;
  }).join('');
}

// 安全 JSON 解析：先去掉 markdown 代码块，再尝试提取第一个 {...} 块
function safeJSON(raw){
  if(!raw) throw new Error('AI 返回了空内容，请重试。');
  // 去掉 ```json ... ``` 包裹
  let s=raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
  // 尝试直接解析
  try{return JSON.parse(s);}catch{}
  // 提取第一个 { ... } 块
  const m=s.match(/\{[\s\S]*\}/);
  if(m){try{return JSON.parse(m[0]);}catch{}}
  // 实在解析不了，抛出友好错误
  throw new Error('AI 返回格式异常，请重试。（如频繁出现，可尝试切换模型）');
}

async function callAI(sys,msg){
  const s=getSettings();
  if(!s.apiKey){
    throw new Error('请先在「设置」中填写 API Key（智谱 GLM-4-Flash 免费，注册即可获取）。');
  }
  const isAnthropic = (s.provider === 'claude') || (s.baseUrl||'').includes('anthropic.com');
  let r;
  if(isAnthropic){
    // Anthropic 原生接口：x-api-key + anthropic-version，body 格式不同
    const base=(s.baseUrl||'https://api.anthropic.com/v1').replace(/\/+$/,'');
    const endpoint=base+'/messages';
    const model=resolveModel(s);
    const body={model,max_tokens:1000,system:sys,messages:[{role:'user',content:msg}]};
    try{
      r=await fetch(endpoint,{method:'POST',headers:{
        'Content-Type':'application/json',
        'x-api-key':s.apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },body:JSON.stringify(body)});
    }catch(e){throw new Error('网络错误（Anthropic）：'+( e&&e.message?e.message:''));}
    if(!r.ok){
      let detail='';try{detail=(await r.text()).slice(0,300);}catch{}
      throw new Error('Anthropic API 请求失败（HTTP '+r.status+'）'+(detail?'：'+detail:''));
    }
    const d=await r.json();
    return d.content?.[0]?.text||'';
  }else{
    // OpenAI 兼容接口（DeepSeek / 智谱 / OpenAI 等）
    const endpoint=resolveEndpoint(s);
    const model=resolveModel(s);
    const body={model,messages:[{role:'system',content:sys},{role:'user',content:msg}],max_tokens:1000,temperature:0.7};
    try{
      r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(body)});
    }catch(e){throw new Error('网络错误：无法连接到 '+endpoint+'。'+(e&&e.message?' '+e.message:''));}
    if(!r.ok){
      let detail='';try{detail=(await r.text()).slice(0,300);}catch{}
      throw new Error('API 请求失败（HTTP '+r.status+'）'+(detail?'：'+detail:''));
    }
    const d=await r.json();
    return d.choices?.[0]?.message?.content||'';
  }
}

// ── UNDERSTAND ──────────────────────────────────────────────
// 系统提示模板：动态拼接用户背景（在「设置」中填写，留空则不附加）
const UNDERSTAND_SYS=()=>`你是思维模式分析师。分析用户想法记录，找出隐藏的主题和模式。严格返回JSON，无其他文字：
{"themes":[{"label":"主题名称","insight":"用'你'开头，30-50字，有具体细节"},{"label":"主题名称","insight":"..."}],"emotion":"情绪模式，40-60字，用'你'开头","hidden":"你没意识到的焦点，40字以内","question":"一个值得问自己的深度问题，15-25字"}
找2-3个主题，不要空话，要有具体细节。`+ctxLine();

document.getElementById('und-btn').addEventListener('click',runUnderstand);
async function runUnderstand(){
  if(captures.length<3){alert('先多记录几条想法再来分析吧～（至少3条）');return;}
  const btn=document.getElementById('und-btn'),load=document.getElementById('und-load'),res=document.getElementById('und-result');
  btn.disabled=true;load.style.display='flex';res.innerHTML='';
  const txt=captures.slice(0,20).map(c=>`[${new Date(c.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}·${MN[c.mood]}] ${c.text}`).join('\n\n');
  try{
    const raw=await callAI(UNDERSTAND_SYS(),`我最近的想法记录：\n\n${txt}`);
    const p=safeJSON(raw);
    cache.understand={data:p,ts:new Date().toISOString()};
    await ss('mindos:cache',cache);renderUnderstand(p);
  }catch(e){res.innerHTML=`<p style="color:#c66;font-size:13px;padding:12px 0;line-height:1.6">${esc(e.message||'分析失败，请稍后重试。')}</p>`;}
  load.style.display='none';btn.disabled=false;
}

function renderUnderstand(data){
  const res=document.getElementById('und-result');
  if(!data&&cache.understand)data=cache.understand.data;
  if(!data){
    res.innerHTML=`<div class="mt-empty"><i class="ti ti-brain" aria-hidden="true"></i><p>${captures.length<3?'先记录至少 3 条想法<br>AI 才能开始读懂你的模式':'点击右上角按钮<br>让 AI 开始分析你的思维模式'}</p></div>`;return;
  }
  const ts=cache.understand?.ts?'上次分析于 '+new Date(cache.understand.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  const cards=[
    ...(data.themes||[]).map(t=>`<div class="icard"><div class="icard-lbl">THEME · ${esc(t.label)}</div><div class="icard-body">${esc(t.insight)}</div></div>`),
    data.emotion?`<div class="icard"><div class="icard-lbl">EMOTION · 情绪模式</div><div class="icard-body">${esc(data.emotion)}</div></div>`:'',
    data.hidden?`<div class="icard"><div class="icard-lbl">HIDDEN · 你没说出口的</div><div class="icard-body">${esc(data.hidden)}</div></div>`:'',
    data.question?`<div class="icard"><div class="icard-lbl">QUESTION · 值得问自己的</div><div class="icard-body"><b>${esc(data.question)}</b></div></div>`:''
  ].filter(Boolean);
  res.innerHTML=`<div class="icards">${cards.join('')}</div>${ts?`<div class="cache-ts">${ts}</div>`:''}`;
}

// ── GROWTH ──────────────────────────────────────────────────
// 系统提示模板：动态拼接用户背景
const GROWTH_SYS=()=>`你是用户的成长镜子。分析用户一段时间的想法记录，照出他看不见的变化。严格返回JSON：
{"mirror":"成长叙事，用第二人称'你'，60-80字，像写给未来自己的信，充满洞察和具体细节","rising":["正在上升的兴趣1","上升的2","上升的3"],"fading":["慢慢淡出的1","淡出的2"],"growth":"这段时间你具体成长了什么，一句话20-30字"}
不要空话，要有具体细节。`+ctxLine();

document.getElementById('grow-btn').addEventListener('click',runGrowth);
async function runGrowth(){
  if(captures.length<5){alert('再多写几条记录再来生成吧～（至少5条）');return;}
  const btn=document.getElementById('grow-btn'),load=document.getElementById('grow-load'),res=document.getElementById('grow-result');
  btn.disabled=true;load.style.display='flex';res.innerHTML='';
  updateGS();
  const oldest=new Date(captures[captures.length-1].ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});
  const txt=captures.slice(0,30).map(c=>`[${new Date(c.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}] ${c.text}`).join('\n');
  try{
    const raw=await callAI(GROWTH_SYS(),`我的记录（自${oldest}起）：\n\n${txt}`);
    const p=safeJSON(raw);
    cache.growth={data:p,ts:new Date().toISOString()};
    await ss('mindos:cache',cache);renderGrowthResult(p);
  }catch(e){res.innerHTML=`<p style="color:#c66;font-size:13px;padding:12px 0;line-height:1.6">${esc(e.message||'生成失败，请稍后重试。')}</p>`;}
  load.style.display='none';btn.disabled=false;
}

function updateGS(){
  document.getElementById('gs-total').textContent=captures.length;
  document.getElementById('gs-days').textContent=new Set(captures.map(c=>new Date(c.ts).toDateString())).size;
  const span=captures.length?Math.ceil((new Date()-new Date(captures[captures.length-1].ts))/86400000)+1:0;
  document.getElementById('gs-span').textContent=span+'d';
}

function renderGrowth(data){updateGS();renderGrowthResult(data||cache.growth?.data);}

function renderGrowthResult(data){
  const res=document.getElementById('grow-result');
  if(!data){
    res.innerHTML=`<div class="mt-empty"><i class="ti ti-plant" aria-hidden="true"></i><p>${captures.length<5?'再多写几条记录<br>成长镜子就能照出你的变化了':'点击右上角按钮<br>让 AI 生成你的专属成长镜子'}</p></div>`;return;
  }
  const ts=cache.growth?.ts?'上次生成于 '+new Date(cache.growth.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}):'';
  const r=(data.rising||[]).map(t=>`<span class="chip up">${esc(t)}</span>`).join('');
  const f=(data.fading||[]).map(t=>`<span class="chip dn">${esc(t)}</span>`).join('');
  res.innerHTML=`
    ${data.mirror?`<div class="mirror-card"><div class="mirror-lbl">MIRROR · 成长叙事</div><div class="mirror-txt">${esc(data.mirror)}</div></div>`:''}
    ${data.growth?`<div class="icard" style="margin-bottom:12px"><div class="icard-lbl">INSIGHT · 这段时间</div><div class="icard-body"><b>${esc(data.growth)}</b></div></div>`:''}
    ${r?`<div class="chips-lbl">RISING · 正在上升</div><div class="chips" style="margin-bottom:2px">${r}</div>`:''}
    ${f?`<div class="chips-lbl">FADING · 慢慢淡出</div><div class="chips">${f}</div>`:''}
    ${ts?`<div class="cache-ts">${ts}</div>`:''}
  `;
}

// ── ACTION ──────────────────────────────────────────────────
// 系统提示模板：动态拼接用户背景
const ACTION_SYS=()=>`你是用户的行动引导师。根据他的想法和成长方向，给出今天最值得做的一件具体事情。
这个行动：1)今天能完成 2)和长期成长高度相关 3)不是"完成N个任务"，而是"为了未来那个自己，今天最值得做的事"
严格返回JSON：{"action":"具体行动，15-25字","why":"为什么今天最值得做这件事，连接到长期方向，30-40字"}`+ctxLine();

document.getElementById('gen-btn').addEventListener('click',genAction);
document.getElementById('act-regen-btn').addEventListener('click',genAction);
document.getElementById('act-done-btn').addEventListener('click',toggleDone);

async function genAction(){
  if(!captures.length){alert('先记录一些想法，AI 才能帮你找到今天最值得做的事。');return;}
  const load=document.getElementById('act-load'),main=document.getElementById('act-main'),empty=document.getElementById('act-empty');
  load.style.display='flex';main.style.display='none';empty.style.display='none';
  const recent=captures.slice(0,10).map(c=>c.text).join('\n');
  const hints=[cache.growth?.data?.mirror||'',cache.understand?.data?.themes?.map(t=>t.label).join('、')||''].filter(Boolean).join('。');
  try{
    const raw=await callAI(ACTION_SYS(),`我最近的想法：\n${recent}${hints?'\n\n我的成长方向：'+hints:''}\n\n请给出今天最值得做的一件事。`);
    const p=safeJSON(raw);
    todayAction={id:Date.now()+'',text:p.action,why:p.why,date:new Date().toISOString(),done:false};
    const ts=new Date().toDateString();
    const idx=pastActions.findIndex(a=>new Date(a.date).toDateString()===ts);
    if(idx>=0)pastActions[idx]=todayAction;else pastActions.unshift(todayAction);
    await ss('mindos:actions',pastActions);renderAction();
  }catch(e){
    load.style.display='none';empty.style.display='flex';
    alert(e.message||'生成失败，请稍后重试。');
  }
}

async function toggleDone(){
  if(!todayAction)return;
  todayAction.done=!todayAction.done;
  const ts=new Date().toDateString();
  const idx=pastActions.findIndex(a=>new Date(a.date).toDateString()===ts);
  if(idx>=0)pastActions[idx]=todayAction;
  await ss('mindos:actions',pastActions);
  const btn=document.getElementById('act-done-btn');
  btn.textContent=todayAction.done?'已完成 ✓':'标记完成';
  btn.className='act-done'+(todayAction.done?' done':'');
}

function renderAction(){
  const load=document.getElementById('act-load'),main=document.getElementById('act-main'),empty=document.getElementById('act-empty'),hist=document.getElementById('act-hist');
  load.style.display='none';
  if(todayAction){
    empty.style.display='none';main.style.display='flex';
    document.getElementById('act-text').textContent=todayAction.text;
    document.getElementById('act-why').textContent=todayAction.why;
    const btn=document.getElementById('act-done-btn');
    btn.textContent=todayAction.done?'已完成 ✓':'标记完成';
    btn.className='act-done'+(todayAction.done?' done':'');
  }else{main.style.display='none';empty.style.display='flex';}
  const past=pastActions.filter(a=>new Date(a.date).toDateString()!==new Date().toDateString()).slice(0,5);
  if(past.length){
    hist.style.display='block';
    document.getElementById('hist-list').innerHTML=past.map(a=>{
      const ds=new Date(a.date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});
      return`<div class="hist-item"><div class="hchk ${a.done?'done':'open'}">${a.done?'<i class="ti ti-check" style="font-size:9px;color:var(--ms-bg)" aria-hidden="true"></i>':''}</div><div class="hinfo"><div class="htxt">${esc(a.text)}</div><div class="hdate">${ds}</div></div></div>`;
    }).join('');
  }else hist.style.display='none';
}

function esc(s){return(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>')}

// ── REVIEW (周期回顾) ──────────────────────────────────────
// 4 种周期总结：日/周/月/年。月报优先用本月周报摘要，年报优先用月报摘要（混合层级）。
const DAILY_SYS=()=>`你是用户的日记助手。基于用户今日的想法记录，生成一份日回顾。
严格返回JSON：{"highlights":["今日1-2个关键想法或事件，10-20字"],"emotion":"今日情绪走向+触发因素，40-60字，用'你'开头","reflection":"今日值得反思的一点，30-50字"}
不要空话，要有具体细节。`+ctxLine();

const WEEKLY_SYS=()=>`你是用户的周报助手。基于用户本周的想法记录，生成一份周回顾。
严格返回JSON：{"highlights":["本周2-3个关键事件，10-20字"],"emotion":"本周情绪走向，40-60字","growth":"本周具体成长了什么，30-50字","unfinished":["未完成或拖延的事1-3条"],"next_week":["下周最值得做的2-3件事"]}
不要空话，要有具体细节。`+ctxLine();

const MONTHLY_SYS=()=>`你是用户的月报助手。基于用户本月的记录或周报摘要，生成一份月回顾。
严格返回JSON：{"themes":["本月2-3个反复出现的主题"],"emotion_trend":"情绪走势+转折点，60-80字","achievements":["本月完成的具体事1-3条"],"lessons":["本月学到的1-2条经验"],"next_month_focus":["下月最该聚焦的1-2件事"]}
不要空话，要有具体细节。`+ctxLine();

const YEARLY_SYS=()=>`你是用户的年报助手。基于用户本年的记录或月报摘要，生成一份年回顾。
严格返回JSON：{"year_narrative":"全年成长叙事，第二人称，100-150字","milestones":["年度里程碑3-5条"],"transformation":"最大的转变是什么，40-60字","next_year_direction":"明年最值得投入的方向，30-50字"}
不要空话，要有具体细节。`+ctxLine();

// 周期 key 计算（日 YYYY-MM-DD / 周 YYYY-Www / 月 YYYY-MM / 年 YYYY）
function revKey(period,d=new Date()){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  if(period==='daily')return `${y}-${m}-${day}`;
  if(period==='monthly')return `${y}-${m}`;
  if(period==='yearly')return `${y}`;
  if(period==='weekly'){
    const tmp=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const dayNum=(tmp.getUTCDay()+6)%7;
    tmp.setUTCDate(tmp.getUTCDate()-dayNum+3);
    const firstThu=new Date(Date.UTC(tmp.getUTCFullYear(),0,4));
    const weekNum=1+Math.round(((tmp-firstThu)/86400000-3+(firstThu.getUTCDay()+6)%7)/7);
    return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2,'0')}`;
  }
  return '';
}

// 当前周期的时间范围 [start, end)
function revRange(period){
  const now=new Date();
  const y=now.getFullYear(),m=now.getMonth(),d=now.getDate();
  let start,end;
  if(period==='daily'){
    start=new Date(y,m,d).getTime();end=start+86400000;
  }else if(period==='weekly'){
    const dayNum=(now.getDay()+6)%7;
    start=new Date(y,m,d-dayNum).getTime();end=start+7*86400000;
  }else if(period==='monthly'){
    start=new Date(y,m,1).getTime();end=new Date(y,m+1,1).getTime();
  }else{
    start=new Date(y,0,1).getTime();end=new Date(y+1,0,1).getTime();
  }
  return [start,end];
}

function capsInRange(start,end){
  return captures.filter(c=>{const t=new Date(c.ts).getTime();return t>=start&&t<end;});
}

// 月报混合输入：优先用本月周报摘要，否则读本月 captures
function prepMonthlyInput(){
  const [s,e]=revRange('monthly');
  const ym=revKey('monthly').slice(0,7);
  const weeklySummaries=[];
  if(reviews.weekly){
    Object.keys(reviews.weekly).sort().forEach(k=>{
      if(k.startsWith(ym)){
        const w=reviews.weekly[k].data;
        weeklySummaries.push(`周 ${k}：${(w.highlights||[]).join('、')} | 成长：${w.growth||''} | 未完成：${(w.unfinished||[]).join('、')}`);
      }
    });
  }
  if(weeklySummaries.length>=2){
    return {mode:'weekly',content:'本月各周回顾摘要：\n'+weeklySummaries.join('\n')};
  }
  const caps=capsInRange(s,e);
  return {mode:'captures',content:'本月记录：\n'+caps.map(c=>`[${new Date(c.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}·${MN[c.mood]}] ${c.text}`).join('\n'),caps};
}

// 年报混合输入：优先用月报摘要，否则读最近 200 条 captures
function prepYearlyInput(){
  const [s,e]=revRange('yearly');
  const year=revKey('yearly');
  const monthlySummaries=[];
  if(reviews.monthly){
    Object.keys(reviews.monthly).sort().forEach(k=>{
      if(k.startsWith(year)){
        const mo=reviews.monthly[k].data;
        monthlySummaries.push(`${k}：主题 ${(mo.themes||[]).join('、')} | 成就 ${(mo.achievements||[]).join('、')} | 经验 ${(mo.lessons||[]).join('、')}`);
      }
    });
  }
  if(monthlySummaries.length>=2){
    return {mode:'monthly',content:'本年各月回顾摘要：\n'+monthlySummaries.join('\n')};
  }
  const caps=capsInRange(s,e).slice(0,200);
  return {mode:'captures',content:'本年记录（最多200条）：\n'+caps.map(c=>`[${new Date(c.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}] ${c.text}`).join('\n'),caps};
}

const REV_MIN={daily:1,weekly:3,monthly:5,yearly:20};
const REV_NAME={daily:'日',weekly:'周',monthly:'月',yearly:'年'};

async function runReview(period){
  const [s,e]=revRange(period);
  const caps=capsInRange(s,e);
  let input,sys;
  if(period==='daily'){
    if(caps.length<REV_MIN.daily){alert(`今天还没有记录，先去记录至少 ${REV_MIN.daily} 条想法吧。`);return;}
    sys=DAILY_SYS();
    input='我今日的想法记录：\n\n'+caps.map(c=>`[${new Date(c.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}·${MN[c.mood]}] ${c.text}`).join('\n');
  }else if(period==='weekly'){
    if(caps.length<REV_MIN.weekly){alert(`本周记录太少（${caps.length}条），再多记几条吧（至少${REV_MIN.weekly}条）。`);return;}
    sys=WEEKLY_SYS();
    input='我本周的想法记录：\n\n'+caps.map(c=>`[${new Date(c.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}·${MN[c.mood]}] ${c.text}`).join('\n');
  }else if(period==='monthly'){
    const p=prepMonthlyInput();
    if(p.mode==='captures'&&p.caps.length<REV_MIN.monthly){alert(`本月记录太少（${p.caps.length}条），再多记几条吧（至少${REV_MIN.monthly}条）。`);return;}
    sys=MONTHLY_SYS();
    input=p.content;
  }else{
    const p=prepYearlyInput();
    if(p.mode==='captures'&&p.caps.length<REV_MIN.yearly){alert(`本年记录太少（${p.caps.length}条），再多记几条吧（至少${REV_MIN.yearly}条）。`);return;}
    sys=YEARLY_SYS();
    input=p.content;
  }
  const load=document.getElementById('rev-load'),res=document.getElementById('rev-result'),btn=document.getElementById('rev-btn');
  load.style.display='flex';res.innerHTML='';btn.disabled=true;
  try{
    const raw=await callAI(sys,input);
    const data=safeJSON(raw);
    if(!reviews[period])reviews[period]={};
    reviews[period][revKey(period)]={data,ts:new Date().toISOString()};
    await ss('mindos:reviews',reviews);
    renderReview(period,data);
    renderRevHistory();
  }catch(e){
    res.innerHTML=`<p style="color:#c66;font-size:13px;padding:12px 0;line-height:1.6">${esc(e.message||'生成失败，请稍后重试。')}</p>`;
  }
  load.style.display='none';btn.disabled=false;
}

function renderReview(period,data){
  const res=document.getElementById('rev-result');
  if(!data){
    const cached=reviews[period]?.[revKey(period)];
    if(cached){data=cached.data;}
    else{
      const [s,e]=revRange(period);
      const caps=capsInRange(s,e);
      const min=REV_MIN[period];
      res.innerHTML=`<div class="mt-empty"><i class="ti ti-history" aria-hidden="true"></i><p>${caps.length<min?`本期记录 ${caps.length} 条<br>至少需要 ${min} 条才能生成${REV_NAME[period]}回顾`:`点击右上角按钮<br>生成本${REV_NAME[period]}回顾`}</p></div>`;
      return;
    }
  }
  const sections=[];
  if(data.highlights)sections.push({lbl:'HIGHLIGHTS · 关键',body:`<ul>${data.highlights.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.emotion)sections.push({lbl:'EMOTION · 情绪',body:esc(data.emotion)});
  if(data.reflection)sections.push({lbl:'REFLECTION · 反思',body:esc(data.reflection)});
  if(data.growth)sections.push({lbl:'GROWTH · 成长',body:esc(data.growth)});
  if(data.unfinished)sections.push({lbl:'UNFINISHED · 未完成',body:`<ul>${data.unfinished.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.next_week)sections.push({lbl:'NEXT WEEK · 下周',body:`<ul>${data.next_week.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.themes)sections.push({lbl:'THEMES · 主题',body:`<ul>${data.themes.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.emotion_trend)sections.push({lbl:'EMOTION TREND · 走势',body:esc(data.emotion_trend)});
  if(data.achievements)sections.push({lbl:'ACHIEVEMENTS · 成就',body:`<ul>${data.achievements.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.lessons)sections.push({lbl:'LESSONS · 经验',body:`<ul>${data.lessons.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.next_month_focus)sections.push({lbl:'NEXT MONTH · 下月聚焦',body:`<ul>${data.next_month_focus.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.year_narrative)sections.push({lbl:'NARRATIVE · 叙事',body:esc(data.year_narrative)});
  if(data.milestones)sections.push({lbl:'MILESTONES · 里程碑',body:`<ul>${data.milestones.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`});
  if(data.transformation)sections.push({lbl:'TRANSFORMATION · 转变',body:esc(data.transformation)});
  if(data.next_year_direction)sections.push({lbl:'NEXT YEAR · 明年方向',body:esc(data.next_year_direction)});
  const tsStr=reviews[period]?.[revKey(period)]?.ts?('上次生成于 '+new Date(reviews[period][revKey(period)].ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})):'';
  res.innerHTML=sections.map(s=>`<div class="rev-section"><div class="rev-section-lbl">${s.lbl}</div><div class="rev-section-body">${s.body}</div></div>`).join('')+(tsStr?`<div class="cache-ts">${tsStr}</div>`:'');
}

function renderRevHistory(){
  const histEl=document.getElementById('rev-history');
  const listEl=document.getElementById('rev-hist-list');
  const items=[];
  if(reviews[revPeriod]){
    Object.keys(reviews[revPeriod]).sort().reverse().forEach(k=>{
      if(k===revKey(revPeriod))return;
      const r=reviews[revPeriod][k];
      items.push(`<div class="rev-hist-item" data-key="${k}"><span class="rev-hist-key">${k}</span><span style="flex:1;color:var(--ms-tx3);font-size:11px">点击查看</span><span class="rev-hist-ts">${new Date(r.ts).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}</span></div>`);
    });
  }
  if(items.length){
    histEl.style.display='block';
    listEl.innerHTML=items.join('');
    listEl.querySelectorAll('.rev-hist-item').forEach(el=>{
      el.addEventListener('click',()=>{
        const k=el.dataset.key;
        const data=reviews[revPeriod][k]?.data;
        if(data)renderReview(revPeriod,data);
      });
    });
  }else histEl.style.display='none';
}

function updateRevPeriodLabel(){
  const el=document.getElementById('rev-period-label');
  if(el)el.textContent='当前周期：'+revKey(revPeriod);
}

document.querySelectorAll('.rev-tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.rev-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    revPeriod=t.dataset.rp;
    updateRevPeriodLabel();
    renderReview(revPeriod);
    renderRevHistory();
  });
});

document.getElementById('rev-btn').addEventListener('click',()=>runReview(revPeriod));

// ── SCHEDULE / TASKS ───────────────────────────────────────
// 任务数据模型：{id,text,dueDate,createdAt,done,doneAt,source}
// source 取值：manual（手动添加）/ ai-suggest（AI 建议，预留）/ review-import（从周报导入）

async function addTask(text, dueDate, source) {
  source = source || 'manual';
  tasks.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    text: text.trim(),
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
    done: false,
    doneAt: null,
    source: source
  });
  await ss('mindos:tasks', tasks);
  renderSchedule();
}

async function toggleTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.doneAt = t.done ? new Date().toISOString() : null;
  await ss('mindos:tasks', tasks);
  renderSchedule();
}

async function delTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  await ss('mindos:tasks', tasks);
  renderSchedule();
}

async function importFromReview() {
  const wk = revKey('weekly');
  const wkReview = reviews.weekly && reviews.weekly[wk];
  if (!wkReview || !wkReview.data || !wkReview.data.next_week) {
    flash('本周还没有周报，先去「回顾」生成一份', false);
    return;
  }
  const items = wkReview.data.next_week;
  if (!Array.isArray(items) || items.length === 0) {
    flash('周报里没有下周计划', false);
    return;
  }
  let added = 0;
  items.forEach(text => {
    if (typeof text !== 'string' || !text.trim()) return;
    // 避免重复导入：同文本且未完成的任务不重复添加
    const dup = tasks.find(t => !t.done && t.text === text.trim());
    if (dup) return;
    tasks.unshift({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      dueDate: null,
      createdAt: new Date().toISOString(),
      done: false,
      doneAt: null,
      source: 'review-import'
    });
    added++;
  });
  if (added > 0) {
    await ss('mindos:tasks', tasks);
    renderSchedule();
    flash('从周报导入了 ' + added + ' 条任务', true);
  } else {
    flash('没有新任务可导入（可能已导入过）', false);
  }
}

function filterTasks() {
  const now = new Date();
  const todayStr = now.toDateString();
  // 本周（ISO 周：周一到周日）
  const weekRange = revRange('weekly');
  return tasks.filter(t => {
    if (schFilter === 'done') return t.done;
    if (schFilter === 'all') return true;
    if (schFilter === 'today') {
      if (t.done) return false;
      if (t.dueDate) return new Date(t.dueDate).toDateString() === todayStr;
      // 没有截止日期的看创建时间
      return new Date(t.createdAt).toDateString() === todayStr;
    }
    if (schFilter === 'week') {
      if (t.done) return false;
      const ref = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
      const ts = ref.getTime();
      return ts >= weekRange[0] && ts < weekRange[1];
    }
    return true;
  });
}

function renderSchedule() {
  const listEl = document.getElementById('sch-list');
  const cntEl = document.getElementById('sch-count');
  const navCntEl = document.getElementById('nav-sch-cnt');
  const importEl = document.getElementById('sch-import');
  if (!listEl) return;

  // 更新徽章（未完成任务总数）
  const openCount = tasks.filter(t => !t.done).length;
  if (navCntEl) navCntEl.textContent = openCount;

  // 检查是否可从周报导入
  const wk = revKey('weekly');
  const canImport = reviews.weekly && reviews.weekly[wk] && reviews.weekly[wk].data && reviews.weekly[wk].data.next_week;
  if (importEl) importEl.style.display = canImport ? 'block' : 'none';

  const filtered = filterTasks();
  if (cntEl) cntEl.textContent = filtered.length + ' 条';

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="mt-empty" style="min-height:80px;padding:20px 0"><i class="ti ti-checkbox"></i><p>这里还没有任务。<br>添加一条，或从周报导入下一步。</p></div>';
    return;
  }

  // 排序：未完成在前，再按 dueDate 升序（null 在最后）
  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const todayStr = new Date().toDateString();
  listEl.innerHTML = filtered.map(t => {
    const dueTxt = t.dueDate ? new Date(t.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '';
    const isOverdue = t.dueDate && !t.done && new Date(t.dueDate).toDateString() < todayStr;
    const sourceLabel = t.source === 'review-import' ? '<span class="sch-task-source">来自周报</span>' : '';
    const dateLabel = dueTxt ? '<span class="sch-task-date' + (isOverdue ? ' overdue' : '') + '">' + (isOverdue ? '逾期 · ' : '') + dueTxt + '</span>' : '';
    return '<div class="sch-task' + (t.done ? ' done' : '') + '">' +
      '<div class="sch-check' + (t.done ? ' done' : '') + '" data-id="' + t.id + '"><i class="ti ti-check" style="font-size:11px"></i></div>' +
      '<div class="sch-task-body">' +
        '<div class="sch-task-text">' + esc(t.text) + '</div>' +
        '<div class="sch-task-meta">' + dateLabel + sourceLabel + '</div>' +
      '</div>' +
      '<button class="sch-del" data-id="' + t.id + '" title="删除"><i class="ti ti-x"></i></button>' +
    '</div>';
  }).join('');

  // 绑定事件
  listEl.querySelectorAll('.sch-check').forEach(el => {
    el.addEventListener('click', () => toggleTask(el.dataset.id));
  });
  listEl.querySelectorAll('.sch-del').forEach(el => {
    el.addEventListener('click', () => delTask(el.dataset.id));
  });
}

// Schedule 事件绑定
document.getElementById('sch-add-btn').addEventListener('click', async () => {
  const inputEl = document.getElementById('sch-input');
  const dateEl = document.getElementById('sch-date');
  const text = inputEl.value.trim();
  if (!text) { flash('请输入任务内容', false); return; }
  await addTask(text, dateEl.value || null);
  inputEl.value = '';
  dateEl.value = '';
  inputEl.focus();
});

document.getElementById('sch-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('sch-add-btn').click();
});

document.querySelectorAll('.sch-filter').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.sch-filter').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    schFilter = el.dataset.sf;
    renderSchedule();
  });
});

document.getElementById('sch-import-btn').addEventListener('click', () => importFromReview());

// ── COACH / AI 监督闭环 ─────────────────────────────────────
// 教练数据模型：coach[dateKey] = {ts, tone, message, stats:{total,done,rate}}
// tone 三档：encourage(≥70%) / push(30-70%) / critique(<30%)
// 触发：init 时渲染统计+历史；用户点「请教练点评」才调 AI（避免 API 浪费）

const COACH_SYS = () => `你是用户的个人教练，根据用户今日任务完成情况给出简短有力的反馈。

规则：
- 完成率 ≥ 70%：encourage（鼓励），肯定进步，但不要过度吹捧
- 完成率 30%-70%：push（督促），指出可以改进的地方，给具体建议
- 完成率 < 30%：critique（批评），但建设性，不人身攻击

语气：直接、真诚、像一个关心你但不会惯着你的教练。50-100 字。

返回 JSON：
{"tone":"encourage|push|critique","message":"反馈内容"}` + ctxLine();

function calcCoachStats() {
  const todayStr = new Date().toDateString();
  // 只看 dueDate 是今天的任务
  const todayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr);
  const total = todayTasks.length;
  const done = todayTasks.filter(t => t.done).length;
  const rate = total > 0 ? done / total : 0;
  return { total, done, rate, todayStr };
}

function coachTone(rate) {
  if (rate >= 0.7) return 'encourage';
  if (rate >= 0.3) return 'push';
  return 'critique';
}

function coachToneLabel(tone) {
  return { encourage: '鼓励', push: '督促', critique: '批评' }[tone] || tone;
}

async function runCoach() {
  const stats = calcCoachStats();
  const loadEl = document.getElementById('coach-load');
  const resEl = document.getElementById('coach-result');
  const btn = document.getElementById('coach-btn');
  if (!resEl) return;

  if (stats.total === 0) {
    loadEl.style.display = 'none';
    resEl.innerHTML = '<div class="mt-empty"><i class="ti ti-megaphone"></i><p>今天没有截止任务。<br>先去「日程」给任务设上今天的截止日期，做完再来找教练。</p></div>';
    return;
  }

  loadEl.style.display = 'flex';
  resEl.innerHTML = '';
  if (btn) btn.disabled = true;

  try {
    const todayStr = stats.todayStr;
    const doneTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr && t.done).map(t => t.text);
    const openTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr && !t.done).map(t => t.text);

    const input = '今日任务完成率：' + Math.round(stats.rate * 100) + '%（' + stats.done + '/' + stats.total + '）\n\n已完成：\n' + (doneTasks.map(t => '· ' + t).join('\n') || '（无）') + '\n\n未完成：\n' + (openTasks.map(t => '· ' + t).join('\n') || '（无）');

    const raw = await callAI(COACH_SYS(), input);
    const data = safeJSON(raw);

    const todayKey = new Date().toISOString().slice(0, 10);
    coach[todayKey] = {
      ts: new Date().toISOString(),
      tone: data.tone,
      message: data.message,
      stats: { total: stats.total, done: stats.done, rate: stats.rate }
    };
    await ss('mindos:coach', coach);

    renderCoach();
    renderCoachHistory();
  } catch (e) {
    resEl.innerHTML = '<div class="mt-empty"><i class="ti ti-alert-circle"></i><p>教练暂时无法点评：' + esc(e.message) + '</p></div>';
  } finally {
    loadEl.style.display = 'none';
    if (btn) btn.disabled = false;
  }
}

function renderCoach() {
  const resEl = document.getElementById('coach-result');
  const statsEl = document.getElementById('coach-stats');
  if (!resEl) return;

  // 渲染统计
  const stats = calcCoachStats();
  if (stats.total === 0) {
    statsEl.innerHTML = '<div class="cfg-hint" style="grid-column:1/-1">今天没有截止任务。在「日程」里给任务设上今天的截止日期，教练才能点评。</div>';
  } else {
    statsEl.innerHTML =
      '<div class="coach-stat"><div class="coach-stat-n">' + stats.done + '/' + stats.total + '</div><div class="coach-stat-l">今日完成</div></div>' +
      '<div class="coach-stat"><div class="coach-stat-n">' + Math.round(stats.rate * 100) + '%</div><div class="coach-stat-l">完成率</div></div>' +
      '<div class="coach-stat"><div class="coach-stat-n">' + coachToneLabel(coachTone(stats.rate)) + '</div><div class="coach-stat-l">建议语气</div></div>';
  }

  // 渲染今日教练消息
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = coach[todayKey];
  if (today) {
    resEl.innerHTML =
      '<span class="coach-tone ' + today.tone + '">' + coachToneLabel(today.tone) + '</span>' +
      '<div class="coach-msg">' + esc(today.message) + '</div>';
  } else {
    resEl.innerHTML = '';
  }
}

function renderCoachHistory() {
  const histEl = document.getElementById('coach-history');
  const listEl = document.getElementById('coach-hist-list');
  if (!histEl) return;

  const keys = Object.keys(coach).sort().reverse();
  const todayKey = new Date().toISOString().slice(0, 10);
  const past = keys.filter(k => k !== todayKey);

  if (past.length === 0) {
    histEl.style.display = 'none';
    return;
  }

  histEl.style.display = 'block';
  listEl.innerHTML = past.slice(0, 10).map(k => {
    const item = coach[k];
    const date = new Date(k).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    return '<div class="coach-hist-item" data-key="' + k + '">' +
      '<div class="coach-hist-date">' + date + '<span class="coach-hist-tone coach-tone ' + item.tone + '">' + coachToneLabel(item.tone) + '</span></div>' +
      '<div class="coach-hist-msg">' + esc(item.message) + '</div>' +
    '</div>';
  }).join('');

  listEl.querySelectorAll('.coach-hist-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = coach[el.dataset.key];
      if (item) {
        document.getElementById('coach-result').innerHTML =
          '<span class="coach-tone ' + item.tone + '">' + coachToneLabel(item.tone) + '</span>' +
          '<div class="coach-msg">' + esc(item.message) + '</div>';
      }
    });
  });
}

document.getElementById('coach-btn').addEventListener('click', () => runCoach());

// ── CONFIG / SETTINGS PANEL ────────────────────────────────
// 所有设置仅存浏览器 localStorage，不会发送到任何服务器（除调用 AI 时直接传给所选供应商）。
function initConfig(){
  const s=getSettings();
  const provEl=document.getElementById('cfg-provider');
  const keyEl=document.getElementById('cfg-key');
  const modelEl=document.getElementById('cfg-model');
  const baseEl=document.getElementById('cfg-baseurl');
  const ctxEl=document.getElementById('cfg-ctx');
  const infoEl=document.getElementById('cfg-prov-info');
  const keyHintEl=document.getElementById('cfg-key-hint');
  const statusEl=document.getElementById('cfg-status');

  provEl.value=s.provider;
  keyEl.value=s.apiKey;
  modelEl.value=s.model;
  baseEl.value=s.baseUrl;
  ctxEl.value=s.userCtx;
  updateProviderInfo();

  function updateProviderInfo(){
    const p=PROVIDERS[provEl.value]||PROVIDERS.deepseek;
    infoEl.textContent=`默认 base_url：${p.base_url}　·　默认 model：${p.model}`;
    keyHintEl.innerHTML=p.keyHint+` <a href="${p.keyUrl}" target="_blank" rel="noopener noreferrer">前往申请 ↗</a>`;
  }
  function flash(msg,ok){
    statusEl.textContent=msg;
    statusEl.className='cfg-status '+(ok?'ok':'err');
    clearTimeout(flash._t);
    flash._t=setTimeout(()=>{statusEl.textContent='';statusEl.className='cfg-status';},3500);
  }

  provEl.addEventListener('change',()=>{
    saveSetting(LS.provider,provEl.value);
    // 切换供应商时清空自定义 model / base_url，让新供应商的默认值生效
    modelEl.value='';baseEl.value='';
    modelEl.dataset.custom='';baseEl.dataset.custom='';
    saveSetting(LS.model,'');saveSetting(LS.baseUrl,'');
    updateProviderInfo();
    flash('已切换到 '+(PROVIDERS[provEl.value]||PROVIDERS.deepseek).label,true);
  });
  keyEl.addEventListener('input',()=>{
    saveSetting(LS.apiKey,keyEl.value.trim());
    flash(keyEl.value?'API Key 已保存（仅存本地）':'',true);
  });
  modelEl.addEventListener('input',()=>{
    modelEl.dataset.custom='1';
    saveSetting(LS.model,modelEl.value.trim());
  });
  baseEl.addEventListener('input',()=>{
    baseEl.dataset.custom='1';
    saveSetting(LS.baseUrl,baseEl.value.trim());
  });
  ctxEl.addEventListener('input',()=>{saveSetting(LS.userCtx,ctxEl.value);});
}

init();
</script>
```
