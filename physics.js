// Pure physics models for the demos (no DOM). Constants follow the 9749 Data and Formulae sheet.
export const G = 9.81;      // m s^-2
export const H = 6.63e-34;  // J s
export const E = 1.60e-19;  // C
const E_CHARGE = E;
export const C = 3.00e8;    // m s^-1

const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

export function shm({ A, m, k }, n = 240) {
  const omega = Math.sqrt(k / m);
  const T = (2 * Math.PI) / omega;
  const t = linspace(0, 2 * T, n);
  return {
    omega, T, f: 1 / T, vmax: A * omega, amax: A * omega * omega, t,
    x: t.map((s) => A * Math.cos(omega * s)),
    v: t.map((s) => -A * omega * Math.sin(omega * s)),
    a: t.map((s) => -A * omega * omega * Math.cos(omega * s)),
    energy: (() => {
      const xs = linspace(-A, A, 101);
      return { ke: xs.map((x) => [x, 0.5 * k * (A * A - x * x)]), pe: xs.map((x) => [x, 0.5 * k * x * x]) };
    })(),
  };
}

export function projectile({ u, angle, h0 }, n = 120) {
  const th = (angle * Math.PI) / 180;
  const ux = u * Math.cos(th);
  const uy = u * Math.sin(th);
  const flightTime = (uy + Math.sqrt(uy * uy + 2 * G * h0)) / G;
  const at = (t) => [ux * t, h0 + uy * t - 0.5 * G * t * t];
  const points = linspace(0, flightTime, n).map(at);
  points[n - 1][1] = Math.max(0, points[n - 1][1]); // remove float dust at landing
  return {
    flightTime,
    range: ux * flightTime,
    maxHeight: uy > 0 ? h0 + (uy * uy) / (2 * G) : h0,
    points,
  };
}

export function decay({ N0, halfLife }, n = 101) {
  const lambda = Math.LN2 / halfLife;
  return {
    lambda,
    activity0: lambda * N0,
    points: linspace(0, 5 * halfLife, n).map((t) => [t, N0 * Math.exp(-lambda * t)]),
  };
}

// f in Hz, phi in eV. KE and stopping potential are returned in eV and V (numerically equal).
export function photoelectric({ f, phi }) {
  const f0 = (phi * E) / H;
  const ke = Math.max(0, (H * f) / E - phi);
  return {
    f0, lambda0: C / f0, ke, vs: ke, emits: f > f0,
  };
}

// ---------------------------------------------------------------- more constants
export const GRAV = 6.67e-11;                     // N m^2 kg^-2
export const K_E = 1 / (4 * Math.PI * 8.85e-12);  // N m^2 C^-2
export const M_E = 9.11e-31;                      // kg
export const KB = 1.38e-23;                       // J K^-1
export const R_GAS = 8.31;                        // J K^-1 mol^-1
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- mechanics
export function motion({ u, a, T }, n = 101) {
  const t = linspace(0, T, n);
  return { t, s: t.map((x) => u * x + 0.5 * a * x * x), v: t.map((x) => u + a * x), a: t.map(() => a) };
}

export function incline({ m, angle, mu }) {
  const th = angle * RAD;
  const N = m * G * Math.cos(th);
  const along = m * G * Math.sin(th);
  const slides = Math.tan(th) > mu;
  const accel = (deg) => Math.max(0, G * (Math.sin(deg * RAD) - mu * Math.cos(deg * RAD)));
  return {
    N, along, slides,
    friction: slides ? mu * N : along,           // kinetic when sliding, otherwise static friction balances the slope
    a: slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0,
    criticalAngle: Math.atan(mu) / RAD,
    curve: linspace(0, 90, 91).map((d) => [d, accel(d)]),
  };
}

export function drag({ m, k }, n = 101) {
  const vt = (m * G) / k;
  const tau = m / k;
  return { vt, tau, points: linspace(0, 5 * tau, n).map((t) => [t, vt * (1 - Math.exp(-t / tau))]) };
}

// Two trolleys 4 m apart on a straight track; e is the coefficient of restitution.
export function collision({ m1, u1, m2, u2, e }, n = 120) {
  const collides = u1 > u2;
  const v1 = collides ? (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2) : u1;
  const v2 = collides ? (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2) : u2;
  const keLost = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2 - 0.5 * m1 * v1 * v1 - 0.5 * m2 * v2 * v2;
  const gap = 4, tc = collides ? gap / (u1 - u2) : Infinity;
  const T = collides ? tc * 2 : 4;
  const x1 = (t) => (t <= tc ? -gap / 2 + u1 * t : -gap / 2 + u1 * tc + v1 * (t - tc));
  const x2 = (t) => (t <= tc ? gap / 2 + u2 * t : gap / 2 + u2 * tc + v2 * (t - tc));
  const ts = linspace(0, T, n);
  return { collides, v1, v2, keLost, tc: collides ? tc : null, p1: ts.map((t) => [t, x1(t)]), p2: ts.map((t) => [t, x2(t)]) };
}

