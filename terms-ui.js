const TERM_STORAGE_KEY="fe-completion-20251214-v1-term-progress";
const termState={
  filter:"すべて",
  query:"",
  question:"",
  reviewMode:"all",
  active:0,
  flipped:false,
  progress:readJSON(TERM_STORAGE_KEY,{})
};
const termFields=["すべて",...new Set(TERMS.map(t=>t.field))];
const termStatusLabel={known:"説明できた",shaky:"少し不安",weak:"説明できない"};
const termStatusClass={known:"known",shaky:"shaky",weak:"weak"};
const termStatusRank={weak:0,shaky:1,known:2};
const termEsc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function saveTermProgress(){
  storage.setItem(TERM_STORAGE_KEY,JSON.stringify(termState.progress));
}
function termStatus(term){
  return termState.progress[term.id]?.status||"";
}
function termAnswered(term){
  return !!termStatus(term);
}
function filteredTerms(){
 const query=termState.query.trim().toLowerCase();
 const number=query.match(/^(?:問)?(\d+)$/)?.[1];
 return TERMS.filter(t=>(!termState.question||t.questions.includes(Number(termState.question)))
   &&(termState.reviewMode==='all'||(termState.reviewMode==='due'?FEReview.due(termState.progress[t.id]):termState.reviewMode==='unseen'?!termState.progress[t.id]:['weak','shaky'].includes(termState.progress[t.id]?.status)))
   &&(!query||(number?t.questions.includes(Number(number)):[t.term,...(t.aliases||[]),t.fullName||"",t.nameMeaning||"",t.wordClue||"",t.meaning,t.trap,t.field].join(' ').toLowerCase().includes(query))));
}
function termReviewContext(){
  if(typeof window.getTermReviewState==="function")return window.getTermReviewState();
  return {graded:false,questionNumbers:[]};
}
function weakTermsFromAnswers(){
  const state=termReviewContext();
  if(!state.graded)return [];
  const selected=new Set(state.questionNumbers.map(Number));
  return TERMS.filter(t=>t.questions.some(n=>selected.has(n)));
}
function reviewTermMessage(){
  const state=termReviewContext();
  if(!state.graded)return "採点後に、復習におすすめの用語を表示します。";
  if(!state.questionNumbers.length)return "採点対象の全問で正答できました。重要用語カードで理解を深めましょう。";
  return "該当する用語カードはありません。各問題の解説で復習できます。";
}
function setActiveTerm(index){
  const list=filteredTerms();
  termState.active=Math.max(0,Math.min(index,list.length-1));
  termState.flipped=false;
  renderTerms();
}
function jumpToTerm(termId){
  const target=TERMS.find(t=>t.id===termId);
  if(!target)return;
  termState.query="";termState.question=String(target.q);termState.reviewMode="all";
  const reviewMode=document.querySelector("#termReviewMode");if(reviewMode)reviewMode.value="all";
  const search=document.querySelector('#termSearch');if(search)search.value="";
  const question=document.querySelector('#termQuestion');if(question)question.value=termState.question;

  const index=filteredTerms().findIndex(t=>t.id===termId);
  setActiveTerm(index<0?0:index);
}
function markTerm(status){
  const list=filteredTerms();
  const term=list[termState.active];
  if(!term)return;
  termState.progress[term.id]=FEReview.schedule(termState.progress[term.id],status);
  saveTermProgress();
  const remaining=filteredTerms();
  const currentIndex=remaining.findIndex(t=>t.id===term.id);
  termState.active=Math.min(currentIndex<0?termState.active:currentIndex+1,Math.max(0,remaining.length-1));
  termState.flipped=false;
  renderTerms();
}
function renderTerms(){
  const section=document.querySelector("#termLearning");
  if(!section)return;
  const list=filteredTerms();
  if(termState.active>=list.length)termState.active=0;
  const active=list[termState.active];
  const known=TERMS.filter(t=>termStatus(t)==="known").length;
  const shaky=TERMS.filter(t=>termStatus(t)==="shaky").length;
  const weak=TERMS.filter(t=>termStatus(t)==="weak").length;
  const wrongWeak=weakTermsFromAnswers();
  const due=TERMS.filter(t=>FEReview.due(termState.progress[t.id])).length;
  document.querySelector("#termStats").innerHTML=[
    ["全カード",TERMS.length],
    ["説明できた",known],
    ["少し不安",shaky],
    ["説明できない",weak],
    ["復習時刻が来た",due]
  ].map(([label,value])=>`<div><strong>${value}</strong><span>${label}</span></div>`).join("");
  const filters=document.querySelector("#termFilters");
  if(filters)filters.innerHTML="";
  const card=document.querySelector("#termCard");
  if(!active){
    card.innerHTML=`<p class="term-empty">${termState.reviewMode==='due'?'いま復習予定のカードはありません。「未学習」を選ぶか、次の復習予定時刻に取り組みましょう。':'条件に一致する用語がありません。'}</p>`;
  }else{
    const status=termStatus(active);
    card.className=`term-card ${termState.flipped?"flipped":""} ${termStatusClass[status]||""}`;
    card.innerHTML=`
      <div class="term-card-top">
        <span>${termEsc(active.field)}</span>
        <a href="#q${active.q}">関連問題：問${active.questions.join("・問")}</a>
      </div>
      <button class="term-flip" type="button" aria-expanded="${termState.flipped}">
        <span class="term-face front">
          <small>答えを見る前に、自分の言葉で説明できる？</small>
          <strong>${termEsc(active.term)}</strong>
          <em>クリックして説明例を見る</em>
        </span>
        <span class="term-face back">
          <small>用語・考え方の意味</small>
          <strong>${termEsc(active.term)}</strong>
          ${active.aliases?.length?`<p class="term-aliases">別名・表記：${active.aliases.map(termEsc).join(" ／ ")}</p>`:""}
          ${active.fullName?`<p class="acronym-name"><b>${termEsc(active.abbreviation)}の正式名称</b><span lang="en">${termEsc(active.fullName)}</span><span>${termEsc(active.nameMeaning)}</span></p>`:""}
          ${active.wordClue?`<p class="word-clue">${termEsc(active.wordClue)}</p>`:""}
          <p>${termEsc(active.meaning)}</p>
          <i><strong class="choice-context">見分け方・注意点</strong>${termEsc(active.trap)}</i>
        </span>
      </button>
      <div class="term-tags">${active.tags.map(tag=>`<span>${termEsc(tag)}</span>`).join("")}</div>
      <div class="term-grade">
        <button type="button" data-term-status="known">説明できた</button>
        <button type="button" data-term-status="shaky">少し不安</button>
        <button type="button" data-term-status="weak">説明できない</button>
      </div>
      ${status?`<p class="term-current">現在：${termStatusLabel[status]}<br>次の復習：${termState.progress[active.id].nextReviewAt?FEReview.dateLabel(termState.progress[active.id].nextReviewAt):"旧記録のため次回の評価で予定を設定"}</p>`:""}
    `;
  }
  const termList=document.querySelector("#termList");
  if(termList)termList.innerHTML=list.map((t,i)=>{
    const status=termStatus(t);
    return `<button type="button" class="${i===termState.active?"active":""} ${termStatusClass[status]||""}" data-term-index="${i}">
      <b>${termEsc(t.term)}</b><span>関連：問${t.questions.join("・問")}</span>
    </button>`;
  }).join("");
  document.querySelector("#termWeakLinks").innerHTML=wrongWeak.length
    ?wrongWeak.slice(0,16).map(t=>`<a href="#termLearning" data-term-jump="${t.id}">${termEsc(t.term)}<span>関連：問${t.questions.join("・問")}</span></a>`).join("")
    :`<span>${termEsc(reviewTermMessage())}</span>`;
  document.querySelector("#termPosition").textContent=list.length?`${termState.active+1} / ${list.length}`:"0 / 0";
}
function initTerms(){
  const section=document.querySelector("#termLearning");
  if(!section)return;
  document.querySelector("#termCard").onclick=e=>{
    if(e.target.closest("[data-term-status]")){
      markTerm(e.target.closest("[data-term-status]").dataset.termStatus);
      return;
    }
    if(e.target.closest(".term-flip")){
      termState.flipped=!termState.flipped;
      renderTerms();
    }
  };
  const resetFilter=()=>{termState.active=0;termState.flipped=false;renderTerms()};
  document.querySelector('#termReviewMode').onchange=e=>{termState.reviewMode=e.target.value;resetFilter()};
  document.querySelector('#todayReview').onclick=()=>{termState.query="";termState.question="";termState.reviewMode="due";document.querySelector('#termSearch').value="";document.querySelector('#termQuestion').value="";document.querySelector('#termReviewMode').value="due";resetFilter()};
  const runTermSearch=()=>{const query=document.querySelector('#termSearch').value;if(termState.query===query)return;termState.query=query;resetFilter()};
  document.querySelector('#termSearch').oninput=runTermSearch;
  document.querySelector('#termSearch').onchange=runTermSearch;
  document.querySelector('#termSearch').onkeydown=e=>{if(e.key==='Enter')runTermSearch()};
  document.querySelector('#termSearchButton').onclick=runTermSearch;
  document.querySelector('#termQuestion').onchange=e=>{termState.question=e.target.value;resetFilter()};
  const termList=document.querySelector("#termList");
  if(termList)termList.onclick=e=>{
    const button=e.target.closest("[data-term-index]");
    if(button)setActiveTerm(Number(button.dataset.termIndex));
  };
  document.querySelector("#termWeakLinks").onclick=e=>{
    const link=e.target.closest("[data-term-jump]");
    if(!link)return;
    jumpToTerm(link.dataset.termJump);
  };
  document.addEventListener("click",e=>{
    const link=e.target.closest("[data-term-ref]");
    if(!link)return;
    jumpToTerm(link.dataset.termRef);
  });
  document.querySelector("#termPrev").onclick=()=>setActiveTerm(termState.active-1);
  document.querySelector("#termNext").onclick=()=>setActiveTerm(termState.active+1);
  document.querySelector("#termReset").onclick=()=>{
    if(confirm("用語カードの覚えた/あやしい/覚えていないの記録を消しますか？")){
      termState.progress={};
      saveTermProgress();
      renderTerms();
    }
  };
  renderTerms();
}
initTerms();
