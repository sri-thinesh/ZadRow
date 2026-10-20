function toLinear(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function parseHex(hex) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c+c).join('');
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function relLum(hex) {
  const {r, g, b} = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrast(h1, h2) {
  const l1 = relLum(h1);
  const l2 = relLum(h2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

const pairs = [
  ['#f8fafc', '#0a0b10', 'textPrimary (#f8fafc) on canvas (#0a0b10)'],
  ['#f8fafc', '#090a0f', 'textPrimary (#f8fafc) on canvas (#090a0f)'],
  ['#00f0ff', '#0a0b10', 'primary cyan (#00f0ff) on canvas (#0a0b10)'],
  ['#00f0ff', '#090a0f', 'primary cyan (#00f0ff) on canvas (#090a0f)'],
  ['#94a3b8', '#090a0f', 'textSecondary (#94a3b8) on canvas (#090a0f)'],
  ['#64748b', '#090a0f', 'textMuted (#64748b) on canvas (#090a0f)'],
  ['#ffffff', '#000000', 'pure white on pure black']
];

for (const [fg, bg, desc] of pairs) {
  const r = contrast(fg, bg);
  console.log(desc + ' => L(fg)=' + relLum(fg).toFixed(4) + ', L(bg)=' + relLum(bg).toFixed(4) + ', Ratio=' + r.toFixed(2) + ':1');
}