export function circular({ m, v, r }) {
  return {
    omega: v / r, T: (2 * Math.PI * r) / v, a: (v * v) / r, F: (m * v * v) / r,
    forceVsSpeed: linspace(0, 2 * v, 60).map((s) => [s, (m * s * s) / r]),
    forceVsRadius: linspace(0.5 * r, 2 * r, 60).map((x) => [x, (m * v * v) / x]),
  };
}

export function geostationaryRadius(M, period = 86164) {
  return Math.cbrt((GRAV * M * period * period) / (4 * Math.PI * Math.PI));
}

export function orbit({ M, r }) {
  const gm = GRAV * M;
  const radii = linspace(0.5 * r, 4 * r, 80);
  return {
    g: gm / (r * r), v: Math.sqrt(gm / r), T: 2 * Math.PI * Math.sqrt((r * r * r) / gm),
    vEscape: Math.sqrt((2 * gm) / r), phi: -gm / r,
    gCurve: radii.map((x) => [x, gm / (x * x)]), phiCurve: radii.map((x) => [x, -gm / x]),
  };
}

// ---------------------------------------------------------------- thermal
export function gas({ n, T, V }) {
  const volumes = linspace(0.5 * V, 3 * V, 80);
  return {
    p: (n * R_GAS * T) / V, keMean: 1.5 * KB * T,
    isotherm: volumes.map((x) => [x, (n * R_GAS * T) / x]),
    isothermHot: volumes.map((x) => [x, (n * R_GAS * 2 * T) / x]),
  };
}

// ---------------------------------------------------------------- waves
export function progressive({ A, lambda, f, t }) {
  const y = (x, time) => A * Math.sin(2 * Math.PI * (x / lambda - f * time));
  return {
    v: f * lambda, T: 1 / f, omega: 2 * Math.PI * f, k: (2 * Math.PI) / lambda,
    points: linspace(0, 2 * lambda, 201).map((x) => [x, y(x, t)]),
    timePoints: linspace(0, 2 / f, 201).map((time) => [time, y(0, time)]),
  };
}

export function standing({ L, v, n, A }) {
  const xs = linspace(0, L, 401);
  const upper = xs.map((x) => [x, 2 * A * Math.abs(Math.sin((n * Math.PI * x) / L))]);
  return {
    f: (n * v) / (2 * L), lambda: (2 * L) / n, nodes: n + 1, antinodes: n,
    upper, lower: upper.map(([x, y]) => [x, -y]),
  };
}

export function doubleSlit({ lambda, a, D }) {
  const x = (lambda * D) / a;
  return { x, points: linspace(-5 * x, 5 * x, 401).map((y) => [y, Math.cos((Math.PI * y) / x) ** 2]) };
}

export function grating({ perMm, lambda }) {
  const d = 1e-3 / perMm;
  const maxOrder = Math.floor(d / lambda + 1e-9);
  const angles = Array.from({ length: maxOrder }, (_, i) => Math.asin(((i + 1) * lambda) / d) / RAD);
  return { d, maxOrder, angles };
}

export function malus({ I0, theta }) {
  return { I: I0 * Math.cos(theta * RAD) ** 2, curve: linspace(0, 180, 181).map((d) => [d, I0 * Math.cos(d * RAD) ** 2]) };
}

// ---------------------------------------------------------------- fields and circuits
export function pointCharge({ Q, r, q }) {
  const E = (K_E * Q) / (r * r), V = (K_E * Q) / r;
  const radii = linspace(0.05, 1, 80);
  return {
    E, V, F: q * E, Ep: q * V,
    eCurve: radii.map((x) => [x, (K_E * Q) / (x * x)]), vCurve: radii.map((x) => [x, (K_E * Q) / x]),
  };
}

export function plates({ V, d, v0, L }, n = 101) {
  const E = V / d, a = (E * E_CHARGE) / M_E;
  const y = (x) => 0.5 * a * (x / v0) ** 2;
  return { E, a, yExit: y(L), hits: y(L) > d / 2, points: linspace(0, L, n).map((x) => [x, y(x)]) };
}

export function internal({ E, r, R }) {
  const I = E / (R + r);
  return {
    I, V: I * R, P: I * I * R, Pmax: (E * E) / (4 * r), Isc: E / r,
    vi: [[0, E], [E / r, 0]],
    powerCurve: linspace(0.02 * r, 5 * r, 120).map((x) => [x, (E / (x + r)) ** 2 * x]),
  };
}

