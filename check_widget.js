// 检查 widget.md HTML 块是否完整（包含语音输入等最新功能）
const fs = require('fs');
const c = fs.readFileSync('c:/Users/石晴/Desktop/mindos-skill/widget.md', 'utf8');
const lines = c.split('\n');

let s = -1, e = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^```html/) && s === -1) s = i;
  else if (s >= 0 && lines[i].match(/^```$/) && e === -1) { e = i; break; }
}
const widget = lines.slice(s + 1, e).join('\n');
console.log('HTML block: lines', s + 1, 'to', e, '(', widget.length, 'chars )');

// 关键功能验证
const checks = {
  'mic-btn in HTML': widget.includes('id="mic-btn"'),
  '_micStartWebSpeech': widget.includes('_micStartWebSpeech'),
  'apiKey exclusion on save': widget.includes("Object.assign({}, _cfgCache, {apiKey:''})"),
  'renderReview default param': widget.includes('function renderReview(period=revPeriod,data)'),
  'theme-btn in HTML': widget.includes('id="theme-btn"'),
  '8 nav-items': (widget.match(/class="nav-item"/g) || []).length + (widget.match(/class="nav-item active"/g) || []).length,
};
console.log('\n=== Feature checks ===');
for (const [k, v] of Object.entries(checks)) {
  console.log((v ? 'OK' : 'FAIL') + '  ' + k + ' = ' + v);
}
