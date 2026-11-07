const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const memoryStore={};
const storage={getItem(k){try{return localStorage.getItem(k)}catch{return memoryStore[k]??null}},setItem(k,v){memoryStore[k]=String(v);try{localStorage.setItem(k,v)}catch{}},removeItem(k){delete memoryStore[k];try{localStorage.removeItem(k)}catch{}}};
const readJSON=(key,fallback)=>{try{return JSON.parse(storage.getItem(key))??fallback}catch{return fallback}};
window.renderRichVisual=q=>`<a class="diagram-link" href="assets/diagrams/q${String(q.n).padStart(2,'0')}.svg?v=20261107-01" target="_blank" rel="noopener">${q.diagram}<span>図を拡大 ↗</span></a>`;
