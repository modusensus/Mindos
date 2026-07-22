// 一次性重新应用所有修复到 widget.md
// 1. API key 安全隔离（loadSettings + saveSetting）
// 2. Review undefined 修复（init 调用 + 默认参数）
// 3. 语音输入功能（HTML mic-btn + CSS + JS + 文档）
const fs = require('fs');
const p = 'c:/Users/石晴/Desktop/mindos-skill/widget.md';
let c = fs.readFileSync(p, 'utf8');
const before = c.length;
let fixes = 0;

// ════════════════════════════════════════════════════════════
// 修复 1：loadSettings — apiKey 不信 window.storage
// ════════════════════════════════════════════════════════════
const oldLoad = `async function loadSettings(){
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
}`;

const newLoad = `async function loadSettings(){
  if(_cfgCache) return _cfgCache;
  const defaults={provider:'deepseek',apiKey:'',model:'',baseUrl:'',userCtx:''};
  // ⚠️ 安全：apiKey 只存 localStorage，不进入 window.storage（claude.ai artifact 会同步到服务器）
  // 先尝试 window.storage 读非敏感配置
  if(typeof window.storage !== 'undefined'){
    try{
      const r = await window.storage.get('mindos:cfg');
      if(r && r.value){
        _cfgCache = Object.assign({},defaults,JSON.parse(r.value));
        // apiKey 强制从 localStorage 覆盖（不信 window.storage 里的值，可能是旧数据残留）
        _cfgCache.apiKey = (typeof localStorage!=='undefined') ? (localStorage.getItem(LS.apiKey)||'') : '';
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
}`;

if (c.includes(oldLoad)) {
  c = c.replace(oldLoad, newLoad);
  console.log('FIX 1a: loadSettings patched');
  fixes++;
} else if (c.includes("_cfgCache.apiKey = (typeof localStorage")) {
  console.log('SKIP 1a: loadSettings already patched');
} else {
  console.log('FAIL 1a: loadSettings not found');
}

// ════════════════════════════════════════════════════════════
// 修复 2：saveSetting — 写 window.storage 时排除 apiKey
// ════════════════════════════════════════════════════════════
const oldSave = `async function saveSetting(k,v){
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
}`;

const newSave = `async function saveSetting(k,v){
  if(!_cfgCache) _cfgCache = getSettings();
  // 找到对应字段名
  const fieldMap = {
    [LS.provider]:'provider', [LS.apiKey]:'apiKey',
    [LS.model]:'model', [LS.baseUrl]:'baseUrl', [LS.userCtx]:'userCtx'
  };
  const field = fieldMap[k];
  if(field) _cfgCache[field] = v;
  // 同步写 localStorage（apiKey 始终只在这里）
  try{if(typeof localStorage!=='undefined') localStorage.setItem(k,v);}catch{}
  // ⚠️ 安全：写 window.storage 时排除 apiKey（防止上传到服务器）
  if(typeof window.storage !== 'undefined'){
    try{
      const safeCfg = Object.assign({}, _cfgCache, {apiKey:''});
      await window.storage.set('mindos:cfg', JSON.stringify(safeCfg));
    }catch{}
  }
}`;

if (c.includes(oldSave)) {
  c = c.replace(oldSave, newSave);
  console.log('FIX 1b: saveSetting patched');
  fixes++;
} else if (c.includes("const safeCfg = Object.assign")) {
  console.log('SKIP 1b: saveSetting already patched');
} else {
  console.log('FAIL 1b: saveSetting not found');
}

// ════════════════════════════════════════════════════════════
// 修复 3：init() 中 renderReview() → renderReview(revPeriod)
// ════════════════════════════════════════════════════════════
const oldInitCall = 'renderCaptures();renderUnderstand();renderGrowth();renderAction();renderReview();renderRevHistory();renderSchedule();renderCoach();renderCoachHistory();';
const newInitCall = 'renderCaptures();renderUnderstand();renderGrowth();renderAction();renderReview(revPeriod);renderRevHistory();renderSchedule();renderCoach();renderCoachHistory();';
if (c.includes(oldInitCall)) {
  c = c.replace(oldInitCall, newInitCall);
  console.log('FIX 2a: init renderReview(revPeriod)');
  fixes++;
} else if (c.includes('renderReview(revPeriod);renderRevHistory()')) {
  console.log('SKIP 2a: init already fixed');
} else {
  console.log('FAIL 2a: init call not found');
}

