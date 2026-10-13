import { $, h, money } from './util.js';
import { state, on } from './state.js';
import { artNode, add } from './shop.js';

function describe(c) {
  if (c < 45) return 'Creamy and gentle. Chocolate for people who say they do not like dark.';
  if (c < 55) return 'Balanced and fruity. Sweet enough to relax, with a tart edge.';
  if (c < 70) return 'Rounded and confident. The sweet spot for most dark chocolate fans.';
  if (c < 80) return 'Deep, roasted and a little austere. Best eaten slowly.';
  return 'Intense, mineral and very low in sugar. A small piece goes a long way.';
}

let pickId = null;

function update() {
  const bars = state.products.filter((p) => p.shape === 'bar' && p.cocoa);
  if (!bars.length) return;
  const slider = $('#cocoa');
  const value = Number(slider.value);
  $('#cocoaOut').textContent = `${value}%`;

  const bitter = Math.max(0, Math.min(1, (value - 30) / 60));
  $('#mBitter').style.width = `${Math.round(bitter * 100)}%`;
  $('#mSweet').style.width = `${Math.round((1 - bitter * 0.85) * 100)}%`;
  $('#matchDesc').textContent = describe(value);

  const pick = bars.reduce((a, b) => (Math.abs(b.cocoa - value) < Math.abs(a.cocoa - value) ? b : a));
  pickId = pick.id;
  $('#matchPick').replaceChildren(
    artNode(pick, 'pick-art'),
    h('div', { class: 'pick-body' },
      h('p', { class: 'pick-kicker' }, `Closest match, ${pick.cocoa}% cocoa`),
      h('h3', {}, pick.name),
      h('p', {}, pick.notes),
      h('p', { class: 'pick-price' }, money(pick.price)),
      h('button', { class: 'btn btn-primary', type: 'button', disabled: pick.stock <= 0, onClick: () => add(pick.id) },
        pick.stock <= 0 ? 'Sold out' : 'Add to bag')
    )
  );
}

export function initMatch() {
  $('#cocoa').addEventListener('input', update);
  on('products', update);
  on('product', ({ p }) => { if (p.id === pickId) update(); });
}
