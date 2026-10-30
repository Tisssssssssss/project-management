(function(){
if(new URLSearchParams(location.search).get('view')==='projects')page='项目台账';
const previousList=projectlist,previousRender=render,previousAction=action;
let currentIds=[],exportBusy=false,hideTimer;
function hideBackground(){document.querySelector('#background-tip')?.remove()}
function backgroundDetail(pid){hideBackground();const p=getp(pid);modal('项目背景',`<div class="field full"><b>${esc(p.name)}</b><p class="muted small">${esc(p.unit)}</p><div class="background-full">${esc(p.background?.trim()||'待补充')}</div></div>`,()=>{},{readonly:true,drawer:true})}
projectlist=function(){
 const host=document.createElement('div');host.innerHTML=previousList();
 currentIds=[...new Set(Array.from(host.querySelectorAll('[data-project]')).map(el=>el.dataset.project))];
 const head=host.querySelector('thead tr');
 if(head){const th=document.createElement('th');th.className='background-column';th.textContent='项目背景';head.insertBefore(th,head.children[1]);}
 host.querySelectorAll('tr.project').forEach(row=>{const p=getp(row.dataset.project),td=document.createElement('td');td.className='background-column';td.innerHTML=`<button class="background-preview ${p.background?.trim()?'':'is-empty'}" data-background="${p.id}" aria-label="查看${esc(p.name)}项目背景"><span>${esc(p.background?.trim()||'待补充')}</span></button>`;row.insertBefore(td,row.children[1]);});
 const search=host.querySelector('#search');if(search)search.placeholder='⌕  搜索项目、单位、背景或进展…';
 return host.innerHTML;
};
function selectedProjects(all=false){if(all)return data.projects;const ids=new Set(currentIds);return data.projects.filter(p=>ids.has(p.id))}
function rowsFor(ps){return ps.map(p=>{const e=latest(p),t=data.tasks.filter(t=>t.pid===p.id&&!t.done).sort((a,b)=>a.date.localeCompare(b.date))[0],basis=p.basis||'',cycle=basis.includes('/年')?'年度':basis.includes('/月')?'月度':basis.includes('/总额')?'全周期':'待确认',kind=basis.includes('合同')?'合同':basis.includes('报价')?'报价':basis.includes('预算')?'预算':p.amount==null?'待确认':'参考金额';return [p.unit,p.name,p.background?.trim()||'',p.bu||'',p.owner||'',p.stage,p.amount==null?null:Number(p.amount),'万元',kind,cycle,p.amount==null||!p.confirmed?'待确认':'已确认',e?.date||null,e?[e.title,e.body].filter(Boolean).join('\n'):'',t?.title||'',t?.date||null,p.archived?'已归档':'在跟',p.type||'',created(p)||null]})}
async function exportExcel(all=false){
 if(exportBusy)return;const ps=selectedProjects(all);if(!ps.length){toast('当前筛选结果为空，请调整筛选条件后导出');return}
 exportBusy=true;decorateExport();
 try{const res=await fetch('/api/export-xlsx',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows:rowsFor(ps),date:today()})});if(!res.ok){const err=await res.json();throw Error(err.error||'Excel导出失败')};const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='项目台账_'+today()+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(`已导出 ${ps.length} 个项目的 Excel`)}catch(e){toast('导出失败：'+e.message)}finally{exportBusy=false;decorateExport()}
}
function decorateExport(){
 if(page!=='项目台账'||selected)return;
 const btn=document.querySelector('.heading .actions [data-action="export"]');if(!btn)return;
 btn.textContent=exportBusy?'正在生成 Excel…':'↓ 导出 Excel';btn.disabled=exportBusy;btn.title=`默认导出当前筛选的 ${currentIds.length} 个项目`;
 if(!document.querySelector('.excel-export-group')){const box=document.createElement('div');box.className='excel-export-group';btn.before(box);box.append(btn);const more=document.createElement('button');more.className='excel-export-more';more.setAttribute('aria-label','选择Excel导出范围');more.setAttribute('aria-expanded','false');more.textContent='⌄';box.append(more);const menu=document.createElement('div');menu.className='excel-export-menu';menu.hidden=true;menu.setAttribute('role','menu');box.append(menu);more.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden))};}
 const menu=document.querySelector('.excel-export-menu');if(menu){menu.innerHTML=`<button role="menuitem" data-excel-current>当前筛选结果 <small>${currentIds.length} 个项目</small></button><button role="menuitem" data-excel-all>全部项目 <small>${data.projects.length} 个，含归档</small></button>`;menu.querySelector('[data-excel-current]').onclick=()=>{menu.hidden=true;exportExcel(false)};menu.querySelector('[data-excel-all]').onclick=()=>{menu.hidden=true;exportExcel(true)}}
}
function showBackground(el){const p=getp(el.dataset.background);if(!p?.background?.trim())return;clearTimeout(hideTimer);hideBackground();const tip=document.createElement('div');tip.id='background-tip';tip.className='background-tooltip';tip.setAttribute('role','tooltip');tip.textContent=p.background;document.body.append(tip);const r=el.getBoundingClientRect(),w=tip.offsetWidth;tip.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left))+'px';const below=r.bottom+9;tip.style.top=(below+tip.offsetHeight<innerHeight-10?below:Math.max(10,r.top-tip.offsetHeight-9))+'px';tip.onpointerenter=()=>clearTimeout(hideTimer);tip.onpointerleave=hideBackground;}
function decorate(){
 decorateExport();
 document.querySelectorAll('[data-background]').forEach(el=>{el.onclick=e=>{e.stopPropagation();backgroundDetail(el.dataset.background)};el.onkeydown=e=>e.stopPropagation();el.onpointerenter=()=>showBackground(el);el.onpointerleave=()=>{hideTimer=setTimeout(hideBackground,130)};el.onfocus=()=>showBackground(el);el.onblur=hideBackground;});
 const csv=document.querySelector('.settings-v3 [data-action="csv"]');if(csv){csv.textContent='导出全部项目 Excel';csv.onclick=()=>exportExcel(true)}
}
action=function(a){if(a==='export'&&page==='项目台账'&&!selected)return exportExcel(false);return previousAction(a)};
render=function(){hideBackground();previousRender();decorate()};
document.addEventListener('click',e=>{if(!e.target.closest('.excel-export-group')){const menu=document.querySelector('.excel-export-menu');if(menu){menu.hidden=true;document.querySelector('.excel-export-more')?.setAttribute('aria-expanded','false')}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideBackground();const menu=document.querySelector('.excel-export-menu');if(menu)menu.hidden=true}});
window.YunchengExcel={rowsFor,selectedProjects};
})();
