/* One toolbar for scope, view and density; existing handlers retained. */
(function(){const previous=render;render=function(){previous();if(selected||page!=='项目台账')return;const panel=document.querySelector('.content .panel');if(!panel||!panel.querySelector('#search'))return;const head=panel.querySelector('.panelhead'),archive=panel.querySelector('.list-toolbar'),focus=panel.querySelector('.project-focus');if(!head||!archive||!focus)return;const archived=archive.querySelector('[data-archive-filter="archived"]')?.classList.contains('on');const activeCount=data.projects.filter(p=>!p.archived).length,archiveCount=data.projects.filter(p=>p.archived).length;const top=document.createElement('div');top.className='ledger-toolbar';const scopes=document.createElement('div');scopes.className='ledger-scopes';scopes.setAttribute('aria-label','项目范围');const active=archive.querySelector('[data-archive-filter="active"]'),oldArchive=archive.querySelector('[data-archive-filter="archived"]'),star=focus.querySelector('[data-focus-project="starred"]'),all=focus.querySelector('[data-focus-project="all"]');function scope(label,key,on,handler){const b=document.createElement('button');b.type='button';b.dataset.ledgerScope=key;b.textContent=label;b.className=on?'active':'';b.setAttribute('aria-pressed',String(on));b.onclick=handler;scopes.append(b)}
scope('在跟 '+activeCount,'active',!archived&&projectFocus==='all',()=>{projectFocus='all';active.click()});scope('已关注 '+data.projects.filter(p=>!p.archived&&p.starred).length,'starred',!archived&&projectFocus==='starred',()=>{projectFocus='starred';active.click()});scope('归档 '+archiveCount,'archived',archived,()=>{projectFocus='all';oldArchive.click()});const stale=focus.querySelector('[data-focus-project="stale"]');if(stale)scope(stale.textContent.replace(/\s*(\d+)$/, ' $1'),'stale',!archived&&projectFocus==='stale',()=>{projectFocus='stale';active.click()});top.append(scopes);const display=document.createElement('div');display.className='ledger-display';const view=head.querySelector('.seg');if(view)display.append(view);top.append(display);panel.insertBefore(top,head);head.remove();archive.remove();focus.remove();const filters=panel.querySelector('.filters');filters.classList.add('ledger-search');const input=filters.querySelector('#search');input.placeholder='搜索项目、单位、背景或进展';const n=panel.querySelectorAll('tbody tr.project').length||panel.querySelectorAll('.boardcard').length;addLedgerStageFilter(filters);addLedgerDateFilter(filters);if(query||filter||ledgerDates.start||ledgerDates.end){const info=document.createElement('div');info.className='ledger-filter-result';info.innerHTML='<span>找到 '+n+' 个项目</span>'+ (filter?'<span class="filter-chip">阶段：'+esc(filter)+'</span>':'')+'<button type="button">清除筛选</button>';info.querySelector('button').onclick=()=>{query='';filter='';ledgerDates={field:'followup',start:'',end:''};render()};filters.after(info)}
};})();

function addLedgerDateFilter(filters) {
  const { field, start, end } = ledgerDates;
  const details = document.createElement('details');
  details.className = 'ledger-settings ledger-filter ledger-date-filter';
  const summary = document.createElement('summary');
  const label = field === 'created' ? '登记日期' : '最近跟进';
  summary.textContent = start || end ? label + ' · ' + (start || '不限') + ' 至 ' + (end || '不限') : '时间筛选';
  const form = document.createElement('form');
  form.className = 'ledger-settings-menu ledger-date-menu';
  form.innerHTML = '<h3>时间筛选</h3><fieldset class="ledger-date-basis"><legend>日期依据</legend><label><input type="radio" name="field" value="followup">最近跟进</label><label><input type="radio" name="field" value="created">登记日期</label></fieldset><label>开始日期<input name="start" type="date"></label><label>结束日期<input name="end" type="date"></label><div class="ledger-date-actions"><button type="button">清除时间</button><button class="primary" type="submit">应用</button></div>';
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

function addLedgerStageFilter(filters) {
  const select = filters.querySelector('#filter');
  if (!select) return;

  const details = document.createElement('details');
  details.className = 'ledger-filter ledger-stage-filter';
  const summary = document.createElement('summary');
  summary.textContent = select.selectedOptions[0]?.textContent || '所有阶段';
  summary.setAttribute('aria-label', '项目阶段：' + summary.textContent);

  const options = document.createElement('div');
  options.className = 'ledger-stage-options';
  options.setAttribute('role', 'group');
  options.setAttribute('aria-label', '项目阶段选项');
  for (const option of select.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.textContent;
    button.setAttribute('aria-pressed', String(option.selected));
    button.onclick = () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      document.querySelector('.ledger-stage-filter > summary')?.focus();
    };
    options.append(button);
  }

  select.hidden = true;
  details.append(summary, options);
  select.after(details);
}

document.addEventListener('click', event => {
  for (const panel of document.querySelectorAll('.ledger-filter[open]')) {
    if (!panel.contains(event.target)) panel.open = false;
  }
});

document.addEventListener('keydown', event => {
  const panel = event.target.closest?.('.ledger-filter[open]');
  if (event.key !== 'Escape' || !panel) return;
  event.preventDefault();
  panel.open = false;
  panel.querySelector('summary').focus();
});
