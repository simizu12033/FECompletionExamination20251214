window.FEReview=(()=>{
 const DAY=86400000;
 function due(entry,now=Date.now()){return !!entry&&(!entry.nextReviewAt||new Date(entry.nextReviewAt).getTime()<=now)}
 function schedule(previous,status,now=Date.now()){
  if(!['known','shaky','weak'].includes(status))throw new RangeError('Unknown review status');
  const old=previous||{},count=Number(old.reviewCount)||0;
  // Only advance a successful interval when the preceding review is due.
  const streak=status==='known'?(old.status==='known'&&!due(old,now)?Math.max(1,Number(old.successStreak)||1):(Number(old.successStreak)||0)+1):0;
  const days=[1,3,7,14,30][Math.min(Math.max(streak-1,0),4)];
  const delay=status==='known'?days*DAY:status==='shaky'?DAY:10*60000;
  return{status,updatedAt:new Date(now).toISOString(),nextReviewAt:new Date(now+delay).toISOString(),successStreak:streak,reviewCount:count+1};
 }
 function dateLabel(iso){return iso?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)):'未設定'}
 return{due,schedule,dateLabel};
})();

window.FEStudy=(()=>{
 const KEY='fe-completion-20251214-v1-depth-study';
 let state=readJSON(KEY,{recall:{},labs:{}});
 state.recall ||= {}; state.labs ||= {};
 const save=()=>storage.setItem(KEY,JSON.stringify(state));
 const fmt=x=>Number(x).toLocaleString('ja-JP',{maximumFractionDigits:5});
 const CONFIG={
 3:{title:'7ビット値と偶数パリティ',fields:[['code','7ビットの値（10進数）',122,0,127]],calc:p=>{const bits=p.code.toString(2).padStart(7,'0'),ones=[...bits].filter(x=>x==='1').length,parity=ones%2;return `7ビット ${bits}（1が${ones}個）。先頭に${parity}を付加 → ${parity}${bits} → 16進 ${(p.code+parity*128).toString(16).toUpperCase().padStart(2,'0')}`}},
 12:{title:'MTBF・MTTRと稼働率',fields:[['mtbf','平均故障間隔MTBF（時間）',900,1,100000],['mttr','平均修理時間MTTR（時間）',100,1,100000]],calc:p=>`稼働率＝${fmt(p.mtbf)}÷(${fmt(p.mtbf)}＋${fmt(p.mttr)})＝${fmt(p.mtbf/(p.mtbf+p.mttr)*100)}％。MTBFを長く、MTTRを短くすると改善します。`},
 57:{title:'加工時間を変えて4つの順序を比較',fields:[['a1','AのM1加工時間',7,1,50],['a2','AのM2加工時間',3,1,50],['b1','BのM1加工時間',5,1,50],['b2','BのM2加工時間',6,1,50],['c1','CのM1加工時間',4,1,50],['c2','CのM2加工時間',2,1,50]],calc:p=>{const orders=['ACB','BAC','BCA','CBA'];const results=orders.map(order=>{let m1=0,m2=0;for(const v of order){const k=v.toLowerCase();m1+=p[k+'1'];m2=Math.max(m1,m2)+p[k+'2'];}return{order,time:m2}});const best=Math.min(...results.map(r=>r.time));return results.map(r=>`${r.order.split('').join('→')}: ${r.time}時間${r.time===best?'（4つの候補の中で最短）':''}`).join(' ／ ')}},
 4:{title:'格子の経路数を変える',fields:[['x','右へ進む回数',2,0,12],['y','上へ進む回数',2,0,12]],calc:p=>{let v=1;for(let i=1;i<=p.y;i++)v=v*(p.x+i)/i;return `最短経路は ${Math.round(v)} 通り。Rを通る場合は前半と後半の通り数を掛けます。`}},
 8:{title:'クロック周波数と実行時間',fields:[['cycles','合計サイクル数',30,1,100000],['mhz','周波数（MHz）',100,1,10000]],calc:p=>`${p.cycles} ÷ ${p.mhz} × 1000 ＝ ${fmt(p.cycles/p.mhz*1000)} ns`},
 25:{title:'最終オクテットと/28のネットワーク',fields:[['host','IPアドレスの最終オクテット',19,0,255]],calc:p=>`ネットワークは10.170.70.${Math.floor(p.host/16)*16}、ブロードキャストは10.170.70.${Math.floor(p.host/16)*16+15}（/28）`},
 50:{title:'設定価格と需要の一次関係',fields:[['price','価格（円）',1500,1000,3000]],calc:p=>`需要＝60000－30×(${p.price}－1000)＝${fmt(60000-30*(p.price-1000))} 個`},
 59:{title:'客席回転数と目標利益',fields:[['profit','月の目標利益（円）',100000,0,1000000],['fixed','月の固定費（円）',300000,0,1000000],['days','営業日数',20,1,31],['seats','客席数',10,1,100]],calc:p=>`必要客数＝(${fmt(p.fixed)}＋${fmt(p.profit)})÷400＝${fmt((p.fixed+p.profit)/400)} 人／月。1席1日当たり ${fmt((p.fixed+p.profit)/400/p.days/p.seats)} 人（客単価500円・変動費100円）`}
 };
 function mountLab(q){
  const c=CONFIG[q.n];if(!c)return null;
  const section=document.createElement('details');section.className='practice-lab';section.id=`lab-${q.n}`;
  section.innerHTML=`<summary>任意の参考演習：${esc(c.title)}</summary><p class="lab-note">まず結果を予想し、条件を変えて比較してください。</p><form class="lab-inputs">${c.fields.map(([key,label,value,min,max])=>`<label>${esc(label)}<input type="number" data-param="${key}" min="${min}" max="${max}" step="${['time','speed'].includes(key)?'0.1':'1'}" value="${esc(state.labs[q.n]?.[key]??value)}"></label>`).join('')}</form><p class="lab-result" aria-live="polite"></p>`;
  const show=()=>{const params={};let valid=true;section.querySelectorAll('[data-param]').forEach(input=>{params[input.dataset.param]=Number(input.value);if(input.value===''||!input.checkValidity())valid=false});section.querySelector('.lab-result').textContent=valid?c.calc(params):'各入力欄の範囲内で値を入力してください。';if(valid){state.labs[q.n]=params;save()}};
  section.querySelector('form').onsubmit=e=>e.preventDefault();section.oninput=show;show();return section;
 }
 function enhanceQuestion(node,q){
  const root=node.querySelector('.review-content');
  const fast=document.createElement('section');fast.className='fast-route';fast.innerHTML=`<p class="study-step">まずは要点</p><h3>この問題を解くための要点</h3><p>${esc(q.keyPoint)}</p><p class="reference-hint">下の図と対応表で確認できます。詳しい説明や選択肢比較は、必要な部分だけ開いてください。</p>`;root.prepend(fast);
  const lab=mountLab(q);if(lab)root.append(lab);
  const recall=document.createElement('details');recall.className='recall-check reference-details';const record=state.recall[q.n]||{};
  recall.innerHTML=`<summary>任意のメモ・説明練習（課題の提出欄ではありません）</summary><div class="reference-body"><h3>説明を整理したいときに</h3><p class="reference-hint">自分の理解を整理する個人用メモです。入力・自己評価は問題課題の達成条件に含みません。</p><p>${esc(q.deep.check)}</p><label for="recall-${q.n}">あなたの説明（自動保存）</label><textarea id="recall-${q.n}" maxlength="1000" rows="3" placeholder="正答の根拠を自分の言葉で書きましょう。">${esc(record.draft||'')}</textarea><details class="recall-example"><summary>解答例と比べる</summary><p>${esc(q.deep.answer)}</p><p>説明の理解度は自己評価です。</p><button type="button" data-recall="known">自力で説明できた</button><button type="button" data-recall="again">もう一度確認する</button></details><p class="recall-state" aria-live="polite"></p></div>`;
  const show=()=>{const s=state.recall[q.n]?.status;recall.querySelector('.recall-state').textContent=s==='known'?'自己評価：自力で説明できた':s==='again'?'自己評価：もう一度確認する':'説明を書いてから解答例を確認しましょう。'};
  recall.querySelector('textarea').oninput=e=>{state.recall[q.n]={...(state.recall[q.n]||{}),draft:e.target.value.slice(0,1000)};save()};
  recall.onclick=e=>{const status=e.target.closest('[data-recall]')?.dataset.recall;if(status){state.recall[q.n]={...(state.recall[q.n]||{}),status};save();show()}};show();root.append(recall);
 }
 function openPractice(n){const q=QUESTIONS.find(q=>q.n===Number(n));if(!q||!CONFIG[q.n])return;learningState.revealed.add(q.n);learningState.filter='すべて';learningState.query='';learningState.onlyUnlearned=false;learningState.focus='all';document.querySelector('#searchInput').value='';document.querySelector('#onlyUnlearned').checked=false;document.querySelector('#questionFocus').value='all';saveLearning();renderLearning();const lab=document.getElementById(`lab-${q.n}`);if(lab){lab.open=true;lab.scrollIntoView({behavior:'smooth',block:'start'})}}
 document.querySelector('#openPractice').onclick=()=>openPractice(document.querySelector('#practiceSelect').value);
 return {KEY,enhanceQuestion,openPractice,practiceNumbers:Object.keys(CONFIG).map(Number),recallStatus:n=>state.recall[n]?.status,calculate:(n,p)=>CONFIG[n].calc(p)};
})();
