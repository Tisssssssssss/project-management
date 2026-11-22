import React from 'react';
import { createRoot } from 'react-dom/client';
import LiquidGlass from 'liquid-glass-react';

const surfaces = [
  '.unified-sidebar', '.window-ledger > .panel', '.window-ledger .ledger-search',
  '.window-ledger .tablewrap',
  '.figma-overview-panel', '.figma-overview-panel .v4-metrics > button',
  '.figma-overview-panel .v4-chart-panel', '.figma-today .daily-list',
  '.figma-record-panel', '.settings-v3', '.window-detail .panel', '.dialog',
  '.ledger-stage-filter[open] > .ledger-stage-options',
  '.ledger-date-filter[open] > .ledger-date-menu',
  '.excel-export-menu:not([hidden])', '.figma-secondary[open] > .figma-secondary-body',
  '.figma-project-picker', '.project-summary', '.v4-tooltip:not([hidden])'
].join(', ');
const roots = new Map();
const motion = matchMedia('(prefers-reduced-motion: reduce)');

function refresh() {
  const targets = new Set(document.querySelectorAll(surfaces));
  for (const [host, { root, layer }] of roots) {
    if (targets.has(host) && layer.parentNode === host) continue;
    root.unmount();
    layer.remove();
    host.classList.remove('workspace-glass-surface', 'workspace-glass-static');
    roots.delete(host);
  }
  for (const host of targets) {
    if (roots.has(host)) continue;
    const layer = document.createElement('span');
    layer.className = 'workspace-glass-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    if (getComputedStyle(host).position === 'static') host.classList.add('workspace-glass-static');
    host.classList.add('workspace-glass-surface');
    host.append(layer);
    const root = createRoot(layer);
    roots.set(host, { root, layer });
    root.render(
      <LiquidGlass cornerRadius={host.matches('.ledger-search') ? 8 : host.matches('.v4-tooltip, .ledger-stage-options, .ledger-date-menu, .excel-export-menu, .figma-secondary-body') ? 12 : 14}
        padding="0" displacementScale={host.matches('.tablewrap') ? 28.6 : 52} blurAmount={0.16}
        aberrationIntensity={0.8} saturation={130}
        elasticity={motion.matches ? 0 : 0.25} mouseContainer={{ current: host }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <span />
      </LiquidGlass>
    );
  }
}

let frame = 0;
new MutationObserver(() => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    refresh();
  });
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
refresh();
