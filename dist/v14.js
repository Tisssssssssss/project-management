/* One toolbar for scope, view and density; existing handlers retained. */
(function(){const previous=render;render=function(){previous();if(selected||page!=='项目台账')return;const panel=document.querySelector('.content .panel');if(!panel||!panel.querySelector('#search'))return;const head=panel.querySelector('.panelhead'),archive=panel.querySelector('.list-toolbar'),focus=panel.querySelector('.project-focus');if(!head||!archive||!focus)return;const archived=archive.querySelector('[data-archive-filter="archived"]')?.classList.contains('on');const activeCount=data.projects.filter(p=>!p.archived).length,archiveCount=data.projects.filter(p=>p.archived).length;const top=document.createElement('div');top.className='ledger-toolbar';const scopes=document.createElement('div');scopes.className='ledger-scopes';scopes.setAttribute('aria-label','项目范围');const active=archive.querySelector('[data-archive-filter="active"]'),oldArchive=archive.querySelector('[data-archive-filter="archived"]'),star=focus.querySelector('[data-focus-project="starred"]'),all=focus.querySelector('[data-focus-project="all"]');function scope(label,key,on,handler){const b=document.createElement('button');b.type='button';b.dataset.ledgerScope=key;b.textContent=label;b.className=on?'active':'';b.setAttribute('aria-pressed',String(on));b.onclick=handler;scopes.append(b)}
scope('在跟 '+activeCount,'active',!archived&&projectFocus==='all',()=>{projectFocus='all';active.click()});scope('已关注 '+data.projects.filter(p=>!p.archived&&p.starred).length,'starred',!archived&&projectFocus==='starred',()=>{projectFocus='starred';active.click()});scope('归档 '+archiveCount,'archived',archived,()=>{projectFocus='all';oldArchive.click()});const stale=focus.querySelector('[data-focus-project="stale"]');if(stale)scope(stale.textContent,'stale',!archived&&projectFocus==='stale',()=>{projectFocus='stale';active.click()});top.append(scopes);const display=document.createElement('div');display.className='ledger-display';const view=head.querySelector('.seg');if(view)display.append(view);const density=archive.querySelector('.refine-density');if(density&&view?.querySelector('[data-view="table"].on')){const settings=document.createElement('details');settings.className='ledger-settings';settings.innerHTML='<summary>显示设置</summary>';const pop=document.createElement('div');pop.className='ledger-settings-menu';pop.innerHTML='<span>列表密度</span>';pop.append(density);density.querySelectorAll('[data-density]').forEach(b=>b.setAttribute('aria-label',b.dataset.density==='compact'?'紧凑':'舒适'));settings.append(pop);display.append(settings)}top.append(display);panel.insertBefore(top,head);head.remove();archive.remove();focus.remove();const filters=panel.querySelector('.filters');filters.classList.add('ledger-search');const input=filters.querySelector('#search');input.placeholder='搜索项目、单位、背景或进展';const n=panel.querySelectorAll('tbody tr.project').length||panel.querySelectorAll('.boardcard').length;addLedgerDateFilter(filters);if(query||filter||ledgerDates.start||ledgerDates.end){const info=document.createElement('div');info.className='ledger-filter-result';info.innerHTML='<span>找到 '+n+' 个项目</span>'+ (filter?'<span class="filter-chip">阶段：'+esc(filter)+'</span>':'')+'<button type="button">清除筛选</button>';info.querySelector('button').onclick=()=>{query='';filter='';ledgerDates={field:'followup',start:'',end:''};render()};filters.after(info)}
};})();

function addLedgerDateFilter(filters) {
  const { field, start, end } = ledgerDates;
  const details = document.createElement('details');
  details.className = 'ledger-settings ledger-date-filter';
  const summary = document.createElement('summary');
  const label = field === 'created' ? '登记日期' : '最近跟进';
  summary.textContent = start || end ? label + ' · ' + (start || '不限') + ' 至 ' + (end || '不限') : '时间筛选';
  const form = document.createElement('form');
  form.className = 'ledger-settings-menu ledger-date-menu';
  form.innerHTML = '<label>日期依据<select name="field"><option value="followup">最近跟进</option><option value="created">登记日期</option></select></label><label>开始日期<input name="start" type="date"></label><label>结束日期<input name="end" type="date"></label><div class="ledger-date-actions"><button type="button">清除时间</button><button class="primary" type="submit">应用</button></div>';
  form.elements.field.value = field;
  form.elements.start.value = start;
  form.elements.end.value = end;
  form.elements.start.oninput = form.elements.end.oninput = () => form.elements.end.setCustomValidity('');
  form.onsubmit = event => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(form));
    if (next.start && next.end && next.start > next.end) {
      form.elements.end.setCustomValidity('结束日期须不早于开始日期');
      form.elements.end.reportValidity();
      return;
    }
    ledgerDates = next;
    render();
  };
  form.querySelector('[type="button"]').onclick = () => {
    ledgerDates = { field, start: '', end: '' };
    render();
  };
  details.append(summary, form);
  filters.append(details);
}
