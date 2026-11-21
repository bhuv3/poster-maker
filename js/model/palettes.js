// Curated palettes: paper (bg), ink (text and lines), and accent colors. Plus color helpers.
const Palettes = (() => {
  const LIST = [
    { id: 'bauhaus', name: 'Bauhaus', bg: '#f2ead8', ink: '#1c1c1c', colors: ['#d9402b', '#f2b632', '#2a5d9f', '#1c1c1c'] },
    { id: 'swiss', name: 'Swiss', bg: '#f4f1ea', ink: '#111111', colors: ['#e3262e', '#111111', '#9b9b9b'] },
    { id: 'riso', name: 'Riso', bg: '#f7f1e8', ink: '#2b2b6e', colors: ['#ff48b0', '#0078bf', '#ffe800', '#2b2b6e'] },
    { id: 'sunset', name: 'Sunset', bg: '#fbe9d0', ink: '#3b1f2b', colors: ['#f26b38', '#f9a03f', '#e2445c', '#6b2d5c'] },
    { id: 'ocean', name: 'Ocean', bg: '#e8f1f2', ink: '#0b2f3a', colors: ['#0f6e8c', '#3fa7b5', '#f2c14e', '#0b2f3a'] },
    { id: 'forest', name: 'Forest', bg: '#eef0e5', ink: '#1f2b1d', colors: ['#2e5e3a', '#7a9e5a', '#d9a441', '#1f2b1d'] },
    { id: 'mono', name: 'Mono', bg: '#f5f5f2', ink: '#111111', colors: ['#111111', '#555555', '#999999'] },
    { id: 'ink', name: 'Ink', bg: '#fbfaf6', ink: '#1a2340', colors: ['#1a2340'] },
    { id: 'matisse', name: 'Matisse', bg: '#f6efe2', ink: '#1e2a5a', colors: ['#1e2a5a', '#e6492d', '#f3c623', '#2f7d4a'] },
    { id: 'terracotta', name: 'Terracotta', bg: '#f3e6d6', ink: '#3a2418', colors: ['#c4623f', '#e0a36d', '#7c8b6a', '#3a2418'] },
    { id: 'vintage', name: 'Vintage', bg: '#efe3c8', ink: '#2f2a24', colors: ['#b5483b', '#3e6e6b', '#d7a648', '#2f2a24'] },
    { id: 'desert', name: 'Desert', bg: '#f2dfc4', ink: '#4a2e1f', colors: ['#d97941', '#b5562e', '#e8b46a', '#4a2e1f'] },
    { id: 'pastel', name: 'Pastel', bg: '#fdf6f0', ink: '#3a3a48', colors: ['#f6bd9b', '#a8d5ba', '#b5c7ef', '#f3e19c'] },
    { id: 'candy', name: 'Candy', bg: '#fff5f7', ink: '#2d1b3d', colors: ['#ff6f91', '#ffc75f', '#845ec2', '#00c9a7'] },
    { id: 'mint', name: 'Mint', bg: '#e9f5ef', ink: '#183a37', colors: ['#2fbf71', '#183a37', '#f26419'] },
    { id: 'red', name: 'Red alert', bg: '#ebe9e4', ink: '#1b1b1b', colors: ['#1b1b1b', '#c8102e'] },
    { id: 'night', name: 'Night', bg: '#101423', ink: '#e9e6dc', colors: ['#e9e6dc', '#f2b632', '#5b8def', '#e2445c'] },
    { id: 'dusk', name: 'Dusk', bg: '#2a1e3d', ink: '#f6e7d8', colors: ['#f6a76a', '#e05780', '#7b5fc9', '#f6e7d8'] },
    { id: 'blueprint', name: 'Blueprint', bg: '#1f3f7a', ink: '#e8eefc', colors: ['#e8eefc', '#9fb7e8', '#f2c14e'] },
    { id: 'neon', name: 'Neon', bg: '#0d0d0d', ink: '#f5f5f5', colors: ['#39ff14', '#ff2bd6', '#00e5ff', '#fff200'] },
  ];

  // The palette a poster uses: its custom one (from an image) or one from the list.
  function resolve(state) {
    if (state.palette === 'custom' && state.customPalette) return state.customPalette;
    return LIST.find(p => p.id === state.palette) || LIST[0];
  }

  function get(id) { return LIST.find(p => p.id === id) || LIST[0]; }

  // "#rrggbb" → [r, g, b].
  function rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)); }

  // [r, g, b] → "#rrggbb".
  function hex(c) { return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }

  // Relative luminance (0 dark … 1 light).
  function luminance(h) {
    const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Mix of two colors, t from 0 (a) to 1 (b).
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }

  // Accent colors that stand out from the paper (falls back to all of them).
  function visible(p) {
    const bgL = luminance(p.bg);
    const out = p.colors.filter(c => Math.abs(luminance(c) - bgL) > 0.08);
    return out.length ? out : p.colors;
  }

  // A palette from an image file: k-means on a small copy. Paper = the most common color, ink = the one
  // that contrasts most with it, accents = the rest by how much of the picture they cover.
  async function fromImage(file) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const S = 72, k = Math.min(S / img.width, S / img.height);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const data = g.getImageData(0, 0, c.width, c.height).data, px = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) px.push([data[i], data[i + 1], data[i + 2]]);
    const clusters = kmeans(px, 6).filter(cl => cl.count > 0).sort((a, b) => b.count - a.count);
    const colors = clusters.map(cl => hex(cl.center));
    const bg = colors[0];
    const ink = colors.slice(1).sort((a, b) => Math.abs(luminance(b) - luminance(bg)) - Math.abs(luminance(a) - luminance(bg)))[0] || (luminance(bg) > 0.4 ? '#111111' : '#f5f5f5');
    const accents = colors.slice(1).filter(x => x !== ink).slice(0, 3);
    return { id: 'custom', name: file.name.replace(/\.[^.]+$/, '') || 'From image', bg, ink, colors: [...accents, ink] };
  }

  // k-means clustering of RGB pixels (deterministic start: evenly spaced pixels).
  function kmeans(px, k) {
    let centers = [...Array(k).keys()].map(i => px[Math.floor((i + 0.5) / k * px.length)].slice());
    let groups = [];
    for (let iter = 0; iter < 12; iter++) {
      groups = centers.map(() => ({ sum: [0, 0, 0], count: 0 }));
      for (const p of px) {
        let best = 0, bestD = Infinity;
        centers.forEach((c, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bestD) { bestD = d; best = i; } });
        const gr = groups[best];
        gr.sum[0] += p[0]; gr.sum[1] += p[1]; gr.sum[2] += p[2]; gr.count++;
      }
      centers = groups.map((gr, i) => gr.count ? gr.sum.map(v => v / gr.count) : centers[i]);
    }
    return centers.map((center, i) => ({ center, count: groups[i].count }));
  }

  return { LIST, resolve, get, rgb, hex, luminance, mix, visible, fromImage };
})();