// ════════════════════════════════════════════════════════════
// 修复 4：renderReview 加默认参数
// ════════════════════════════════════════════════════════════
const oldFn = 'function renderReview(period,data){';
const newFn = 'function renderReview(period=revPeriod,data){';
if (c.includes(oldFn)) {
  c = c.replace(oldFn, newFn);
  console.log('FIX 2b: renderReview default param');
  fixes++;
} else if (c.includes('function renderReview(period=revPeriod,data)')) {
  console.log('SKIP 2b: default param already set');
} else {
  console.log('FAIL 2b: renderReview signature not found');
}

// ════════════════════════════════════════════════════════════
// 修复 5：HTML — 在 cap-row 插入 mic-btn
// ════════════════════════════════════════════════════════════
const oldRow = `          <span class="mname" id="mname">平稳</span>
          <button class="cap-btn" id="cap-btn">记下来</button>`;
const newRow = `          <span class="mname" id="mname">平稳</span>
          <button class="mic-btn" id="mic-btn" type="button" title="语音输入（Web Speech API）" aria-label="语音输入"><i class="ti ti-microphone" aria-hidden="true"></i></button>
          <button class="cap-btn" id="cap-btn">记下来</button>`;
if (c.includes(oldRow)) {
  c = c.replace(oldRow, newRow);
  console.log('FIX 3a: HTML mic-btn inserted');
  fixes++;
} else if (c.includes('id="mic-btn"')) {
  console.log('SKIP 3a: mic-btn already in HTML');
} else {
  console.log('FAIL 3a: cap-row pattern not found');
}

// ════════════════════════════════════════════════════════════
// 修复 6：CSS — mic-btn 样式
// ════════════════════════════════════════════════════════════
const cssAnchor = '.cap-btn{margin-left:auto;';
const cssInject = `/* 语音输入按钮 */
.mic-btn{padding:7px 10px;font-size:14px;border:0.5px solid var(--ms-bd-strong);border-radius:var(--ms-radius);background:transparent;color:var(--ms-tx2);cursor:pointer;transition:all .15s;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;line-height:1}
.mic-btn:hover{border-color:var(--ms-tx);color:var(--ms-tx)}
.mic-btn:focus-visible{outline:2px solid var(--ms-tx);outline-offset:2px}
.mic-btn.rec{background:#c66;color:#fff;border-color:#c66;animation:mic-pulse 1.5s ease-in-out infinite}
.mic-btn.rec i{animation:mic-bounce .6s ease-in-out infinite}
@keyframes mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(204,102,102,.5)}50%{box-shadow:0 0 0 6px rgba(204,102,102,0)}}
@keyframes mic-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.mic-hint{font-family:'DM Mono',monospace;font-size:10px;color:var(--ms-tx3);letter-spacing:.04em;flex-shrink:0}
.mic-hint.rec{color:#c66}
.cap-btn{margin-left:auto;`;
if (c.includes(cssAnchor) && !c.includes('.mic-btn{padding:7px 10px')) {
  c = c.replace(cssAnchor, cssInject);
  console.log('FIX 3b: CSS mic-btn injected');
  fixes++;
} else if (c.includes('.mic-btn{padding:7px 10px')) {
  console.log('SKIP 3b: CSS mic-btn already exists');
} else {
  console.log('FAIL 3b: CSS anchor not found');
}

