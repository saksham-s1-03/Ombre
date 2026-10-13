import { $, h } from './util.js';

const NOTES = [
  'Roasted hazelnut, right at the start.', 'A flash of dried cherry.', 'Warm cocoa butter, slowly melting.',
  'Toasted bread crust and honey.', 'Orange peel, bright and bitter.', 'A little smoke, like a campfire far away.',
  'Soft vanilla, then a mineral edge.', 'Dark plum and black tea.', 'Caramelised sugar, just before it burns.',
  'Roasted almond, round and full.', 'Sea salt on the finish.', 'The last square. Everything at once.'
];

export function initHero() {
  const slab = $('#slab'), whisper = $('#whisper'), count = $('#snapCount'), reset = $('#slabReset');
  let snapped = 0;

  function build() {
    snapped = 0;
    slab.replaceChildren(...NOTES.map((note, i) =>
      h('button', {
        class: 'piece', type: 'button', 'aria-label': `Break off piece ${i + 1} of 12`,
        onClick: (e) => snap(e.currentTarget, i)
      })
    ));
    whisper.textContent = 'Break off a piece.';
    count.textContent = '0 of 12 snapped';
    reset.hidden = true;
  }

  function snap(btn, i) {
    btn.style.setProperty('--dx', `${Math.round(Math.random() * 120 - 60)}px`);
    btn.style.setProperty('--rot', `${Math.round(Math.random() * 70 - 35)}deg`);
    btn.classList.add('snapped');
    btn.disabled = true;
    snapped++;
    count.textContent = `${snapped} of 12 snapped`;
    whisper.textContent = snapped === 12 ? 'That was the whole bar. Pick your next one below.' : NOTES[i];
    if (snapped === 12) { reset.hidden = false; reset.focus(); }
  }

  reset.addEventListener('click', () => { build(); slab.querySelector('.piece')?.focus(); });
  build();
}
