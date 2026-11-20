(function () {
  const renderWorkspace = render;
  let libraryScope = 'all';
  const libraryFilters = [['all', '全部资料'], ['active', '在跟项目'], ['starred', '已关注项目']];
  const chevron = '<span class="figma-row-arrow" aria-hidden="true"></span>';

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
        row.innerHTML = `<span><strong>${esc(file.name)}</strong><small>${esc(project.name)} · ${Math.ceil(file.size / 1024)} KB</small></span><span class="figma-row-meta">${esc(project.stage || '')}${chevron}</span>`;
        panel.append(row);
      }
    }
    if (panel.children.length === 1) panel.insertAdjacentHTML('beforeend', '<p class="empty">此范围暂无资料</p>');
    const add = actionButton('＋ 添加资料', () => {
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
    actions.append(add);
    heading.append(actions);
    scroll.replaceChildren(panel);
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
      button.innerHTML = `<span><strong>${title}</strong><small>${note}</small></span><span class="figma-row-meta">${label}${chevron}</span>`;
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
    }
  }

  render = function () {
    renderWorkspace();
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
      if (toolbar) panel.append(toolbar);
      panel.append(chart);
    } else if (page === '待办与风险') {
      content.classList.add('figma-today');
    } else if (page === '资料知识库') {
      library(content);
    } else if (page === '设置') {
      settings(content);
    }
  };
  render();
})();
