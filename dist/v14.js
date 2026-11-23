/* Project ledger controls. The workspace layout calls this after rendering the ledger. */
function setupLedgerControls(content) {
  const panel = content.querySelector('.panel');
  const head = panel?.querySelector('.panelhead');
  const filters = panel?.querySelector('.filters');
  const search = filters?.querySelector('#search');
  if (!head || !search) return;

  const archived = showArchived;
  const top = document.createElement('div');
  top.className = 'ledger-toolbar';
  const scopes = document.createElement('div');
  scopes.className = 'ledger-scopes';
  scopes.setAttribute('aria-label', '项目范围');

  const addScope = (key, label, pressed, focusKey) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.ledgerScope = key;
    button.textContent = label;
    button.classList.toggle('active', pressed);
    button.setAttribute('aria-pressed', String(pressed));
    button.onclick = () => setLedgerScope(key === 'archived', focusKey);
    scopes.append(button);
  };
  const current = data.projects.filter(project => !project.archived);
  const archiveCount = data.projects.length - current.length;
  addScope('active', '在跟 ' + current.length, !archived && projectFocus === 'all', 'all');
  addScope('starred', '已关注 ' + current.filter(project => project.starred).length,
    !archived && projectFocus === 'starred', 'starred');
  addScope('archived', '归档 ' + archiveCount, archived, 'all');
  const staleCount = current.filter(isLedgerProjectStale).length;
  if (staleCount || projectFocus === 'stale') {
    addScope('stale', '长期未跟进 ' + staleCount,
      !archived && projectFocus === 'stale', 'stale');
  }

  const display = document.createElement('div');
  display.className = 'ledger-display';
  const viewSwitch = head.querySelector('.seg');
  if (viewSwitch) display.append(viewSwitch);
  top.append(scopes, display);
  head.replaceWith(top);

  filters.classList.add('ledger-search');
  search.placeholder = '搜索项目、单位、背景或进展';
  addLedgerStageFilter(filters);
  addLedgerDateFilter(filters);
  if (!query && !filter && !ledgerDates.start && !ledgerDates.end) return;

  const count = panel.querySelectorAll('tbody tr.project').length || panel.querySelectorAll('.boardcard').length;
  const info = document.createElement('div');
  info.className = 'ledger-filter-result';
  info.innerHTML = '<span>找到 ' + count + ' 个项目</span>' +
    (filter ? '<span class="filter-chip">阶段：' + esc(filter) + '</span>' : '') +
    '<button type="button">清除筛选</button>';
  info.querySelector('button').onclick = () => {
    query = '';
    filter = '';
    ledgerDates = { field: 'followup', start: '', end: '' };
    render();
  };
  filters.after(info);
}

function addLedgerDateFilter(filters) {
  const { field, start, end } = ledgerDates;
  const details = document.createElement('details');
  details.className = 'ledger-settings ledger-filter ledger-date-filter';
  const summary = document.createElement('summary');
  const label = field === 'created' ? '登记日期' : '最近跟进';
  summary.textContent = start || end ? label + ' · ' + (start || '不限') + ' 至 ' + (end || '不限') : '时间筛选';
  const form = document.createElement('form');
  form.className = 'ledger-settings-menu ledger-date-menu';
  form.innerHTML = '<h3>时间筛选</h3><fieldset class="ledger-date-basis"><legend>日期依据</legend><label><input type="radio" name="field" value="followup">最近跟进</label><label><input type="radio" name="field" value="created">登记日期</label></fieldset><div class="ledger-date-fields"><label>开始日期<input name="start" type="date"></label><label>结束日期<input name="end" type="date"></label></div><div class="ledger-date-actions"><button type="button">清除时间</button><button class="primary" type="submit">应用</button></div>';
  for (const input of form.querySelectorAll('input[type="date"]')) {
    input.insertAdjacentHTML('afterend', workspaceIcon('calendar'));
  }
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
  form.setAttribute('popover', 'manual');
  details.addEventListener('toggle', () => {
    if (!details.open) {
      if (form.matches(':popover-open')) form.hidePopover();
      return;
    }
    form.showPopover();
    const trigger = summary.getBoundingClientRect();
    form.style.left = Math.max(8, trigger.right - form.offsetWidth) + 'px';
    form.style.top = Math.max(8, Math.min(trigger.bottom + 8, innerHeight - form.offsetHeight - 8)) + 'px';
  });
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

window.addEventListener('resize', () => {
  const date = document.querySelector('.ledger-date-filter[open]');
  if (date) date.open = false;
});