export function divider({ Vs, R1, R2, RL }) {
  const out = (r2, rl) => (Vs * ((r2 * rl) / (r2 + rl))) / (R1 + (r2 * rl) / (r2 + rl));
  const sweep = linspace(1, 5 * R1, 100);
  return {
    Vout: out(R2, RL),
    unloaded: sweep.map((x) => [x, (Vs * x) / (R1 + x)]),
    loaded: sweep.map((x) => [x, out(x, RL)]),
  };
}

export function bfield({ m, q, v, B }, n = 121) {
  const r = (m * v) / (q * B), T = (2 * Math.PI * m) / (q * B);
  return { r, T, points: linspace(0, 2 * Math.PI, n).map((ph) => [r * Math.sin(ph), r * (1 - Math.cos(ph))]) };
}

export function coil({ N, B, A, f }, n = 401) {
  const w = 2 * Math.PI * f, peak = N * B * A * w;
  const t = linspace(0, 2 / f, n);
  return {
    peak, rms: peak / Math.SQRT2,
    flux: t.map((s) => [s, N * B * A * Math.cos(w * s)]),
    emf: t.map((s) => [s, peak * Math.sin(w * s)]),
  };
}

export function rectifier({ V0, f }, n = 401) {
  const t = linspace(0, 2 / f, n);
  const input = t.map((s) => [s, V0 * Math.sin(2 * Math.PI * f * s)]);
  return { mean: V0 / Math.PI, rms: V0 / 2, input, output: input.map(([s, v]) => [s, Math.max(0, v)]) };
}

export function transformer({ Np, Ns, Vp, RL, eff }, n = 301) {
  const Vs = (Vp * Ns) / Np, Is = Vs / RL, Pout = Vs * Is, Pin = Pout / eff;
  const t = linspace(0, 0.04, n);
  const wave = (rms) => t.map((s) => [s, Math.SQRT2 * rms * Math.sin(2 * Math.PI * 50 * s)]);
  return { Vs, Is, Pout, Pin, Ip: Pin / Vp, primary: wave(Vp), secondary: wave(Vs) };
}

// ---------------------------------------------------------------- atoms and nuclei
export function hydrogen({ ni, nf }) {
  const En = (n) => -13.6 / (n * n);
  const dE = Math.abs(13.6 * (1 / (nf * nf) - 1 / (ni * ni)));
  return {
    dE, lambda: dE ? (H * C) / (dE * E_CHARGE) : Infinity,
    kind: ni === nf ? "none" : ni > nf ? "emission" : "absorption",
    levels: Array.from({ length: 6 }, (_, i) => [[0, En(i + 1)], [1, En(i + 1)]]),
    arrow: [[0.5, En(ni)], [0.5, En(nf)]],
  };
}

export function bindingCurve({ A }) {
  const perNucleon = (a) => {
    const Z = Math.round(a / (1.98 + 0.0155 * a ** (2 / 3)));
    const B = 15.75 * a - 17.8 * a ** (2 / 3) - (0.711 * Z * (Z - 1)) / a ** (1 / 3) - (23.7 * (a - 2 * Z) ** 2) / a;
    return B / a;
  };
  const region = A < 56 ? "Fusion of nuclei this small releases energy" : A > 62
    ? "Fission of nuclei this large releases energy" : "Most tightly bound region (near iron-56)";
  return { perNucleon: perNucleon(A), region, points: Array.from({ length: 243 }, (_, i) => [i + 8, perNucleon(i + 8)]) };
}

// A block released from rest at height h and sliding down a rough slope of the given angle.
export function slideEnergy({ m, h, angle, mu }, n = 101) {
  const th = angle * RAD;
  const length = h / Math.sin(th);
  const slides = Math.tan(th) > mu;
  const ds = linspace(0, length, n);
  const pe = ds.map((d) => [d, m * G * (h - d * Math.sin(th))]);
  const heat = ds.map((d) => [d, slides ? mu * m * G * Math.cos(th) * d : 0]);
  const ke = ds.map((d, i) => [d, slides ? m * G * h - pe[i][1] - heat[i][1] : 0]);   // what is left after PE and heat
  const keEnd = slides ? ke[n - 1][1] : 0;
  const peAll = slides ? pe : ds.map((d) => [d, m * G * h]);   // it never leaves the top
  return { length, slides, ke, pe: peAll, heat, vEnd: Math.sqrt((2 * keEnd) / m), work: slides ? mu * m * G * Math.cos(th) * length : 0 };
}
