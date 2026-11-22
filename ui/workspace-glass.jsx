import React from 'react';
import { createRoot } from 'react-dom/client';
import LiquidGlass from 'liquid-glass-react';

const surfaces = [
  '.unified-sidebar', '.window-ledger > .panel', '.window-ledger .ledger-search',
  '.figma-overview-panel', '.figma-overview-panel .v4-metrics > button',
  '.figma-overview-panel .v4-chart-panel', '.figma-today .daily-list',
  '.figma-record-panel', '.settings-v3', '.window-detail .panel', '.dialog'
].join(', ');
const roots = new Map();
const motion = matchMedia('(prefers-reduced-motion: reduce)');

function refresh() {
  const targets = new Set(document.querySelectorAll(surfaces));
  for (const [host, { root, layer }] of roots) {
    if (targets.has(host) && layer.parentNode === host) continue;
    root.unmount();
    layer.remove();
    host.classList.remove('workspace-glass-surface');
    roots.delete(host);
  }
  for (const host of targets) {
    if (roots.has(host)) continue;
    const layer = document.createElement('span');
    layer.className = 'workspace-glass-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    host.classList.add('workspace-glass-surface');
    host.prepend(layer);
    const root = createRoot(layer);
    roots.set(host, { root, layer });
    root.render(
      <LiquidGlass cornerRadius={host.matches('.ledger-search') ? 8 : 14}
        padding="0" displacementScale={52} blurAmount={0.16}
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
}).observe(document.body, { childList: true, subtree: true });
refresh();
