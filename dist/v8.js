/* Presentation refinements only; no workspace writes. */
(function(){const previous=render;
function decorate(){
 document.querySelectorAll('.profile small,.v4-person small').forEach(e=>e.textContent='本地工作空间');
 const crumb=document.querySelector('.crumb');if(selected&&crumb){crumb.textContent='项目台账 / '+getp(selected).name;}
 const count=document.querySelector('.nav[aria-label="项目台账"] small');if(count){count.title='全部项目（含归档）';count.setAttribute('aria-label','全部项目 '+data.projects.length+' 个');}
 if(selected){const actions=document.querySelector('.heading .actions'),archive=actions?.querySelector('[data-action="archive"]');if(archive){const more=document.createElement('details');more.className='refine-more';more.innerHTML='<summary aria-label="更多项目操作">更多 ···</summary><div class="refine-more-menu"></div>';actions.append(more);more.querySelector('div').append(archive);}
 if(tab==='概览')document.querySelector('.detailgrid')?.remove();
 if(tab==='资料档案'){const grid=document.querySelector('.detailgrid');grid?.querySelector('aside')?.remove();if(grid)grid.style.gridTemplateColumns='minmax(0,1fr)';}
 }
 document.querySelectorAll('.v4-pie-legend small').forEach(e=>{const n=parseFloat(e.textContent);if(Number.isFinite(n))e.textContent=n.toFixed(1)+'%'});
 if(!selected&&page==='待办与风险'){const due=data.tasks.filter(t=>!t.done&&(!t.state||t.state==='action')&&t.date<=today()&&!getp(t.pid)?.archived).length;const label=document.querySelector('.daily-list-filters>span');if(label)label.textContent='今天及逾期 '+due+' 项 · “全部”包含未到期行动';}
 document.querySelectorAll('.list-toolbar').forEach(e=>{if(!e.querySelector('.refine-scope')){const s=document.createElement('span');s.className='refine-scope';s.style.display='inline';s.textContent='全部 '+data.projects.length+' · 在跟 '+data.projects.filter(p=>!p.archived).length;e.append(s);}});
}
render=function(){previous();decorate()};})();
