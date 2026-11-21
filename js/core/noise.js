// Seeded simplex noise (2D and 3D) and fractal sums of it.
const Noise = (() => {
  const GRAD = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  const F3 = 1 / 3, G3 = 1 / 6;

  // Noise functions for a seed: noise2, noise3 (about −1…1), fbm2, fbm3.
  function create(seed) {
    const p = Random.create(seed).shuffle([...Array(256).keys()]);
    const perm = new Uint8Array(512), mod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; mod12[i] = perm[i] % 12; }

    // 2D simplex noise.
    function noise2(xin, yin) {
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      return 70 * (corner2(mod12[ii + perm[jj]], x0, y0) + corner2(mod12[ii + i1 + perm[jj + j1]], x1, y1)
        + corner2(mod12[ii + 1 + perm[jj + 1]], x2, y2));
    }

    // 3D simplex noise.
    function noise3(xin, yin, zin) {
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      const ii = i & 255, jj = j & 255, kk = k & 255;
      return 32 * (
        corner3(mod12[ii + perm[jj + perm[kk]]], x0, y0, z0)
        + corner3(mod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3)
        + corner3(mod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3)
        + corner3(mod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3));
    }

    // Sum of octaves of 2D noise, normalized to about −1…1.
    function fbm2(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let o = 0; o < octaves; o++) { sum += amp * noise2(x * freq, y * freq); norm += amp; amp *= gain; freq *= lacunarity; }
      return sum / norm;
    }

    // Sum of octaves of 3D noise (z is usually time).
    function fbm3(x, y, z, octaves = 4, lacunarity = 2, gain = 0.5) {
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let o = 0; o < octaves; o++) { sum += amp * noise3(x * freq, y * freq, z * freq); norm += amp; amp *= gain; freq *= lacunarity; }
      return sum / norm;
    }

    return { noise2, noise3, fbm2, fbm3 };
  }

  // One simplex corner's contribution (2D).
  function corner2(g, x, y) {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    return t * t * (GRAD[g][0] * x + GRAD[g][1] * y);
  }

  // One simplex corner's contribution (3D).
  function corner3(g, x, y, z) {
    let t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    t *= t;
    return t * t * (GRAD[g][0] * x + GRAD[g][1] * y + GRAD[g][2] * z);
  }

  return { create };
})();