// ════════════════════════════════════════════════════════════
// 修复 7：JS — 语音识别模块
// ════════════════════════════════════════════════════════════
const jsAnchor = `document.getElementById('cap-btn').addEventListener('click',addCapture);`;
const jsInject = `document.getElementById('cap-btn').addEventListener('click',addCapture);

// ── 语音输入（Web Speech API 优先，Whisper 降级） ───────────────────
const micBtn=document.getElementById('mic-btn');
const micHint=document.createElement('span');
micHint.className='mic-hint';
micBtn.parentNode.insertBefore(micHint,micBtn.nextSibling);
const _SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let _recognition=null,_mediaRec=null,_audioChunks=[],_isRec=false;

function _micSetStatus(rec,hint){
  if(rec){
    micBtn.classList.add('rec');
    micBtn.innerHTML='<i class="ti ti-player-stop-filled" aria-hidden="true"></i>';
    micBtn.title='点击停止';
  }else{
    micBtn.classList.remove('rec');
    micBtn.innerHTML='<i class="ti ti-microphone" aria-hidden="true"></i>';
    micBtn.title='语音输入';
  }
  micHint.textContent=hint||'';
  if(rec)micHint.classList.add('rec');else micHint.classList.remove('rec');
}

function _micStopAll(){
  _isRec=false;
  _micSetStatus(false);
  if(_recognition){try{_recognition.stop();}catch{}_recognition=null;}
  if(_mediaRec&&_mediaRec.state!=='inactive'){try{_mediaRec.stop();}catch{}}
}

function _micStartWebSpeech(){
  const r=new _SR();
  r.lang='zh-CN';
  r.continuous=true;
  r.interimResults=true;
  let baseText=capBox.value,finalText='';
  r.onstart=()=>{baseText=capBox.value;finalText='';};
  r.onresult=(e)=>{
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal)finalText+=t;
      else interim+=t;
    }
    capBox.value=baseText+finalText+interim;
  };
  r.onerror=(e)=>{
    if(e.error==='not-allowed'||e.error==='service-not-allowed'){
      alert('麦克风权限被拒绝。请在浏览器设置中允许此站点使用麦克风。');
      _micStopAll();
    }else if(e.error!=='no-speech'&&e.error!=='aborted'){
      console.warn('SpeechRecognition error:',e.error);
    }
  };
  r.onend=()=>{if(_isRec){try{r.start();}catch{}}};
  try{
    r.start();
    _recognition=r;
    _isRec=true;
    _micSetStatus(true,'录音中…');
  }catch(err){
    alert('无法启动语音识别：'+(err.message||''));
  }
}

async function _micStartWhisper(){
  const s=getSettings();
  if(s.provider!=='openai'||!s.apiKey){
    alert('您的浏览器不支持 Web Speech API。\\n如需使用语音输入，请：\\n  1. 用 Chrome/Edge 浏览器打开本页面，或\\n  2. 在设置中切换到 OpenAI provider 并填入 API key 以启用 Whisper 模式');
    return;
  }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    _mediaRec=new MediaRecorder(stream);
    _audioChunks=[];
    _mediaRec.ondataavailable=(e)=>{if(e.data.size>0)_audioChunks.push(e.data);};
    _mediaRec.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(_audioChunks,{type:'audio/webm'});
      _micSetStatus(false,'识别中…');
      try{
        const text=await _micTranscribeWhisper(blob,s.apiKey);
        capBox.value=(capBox.value?capBox.value+' ':'')+text;
      }catch(err){
        alert('Whisper 识别失败：'+(err.message||''));
      }finally{
        _micSetStatus(false);
      }
    };
    _mediaRec.start();
    _isRec=true;
    _micSetStatus(true,'录音中…');
  }catch(err){
    alert('无法访问麦克风：'+(err.message||''));
  }
}

async function _micTranscribeWhisper(blob,key){
  const fd=new FormData();
  fd.append('file',blob,'audio.webm');
  fd.append('model','whisper-1');
  fd.append('language','zh');
  const res=await fetch('https://api.openai.com/v1/audio/transcriptions',{
    method:'POST',
    headers:{'Authorization':'Bearer '+key},
    body:fd
  });
  if(!res.ok){
    const errText=await res.text();
    throw new Error('Whisper API '+res.status+': '+errText.substring(0,200));
  }
  const data=await res.json();
  return data.text||'';
}

async function _micStart(){
  if(_SR)_micStartWebSpeech();
  else await _micStartWhisper();
}

micBtn.addEventListener('click',()=>{
  if(_isRec)_micStopAll();
  else _micStart();
});

window.addEventListener('beforeunload',()=>{if(_isRec)_micStopAll();});`;
if (c.includes(jsAnchor) && !c.includes('const micBtn=document.getElementById')) {
  c = c.replace(jsAnchor, jsInject);
  console.log('FIX 3c: JS voice module inserted');
  fixes++;
} else if (c.includes('const micBtn=document.getElementById')) {
  console.log('SKIP 3c: JS voice module already exists');
} else {
  console.log('FAIL 3c: JS anchor not found');
}

fs.writeFileSync(p, c, 'utf8');
console.log('\n' + fixes + ' fixes applied. WROTE ' + c.length + ' chars (delta +' + (c.length - before) + ')');
