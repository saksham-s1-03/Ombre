// Product illustrations drawn in SVG, so the shop needs no photo files.
// Only trusted data (hex colours, numbers from our own catalogue) goes into these strings.
function barSvg(p) {
  const { body, accent } = p.palette;
  const SQ_W = 52, SQ_H = 60, GAP = 3, PAD = 6;
  const W = SQ_W * 3 + GAP * 2 + PAD * 2, x0 = (240 - W) / 2, right = x0 + W;
  const barTop = 126, barH = SQ_H * 3 + GAP * 2 + PAD * 2;
  let zig = '';
  for (let x = right - 14, i = 1; x > x0 + 6; x -= 14, i++) zig += ` L${x} ${i % 2 ? 118 : 130}`;
  let squares = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const x = x0 + PAD + c * (SQ_W + GAP), y = barTop + PAD + r * (SQ_H + GAP);
    squares += `<rect x="${x}" y="${y}" width="${SQ_W}" height="${SQ_H}" rx="4" fill="${body}"/>` +
      `<rect x="${x + 6}" y="${y + 6}" width="${SQ_W - 12}" height="${SQ_H - 12}" rx="3" fill="#000" opacity=".16"/>` +
      `<path d="M${x + 3} ${y + SQ_H - 3} V${y + 3} H${x + SQ_W - 3}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>`;
  }
  const label = p.cocoa ? `${p.cocoa}%` : '';
  return `<svg viewBox="0 0 240 340" role="img" aria-label="${label} chocolate bar" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-6 120 170)">
      <rect x="${x0}" y="${barTop}" width="${W}" height="${barH}" rx="8" fill="#000" opacity=".18" transform="translate(5 8)"/>
      <rect x="${x0}" y="${barTop}" width="${W}" height="${barH}" rx="8" fill="${body}"/>
      ${squares}
      <path d="M${x0 + 10} 28 H${right - 10} Q${right} 28 ${right} 38 V118${zig} L${x0} 118 V38 Q${x0} 28 ${x0 + 10} 28Z" fill="${accent}"/>
      <path d="M${x0} 58 H${right}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
      <text x="120" y="96" text-anchor="middle" font-family="Gloock, Georgia, serif" font-size="44" fill="#fff">${label}</text>
    </g></svg>`;
}

function truffleSvg(p) {
  const { body, accent } = p.palette;
  let balls = '';
  const xs = [76, 120, 164], ys = [112, 156, 200];
  ys.forEach((y, r) => xs.forEach((x, c) => {
    const rot = (r * 3 + c) % 2;
    balls += `<circle cx="${x}" cy="${y}" r="19" fill="${body}"/>` +
      `<ellipse cx="${x - 6}" cy="${y - 7}" rx="6" ry="3.5" fill="#fff" opacity=".3" transform="rotate(-30 ${x - 6} ${y - 7})"/>` +
      (rot ? `<circle cx="${x + 7}" cy="${y + 6}" r="2" fill="${accent}"/><circle cx="${x + 2}" cy="${y + 10}" r="1.5" fill="${accent}"/>` : `<circle cx="${x + 5}" cy="${y + 8}" r="1.6" fill="${accent}"/>`);
  }));
  return `<svg viewBox="0 0 240 340" role="img" aria-label="Box of truffles" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(4 120 170)">
      <rect x="30" y="74" width="180" height="180" rx="14" fill="#000" opacity=".16" transform="translate(5 8)"/>
      <rect x="30" y="74" width="180" height="180" rx="14" fill="${accent}"/>
      <rect x="42" y="86" width="156" height="156" rx="8" fill="#241009"/>
      ${balls}
      <rect x="30" y="48" width="180" height="26" rx="8" fill="${accent}"/>
      <rect x="30" y="64" width="180" height="10" fill="#000" opacity=".12"/>
    </g></svg>`;
}

function bonbonSvg(p) {
  const { body, accent } = p.palette;
  let cells = '';
  const xs = [66, 120, 174], ys = [106, 160, 214];
  ys.forEach((y, r) => xs.forEach((x, c) => {
    cells += `<rect x="${x - 21}" y="${y - 21}" width="42" height="42" rx="12" fill="${body}"/>` +
      `<path d="M${x - 15} ${y - 4} q7 -9 14 0 t14 0" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M${x - 14} ${y - 13} h10" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>`;
  }));
  return `<svg viewBox="0 0 240 340" role="img" aria-label="Box of bonbons" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-3 120 170)">
      <rect x="30" y="68" width="180" height="186" rx="14" fill="#000" opacity=".16" transform="translate(5 8)"/>
      <rect x="30" y="68" width="180" height="186" rx="14" fill="#f2e3d0"/>
      <rect x="42" y="80" width="156" height="162" rx="8" fill="#e6cfb2"/>
      ${cells}
      <rect x="30" y="44" width="180" height="26" rx="8" fill="${accent}"/>
    </g></svg>`;
}

function jarSvg(p) {
  const { body, accent } = p.palette;
  return `<svg viewBox="0 0 240 340" role="img" aria-label="Jar of hot chocolate" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(3 120 170)">
      <rect x="62" y="96" width="116" height="170" rx="18" fill="#000" opacity=".16" transform="translate(5 8)"/>
      <rect x="62" y="96" width="116" height="170" rx="18" fill="#fff" opacity=".55"/>
      <path d="M66 140 H174 V248 Q174 262 160 262 H80 Q66 262 66 248Z" fill="${body}"/>
      <path d="M66 140 q13 -9 27 0 t27 0 t27 0 t27 0" fill="${body}" stroke="${body}" stroke-width="1"/>
      <rect x="56" y="66" width="128" height="34" rx="9" fill="${accent}"/>
      <rect x="82" y="168" width="76" height="66" rx="6" fill="#f8e6e4"/>
      <text x="120" y="196" text-anchor="middle" font-family="Gloock, Georgia, serif" font-size="17" fill="${body}">Cocoa</text>
      <text x="120" y="218" text-anchor="middle" font-family="Gloock, Georgia, serif" font-size="17" fill="${body}">Ritual</text>
      <path d="M96 40 q-8 -12 0 -22 M120 38 q-8 -12 0 -22 M144 40 q-8 -12 0 -22" fill="none" stroke="${body}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>
    </g></svg>`;
}

const SHAPES = { bar: barSvg, truffle: truffleSvg, bonbon: bonbonSvg, jar: jarSvg };
export const artSvg = (p) => (SHAPES[p.shape] || barSvg)(p);
