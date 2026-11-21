(function () {
  const renderWorkspace = render;
  let libraryScope = 'all';
  const libraryFilters = [['all', '全部资料'], ['active', '项目文件'], ['starred', '我的收藏']];
  const chevron = workspaceIcon('right');

  function actionButton(label, handler, primary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (primary) button.className = 'primary';
    button.onclick = handler;
    return button;
  }

  function openFiles(project) {
    selected = project.id;
    page = '项目台账';
    tab = '资料档案';
    render();
  }

  function library(content) {
    const scroll = content.querySelector('.workspace-scroll');
    const heading = content.querySelector('.heading');
    if (!scroll || !heading) return;
    const panel = document.createElement('section');
    panel.className = 'panel figma-record-panel';
    const toolbar = document.createElement('div');
    toolbar.className = 'figma-record-tabs';
    for (const [key, name] of libraryFilters) {
      const button = actionButton(name, () => { libraryScope = key; render(); });
      if (key === 'active') button.title = '在跟项目的文件';
      if (key === 'starred') button.title = '已关注项目的文件';
      button.setAttribute('aria-pressed', String(libraryScope === key));
      toolbar.append(button);
    }
    panel.append(toolbar);
    const projects = data.projects.filter(p =>
      libraryScope === 'all' || (!p.archived && (libraryScope === 'active' || p.starred))
    );
    for (const project of projects) {
      for (const file of (project.files || []).filter(f => !f.deletedAt)) {
        const row = actionButton('', () => openFiles(project));
        row.className = 'figma-record-row';
        row.title = file.name;
        row.innerHTML = `<span><strong>${esc(file.name)}</strong><small>${esc(project.name)} · ${Math.ceil(file.size / 1024)} KB</small></span><span class="figma-row-meta"><span>${esc(project.stage || '')}</span>${chevron}</span>`;
        panel.append(row);
      }
    }
    if (panel.children.length === 1) panel.insertAdjacentHTML('beforeend', '<p class="empty">此范围暂无资料</p>');
    const add = actionButton('添加资料', () => {
      if (!data.projects.length) return toast('请先登记项目');
      modal('选择资料所属项目', '<div class="figma-project-picker"></div>', () => {}, { readonly: true, drawer: true });
      const picker = document.querySelector('.figma-project-picker');
      for (const project of data.projects) {
        picker.append(actionButton(project.name, () => {
          document.querySelector('.dialog .close').click();
          openFiles(project);
        }));
      }
    }, true);
    const actions = document.createElement('div');
    actions.className = 'actions';
    add.insertAdjacentHTML('afterbegin', workspaceIcon('plus'));
    actions.append(add);
    heading.append(actions);
    scroll.replaceChildren(panel);
  }

  function applyNavigation() {
    const icons = {
      '工作台': 'M2 13V8m6 5V3m6 10V6',
      '项目台账': 'M2 4h12v9H2z M2 7h12',
      '待办与风险': 'M2.5 4h11M2.5 8h11M2.5 12h8',
      '资料知识库': 'M2.5 5h11v8h-11z M2.5 5l2-2h3l2 2',
      '设置': 'M2 4h12M2 8h12M2 12h12 M5 2v4M10 6v4M6 10v4'
    };
    for (const button of document.querySelectorAll('.unified-sidebar [data-dest]')) {
      const icon = button.querySelector('.shell-symbol');
      const path = icons[button.dataset.dest];
      if (icon && path && !icon.querySelector('svg')) {
        icon.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
      }
    }
  }

  function settings(content) {
    const panel = content.querySelector('.settings-v3');
    const actions = panel?.querySelector('.backup-actions');
    if (!actions) return;
    const [backup, restore, excel] = actions.querySelectorAll('button');
    if (!backup || !restore || !excel) return;
    const list = document.createElement('div');
    list.className = 'figma-settings-rows';
    const labels = [[backup, '导出完整备份', '本地备份', '备份'],
      [restore, '从备份文件恢复', '数据恢复', '恢复'],
      [excel, '导出全部项目 Excel', '项目导出', '导出']];
    for (const [button, title, note, label] of labels) {
      button.className = 'figma-record-row';
      button.innerHTML = `<span><strong>${title}</strong><small>${note}</small></span><span class="figma-row-meta"><span>${label}</span>${chevron}</span>`;
      list.append(button);
    }
    actions.replaceWith(list);
    const headerAction = actionButton('导出备份', () => backup.click(), true);
    content.querySelector('.heading')?.append(headerAction);
    const history = panel.querySelector('.stage-trail');
    if (history) {
      const details = document.createElement('details');
      details.className = 'figma-audit';
      const summary = document.createElement('summary');
      summary.textContent = '查看变更记录';
      history.before(details);
      details.append(summary, history);
      history.querySelector('h2')?.remove();
      for (const note of [...panel.children].filter(el => el.matches('p.muted, .storage-status'))) {
        details.append(note);
      }
    }
  }

  function foldControls(host, title, controls) {
    const items = controls.filter(Boolean);
    if (!host || !items.length) return;
    const details = document.createElement('details');
    details.className = 'figma-secondary';
    const summary = document.createElement('summary');
    summary.setAttribute('aria-label', title);
    summary.title = title;
    summary.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg>';
    const body = document.createElement('div');
    body.className = 'figma-secondary-body';
    body.append(...items);
    details.append(summary, body);
    host.append(details);
    details.onkeydown = event => {
      if (event.key === 'Escape' && details.open) {
        details.open = false;
        summary.focus();
      }
    };
  }

  render = function () {
    renderWorkspace();
    applyNavigation();
    const content = document.querySelector('.unified-content');
    if (!content || selected) return;
    if (page === '工作台') {
      content.querySelector('.v4-heading h1')?.replaceChildren('数据总览');
      const metrics = content.querySelector('.v4-metrics');
      const chart = content.querySelector('.v4-chart-grid');
      if (!metrics || !chart) return;
      const panel = document.createElement('div');
      panel.className = 'figma-overview-panel';
      metrics.before(panel);
      panel.append(metrics);
      const toolbar = content.querySelector('.opp-toolbar');
      foldControls(content.querySelector('.v4-heading'), '统计选项', [
        content.querySelector('.v4-time-controls'),
        content.querySelector('.shell-overview-actions'),
        toolbar
      ]);
      for (const graph of chart.querySelectorAll('.v4-chart-panel')) {
        foldControls(graph.querySelector('.v4-panel-top'), '图表选项', [
          graph.querySelector('.v4-panel-top > .v4-segment'),
          graph.querySelector('.opp-measure'),
          graph.querySelector('.v4-chart-bottom'),
          graph.querySelector('.v4-distribution-foot')
        ]);
      }
      panel.append(chart);
    } else if (page === '待办与风险') {
      content.classList.add('figma-today');
      foldControls(content.querySelector('.daily-list-head'), '待办范围', [
        content.querySelector('.daily-list-filters')
      ]);
      for (const row of content.querySelectorAll('.daily-task')) {
        foldControls(row, '待办操作', [row.querySelector('.daily-task-actions')]);
      }
    } else if (page === '资料知识库') {
      library(content);
    } else if (page === '设置') {
      settings(content);
    }
  };
  render();
})();
