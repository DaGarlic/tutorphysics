import * as P from "./physics.js";
import { drawPlot } from "./plot.js";

const sig = (v, n = 3) => Number(v.toPrecision(n)).toString();
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
const last = (a) => a[a.length - 1];

export const DEMOS = [
  {
    id: "shm", topic: 9, title: "Simple harmonic motion",
    blurb: "A mass on a spring. Change the amplitude, mass and spring constant and watch x, v and a against time.",
    controls: [
      { key: "A", label: "Amplitude", unit: "m", min: 0.05, max: 0.5, step: 0.01, value: 0.2 },
      { key: "m", label: "Mass", unit: "kg", min: 0.1, max: 2, step: 0.1, value: 1 },
      { key: "k", label: "Spring constant", unit: "N m⁻¹", min: 5, max: 100, step: 1, value: 25 },
    ],
    model(p) {
      const r = P.shm(p);
      const plot = (title, ylabel, ys) => ({ title, ylabel, xlabel: "t / s", series: [{ points: zip(r.t, ys) }] });
      return {
        plots: [plot("Displacement x", "m", r.x), plot("Velocity v", "m s⁻¹", r.v), plot("Acceleration a", "m s⁻²", r.a),
          { title: "Energy", ylabel: "J", xlabel: "x / m", ymin: 0, series: [
            { label: "kinetic", points: r.energy.ke }, { label: "potential", color: "warn", points: r.energy.pe }] }],
        readout: [["Period T = 2π√(m/k)", `${sig(r.T)} s`], ["Frequency f", `${sig(r.f)} Hz`],
          ["Angular frequency ω", `${sig(r.omega)} rad s⁻¹`], ["Maximum speed ωA", `${sig(r.vmax)} m s⁻¹`],
          ["Maximum acceleration ω²A", `${sig(r.amax)} m s⁻²`]],
      };
    },
  },
  {
    id: "projectile", topic: 5, title: "Projectile motion",
    blurb: "Launch a projectile with no air resistance (g = 9.81 m s⁻²). Try 45° and then a launch from a height.",
    controls: [
      { key: "u", label: "Launch speed", unit: "m s⁻¹", min: 5, max: 50, step: 1, value: 20 },
      { key: "angle", label: "Launch angle", unit: "°", min: 0, max: 90, step: 1, value: 45 },
      { key: "h0", label: "Launch height", unit: "m", min: 0, max: 30, step: 1, value: 0 },
    ],
    model(p) {
      const r = P.projectile(p);
      return {
        plots: [{ title: "Path", ylabel: "y / m", xlabel: "x / m", xmin: 0, ymin: 0, series: [{ points: r.points }] }],
        readout: [["Time of flight", `${sig(r.flightTime)} s`], ["Range", `${sig(r.range)} m`],
          ["Maximum height", `${sig(r.maxHeight)} m`]],
      };
    },
  },
  {
    id: "decay", topic: 20, title: "Radioactive decay",
    blurb: "Number of undecayed nuclei and activity against time. After each half-life the number halves.",
    controls: [
      { key: "N0", label: "Initial nuclei N₀", unit: "", min: 200, max: 2000, step: 100, value: 1000 },
      { key: "halfLife", label: "Half-life", unit: "s", min: 1, max: 60, step: 1, value: 10 },
    ],
    model(p) {
      const r = P.decay(p);
      return {
        plots: [
          { title: "Undecayed nuclei N", ylabel: "", xlabel: "t / s", xmin: 0, ymin: 0,
            series: [{ points: r.points, marker: [p.halfLife, p.N0 / 2] }] },
          { title: "Activity A = λN", ylabel: "s⁻¹", xlabel: "t / s", xmin: 0, ymin: 0,
            series: [{ points: r.points.map(([t, n]) => [t, r.lambda * n]), marker: [p.halfLife, r.activity0 / 2] }] },
        ],
        readout: [["Decay constant λ = ln2 / t½", `${sig(r.lambda)} s⁻¹`], ["Initial activity λN₀", `${sig(r.activity0)} s⁻¹`],
          ["N after one half-life (dot)", sig(p.N0 / 2)]],
      };
    },
  },
  {
    id: "photoelectric", topic: 19, title: "Photoelectric effect",
    blurb: "Maximum kinetic energy of emitted electrons against light frequency: KE = hf − φ. No emission below the threshold frequency.",
    controls: [
      { key: "f", label: "Light frequency", unit: "×10¹⁴ Hz", min: 1, max: 20, step: 0.1, value: 8 },
      { key: "phi", label: "Work function φ", unit: "eV", min: 1.5, max: 6, step: 0.1, value: 2.3 },
    ],
    model({ f, phi }) {
      const r = P.photoelectric({ f: f * 1e14, phi });
      const f0 = r.f0 / 1e14;
      const top = 20;
      return {
        plots: [{ title: "Maximum kinetic energy", ylabel: "eV", xlabel: "f / 10¹⁴ Hz", xmin: 0, ymin: 0,
          series: [{ points: [[0, 0], [f0, 0], [top, P.photoelectric({ f: top * 1e14, phi }).ke]], marker: [f, r.ke] }] }],
        readout: [["Threshold frequency f₀ = φ/h", `${sig(f0)} × 10¹⁴ Hz`], ["Threshold wavelength λ₀", `${sig(r.lambda0 * 1e9)} nm`],
          ["Electrons emitted?", r.emits ? "Yes" : "No: f is below f₀"], ["Maximum KE", `${sig(r.ke)} eV`],
          ["Stopping potential", `${sig(r.vs)} V`]],
      };
    },
  },

  {
    id: "motion", topic: 3, title: "Motion graphs",
    blurb: "Constant acceleration: see displacement, velocity and acceleration against time together.",
    controls: [
      { key: "u", label: "Initial velocity u", unit: "m s⁻¹", min: -10, max: 20, step: 1, value: 2 },
      { key: "a", label: "Acceleration a", unit: "m s⁻²", min: -10, max: 10, step: 0.5, value: 2 },
      { key: "T", label: "Time shown", unit: "s", min: 1, max: 10, step: 0.5, value: 6 },
    ],
    model(p) {
      const r = P.motion(p);
      const g = (title, ylabel, ys) => ({ title, ylabel, xlabel: "t / s", xmin: 0, series: [{ points: zip(r.t, ys) }] });
      return {
        plots: [g("Displacement s", "m", r.s), g("Velocity v", "m s⁻¹", r.v), g("Acceleration a", "m s⁻²", r.a)],
        readout: [["Displacement s = ut + ½at²", `${sig(last(r.s))} m`], ["Final velocity v = u + at", `${sig(last(r.v))} m s⁻¹`],
          ["Mean velocity s/t", `${sig(last(r.s) / p.T)} m s⁻¹`]],
      };
    },
  },
  {
    id: "drag", topic: 5, title: "Falling with air resistance",
    blurb: "Drag proportional to speed: the speed levels off at the terminal velocity.",
    controls: [
      { key: "m", label: "Mass", unit: "kg", min: 0.1, max: 5, step: 0.1, value: 1 },
      { key: "k", label: "Drag constant k (F = kv)", unit: "kg s⁻¹", min: 0.5, max: 20, step: 0.5, value: 5 },
    ],
    model(p) {
      const r = P.drag(p);
      const end = last(r.points)[0];
      return {
        plots: [{ title: "Speed", ylabel: "m s⁻¹", xlabel: "t / s", xmin: 0, ymin: 0, series: [
          { label: "speed v", points: r.points }, { label: "terminal", color: "muted", dashed: true, points: [[0, r.vt], [end, r.vt]] }] }],
        readout: [["Terminal speed mg/k", `${sig(r.vt)} m s⁻¹`], ["Time constant m/k", `${sig(r.tau)} s`],
          ["Initial acceleration", `${sig(P.G)} m s⁻²`], ["Speed after one time constant", `${sig(0.632 * r.vt)} m s⁻¹ (63% of terminal)`]],
      };
    },
  },
  {
    id: "collision", topic: 6, title: "Collisions in one dimension",
    blurb: "Two trolleys 4 m apart. Change the masses, speeds and elasticity (e = 1 is perfectly elastic, e = 0 sticks together).",
    controls: [
      { key: "m1", label: "Mass of trolley 1", unit: "kg", min: 0.5, max: 5, step: 0.5, value: 2 },
      { key: "u1", label: "Velocity of trolley 1", unit: "m s⁻¹", min: -5, max: 8, step: 0.5, value: 3 },
      { key: "m2", label: "Mass of trolley 2", unit: "kg", min: 0.5, max: 5, step: 0.5, value: 1 },
      { key: "u2", label: "Velocity of trolley 2", unit: "m s⁻¹", min: -5, max: 8, step: 0.5, value: 0 },
      { key: "e", label: "Elasticity e", unit: "", min: 0, max: 1, step: 0.05, value: 1 },
    ],
    model(p) {
      const r = P.collision(p);
      return {
        plots: [{ title: "Position", ylabel: "m", xlabel: "t / s", xmin: 0, series: [
          { label: "trolley 1", points: r.p1 }, { label: "trolley 2", color: "warn", points: r.p2 }] }],
        readout: [["Collision?", r.collides ? `Yes, at t = ${sig(r.tc)} s` : "No: trolley 1 is not catching up"],
          ["Velocity of 1 afterwards", `${sig(r.v1)} m s⁻¹`], ["Velocity of 2 afterwards", `${sig(r.v2)} m s⁻¹`],
          ["Total momentum (unchanged)", `${sig(p.m1 * p.u1 + p.m2 * p.u2)} kg m s⁻¹`], ["Kinetic energy lost", `${sig(r.keLost)} J`]],
      };
    },
  },
  {
    id: "incline", topic: 2, title: "Forces on a slope",
    blurb: "Weight, normal reaction and friction on an inclined plane. Raise the angle past tan⁻¹μ and the block starts to slide.",
    controls: [
      { key: "m", label: "Mass", unit: "kg", min: 0.5, max: 10, step: 0.5, value: 2 },
      { key: "angle", label: "Slope angle", unit: "°", min: 0, max: 80, step: 1, value: 30 },
      { key: "mu", label: "Coefficient of friction μ", unit: "", min: 0, max: 1, step: 0.05, value: 0.3 },
    ],
    model(p) {
      const r = P.incline(p);
      return {
        plots: [{ title: "Acceleration down the slope", ylabel: "m s⁻²", xlabel: "angle / °", xmin: 0, ymin: 0,
          series: [{ points: r.curve, marker: [p.angle, r.a] }] }],
        readout: [["Normal reaction mg cosθ", `${sig(r.N)} N`], ["Weight along the slope mg sinθ", `${sig(r.along)} N`],
          [r.slides ? "Kinetic friction μN" : "Static friction (balances the slope)", `${sig(r.friction)} N`],
          ["Acceleration", `${sig(r.a)} m s⁻²`], ["Slides?", r.slides ? "Yes" : `No: below ${sig(r.criticalAngle)}°`]],
      };
    },
  },
  {
    id: "circular", topic: 7, title: "Circular motion",
    blurb: "The centripetal force needed to keep a mass on a circle, and how it scales with speed and radius.",
    controls: [
      { key: "m", label: "Mass", unit: "kg", min: 0.1, max: 5, step: 0.1, value: 1 },
      { key: "v", label: "Speed", unit: "m s⁻¹", min: 1, max: 30, step: 1, value: 10 },
      { key: "r", label: "Radius", unit: "m", min: 0.5, max: 50, step: 0.5, value: 5 },
    ],
    model(p) {
      const r = P.circular(p);
      return {
        plots: [
          { title: "Force against speed (F ∝ v²)", ylabel: "N", xlabel: "v / m s⁻¹", xmin: 0, ymin: 0, series: [{ points: r.forceVsSpeed, marker: [p.v, r.F] }] },
          { title: "Force against radius (F ∝ 1/r)", ylabel: "N", xlabel: "r / m", ymin: 0, series: [{ points: r.forceVsRadius, marker: [p.r, r.F] }] },
        ],
        readout: [["Centripetal force mv²/r", `${sig(r.F)} N`], ["Centripetal acceleration v²/r", `${sig(r.a)} m s⁻²`],
          ["Angular speed ω = v/r", `${sig(r.omega)} rad s⁻¹`], ["Period T = 2πr/v", `${sig(r.T)} s`]],
      };
    },
  },
  {
    id: "orbit", topic: 8, title: "Gravitational field and orbits",
    blurb: "Field strength and potential around a planet, the orbital speed and period, and where a geostationary satellite sits.",
    controls: [
      { key: "M", label: "Planet mass", unit: "×10²⁴ kg", min: 1, max: 20, step: 0.5, value: 5.97 },
      { key: "r", label: "Distance from centre", unit: "×10⁶ m", min: 6.4, max: 60, step: 0.1, value: 42.2 },
    ],
    model(p) {
      const M = p.M * 1e24, r = p.r * 1e6;
      const o = P.orbit({ M, r });
      return {
        plots: [
          { title: "Field strength g", ylabel: "N kg⁻¹", xlabel: "r / 10⁶ m", ymin: 0, series: [{ points: o.gCurve.map(([x, y]) => [x / 1e6, y]), marker: [p.r, o.g] }] },
          { title: "Gravitational potential φ", ylabel: "MJ kg⁻¹", xlabel: "r / 10⁶ m", series: [{ points: o.phiCurve.map(([x, y]) => [x / 1e6, y / 1e6]), marker: [p.r, o.phi / 1e6] }] },
        ],
        readout: [["Field strength GM/r²", `${sig(o.g)} N kg⁻¹`], ["Orbital speed √(GM/r)", `${sig(o.v / 1000)} km s⁻¹`],
          ["Orbital period", `${sig(o.T / 3600)} hours`], ["Escape speed", `${sig(o.vEscape / 1000)} km s⁻¹`],
          ["Geostationary radius (24 h) for this planet", `${sig(P.geostationaryRadius(M) / 1e6)} ×10⁶ m`]],
      };
    },
  },
  {
    id: "gas", topic: 12, title: "Ideal gas isotherms",
    blurb: "Pressure against volume at constant temperature (Boyle's law), and how doubling the temperature lifts the curve.",
    controls: [
      { key: "n", label: "Amount of gas", unit: "mol", min: 0.1, max: 5, step: 0.1, value: 1 },
      { key: "T", label: "Temperature", unit: "K", min: 200, max: 600, step: 10, value: 300 },
      { key: "V", label: "Volume", unit: "litres", min: 1, max: 30, step: 1, value: 10 },
    ],
    model(p) {
      const r = P.gas({ n: p.n, T: p.T, V: p.V / 1000 });
      const toL = (curve) => curve.map(([v, pr]) => [v * 1000, pr / 1000]);
      return {
        plots: [{ title: "Pressure", ylabel: "kPa", xlabel: "V / litres", ymin: 0, series: [
          { label: `T = ${p.T} K`, points: toL(r.isotherm), marker: [p.V, r.p / 1000] },
          { label: `T = ${2 * p.T} K`, color: "warn", dashed: true, points: toL(r.isothermHot) }] }],
        readout: [["Pressure p = nRT/V", `${sig(r.p / 1000)} kPa`], ["Mean kinetic energy per molecule (3/2)kT", `${sig(r.keMean)} J`],
          ["pV", `${sig(r.p * p.V / 1000)} J`], ["pV / nT (= R)", `${sig(r.p * (p.V / 1000) / (p.n * p.T))} J mol⁻¹ K⁻¹`]],
      };
    },
  },
  {
    id: "progressive", topic: 10, title: "A progressive wave",
    blurb: "Move the time slider and watch the wave travel. The same point oscillates with the period T = 1/f.",
    controls: [
      { key: "A", label: "Amplitude", unit: "cm", min: 0.5, max: 5, step: 0.5, value: 2 },
      { key: "lambda", label: "Wavelength", unit: "m", min: 0.1, max: 2, step: 0.05, value: 1 },
      { key: "f", label: "Frequency", unit: "Hz", min: 1, max: 10, step: 0.5, value: 2 },
      { key: "t", label: "Time", unit: "s", min: 0, max: 1, step: 0.05, value: 0 },
    ],
    model(p) {
      const r = P.progressive(p);
      return {
        plots: [
          { title: "Displacement along the wave", ylabel: "cm", xlabel: "x / m", xmin: 0, series: [{ points: r.points }] },
          { title: "Displacement of the point x = 0", ylabel: "cm", xlabel: "t / s", xmin: 0, series: [{ points: r.timePoints, marker: [p.t, -p.A * Math.sin(2 * Math.PI * p.f * p.t)] }] },
        ],
        readout: [["Wave speed v = fλ", `${sig(r.v)} m s⁻¹`], ["Period T = 1/f", `${sig(r.T)} s`],
          ["Angular frequency ω", `${sig(r.omega)} rad s⁻¹`], ["Wave number k = 2π/λ", `${sig(r.k)} rad m⁻¹`]],
      };
    },
  },
  {
    id: "standing", topic: 11, title: "Stationary waves on a string",
    blurb: "A string fixed at both ends. Only certain harmonics fit: n half-wavelengths, n antinodes and n + 1 nodes.",
    controls: [
      { key: "L", label: "String length", unit: "m", min: 0.2, max: 2, step: 0.1, value: 1 },
      { key: "v", label: "Wave speed", unit: "m s⁻¹", min: 50, max: 500, step: 10, value: 200 },
      { key: "n", label: "Harmonic n", unit: "", min: 1, max: 8, step: 1, value: 3 },
      { key: "A", label: "Travelling-wave amplitude", unit: "mm", min: 1, max: 5, step: 0.5, value: 2 },
    ],
    model(p) {
      const r = P.standing(p);
      return {
        plots: [{ title: "Envelope of the stationary wave", ylabel: "mm", xlabel: "x / m", xmin: 0, series: [
          { label: "maximum", points: r.upper }, { label: "minimum", color: "muted", points: r.lower }] }],
        readout: [["Frequency f = nv / 2L", `${sig(r.f)} Hz`], ["Wavelength λ = 2L / n", `${sig(r.lambda)} m`],
          ["Nodes (including both ends)", String(r.nodes)], ["Antinodes", String(r.antinodes)],
          ["Maximum amplitude (antinode) 2A", `${sig(2 * p.A)} mm`]],
      };
    },
  },

  {
    id: "doubleslit", topic: 11, title: "Young's double slit",
    blurb: "Bright fringes are spaced x = λD/a apart. Narrow the slits or lengthen the screen distance and the pattern spreads.",
    controls: [
      { key: "lambda", label: "Wavelength λ", unit: "nm", min: 400, max: 700, step: 10, value: 600 },
      { key: "a", label: "Slit separation a", unit: "mm", min: 0.1, max: 1, step: 0.05, value: 0.5 },
      { key: "D", label: "Screen distance D", unit: "m", min: 0.5, max: 3, step: 0.1, value: 2 },
    ],
    model(p) {
      const r = P.doubleSlit({ lambda: p.lambda * 1e-9, a: p.a * 1e-3, D: p.D });
      return {
        plots: [{ title: "Relative intensity on the screen", ylabel: "", xlabel: "y / mm", ymin: 0,
          series: [{ points: r.points.map(([y, i]) => [y * 1000, i]) }] }],
        readout: [["Fringe separation x = λD/a", `${sig(r.x * 1000)} mm`], ["Check: ax/D", `${sig((p.a * 1e-3 * r.x) / p.D * 1e9)} nm (= λ)`],
          ["Angular spacing λ/a", `${sig((p.lambda * 1e-9) / (p.a * 1e-3) * 1000)} mrad`]],
      };
    },
  },
  {
    id: "grating", topic: 11, title: "Diffraction grating",
    blurb: "Maxima at d sinθ = nλ. More lines per millimetre spreads the orders further apart, until the highest order drops out.",
    controls: [
      { key: "perMm", label: "Lines per millimetre", unit: "mm⁻¹", min: 100, max: 600, step: 10, value: 300 },
      { key: "lambda", label: "Wavelength λ", unit: "nm", min: 400, max: 700, step: 10, value: 600 },
    ],
    model(p) {
      const r = P.grating({ perMm: p.perMm, lambda: p.lambda * 1e-9 });
      const spikes = [0, ...r.angles.flatMap((a) => [-a, a])].sort((x, y) => x - y);
      const points = [[-90, 0], ...spikes.flatMap((a) => [[a, 0], [a, 1], [a, 0]]), [90, 0]];
      return {
        plots: [{ title: "Positions of the bright orders", ylabel: "", xlabel: "angle / °", ymin: 0, series: [{ points }] }],
        readout: [["Slit spacing d = 1/N", `${sig(r.d * 1e6)} μm`], ["Highest order d/λ", String(r.maxOrder)],
          ["Angles of orders 1, 2, …", r.angles.length ? r.angles.slice(0, 5).map((a) => `${sig(a)}°`).join(", ") : "none: the slits are too close"]],
      };
    },
  },
  {
    id: "malus", topic: 10, title: "Polarisation: Malus's law",
    blurb: "Plane-polarised light through a second polariser: the intensity follows cos² of the angle between their axes.",
    controls: [
      { key: "I0", label: "Intensity before the filter", unit: "W m⁻²", min: 1, max: 100, step: 1, value: 100 },
      { key: "theta", label: "Angle between axes", unit: "°", min: 0, max: 180, step: 1, value: 30 },
    ],
    model(p) {
      const r = P.malus(p);
      return {
        plots: [{ title: "Transmitted intensity", ylabel: "W m⁻²", xlabel: "θ / °", xmin: 0, ymin: 0, series: [{ points: r.curve, marker: [p.theta, r.I] }] }],
        readout: [["Transmitted intensity I₀cos²θ", `${sig(r.I)} W m⁻²`], ["Fraction I/I₀", sig(r.I / p.I0)],
          ["Amplitude ratio cosθ", sig(Math.abs(Math.cos((p.theta * Math.PI) / 180)))]],
      };
    },
  },
  {
    id: "pointcharge", topic: 14, title: "Field and potential of a point charge",
    blurb: "E falls as 1/r² but V falls as 1/r. Make the charge negative to see the signs change.",
    controls: [
      { key: "Q", label: "Source charge Q", unit: "nC", min: -20, max: 20, step: 1, value: 5 },
      { key: "r", label: "Distance r", unit: "m", min: 0.05, max: 1, step: 0.01, value: 0.3 },
      { key: "q", label: "Test charge q", unit: "nC", min: 1, max: 10, step: 1, value: 2 },
    ],
    model(p) {
      const r = P.pointCharge({ Q: p.Q * 1e-9, r: p.r, q: p.q * 1e-9 });
      return {
        plots: [
          { title: "Electric field strength E", ylabel: "N C⁻¹", xlabel: "r / m", series: [{ points: r.eCurve, marker: [p.r, r.E] }] },
          { title: "Electric potential V", ylabel: "V", xlabel: "r / m", series: [{ points: r.vCurve, marker: [p.r, r.V] }] },
        ],
        readout: [["Field strength kQ/r²", `${sig(r.E)} N C⁻¹`], ["Potential kQ/r", `${sig(r.V)} V`],
          ["Force on the test charge qE", `${sig(r.F)} N`], ["Potential energy qV", `${sig(r.Ep)} J`]],
      };
    },
  },
  {
    id: "plates", topic: 14, title: "Electron between parallel plates",
    blurb: "A uniform field E = V/d bends the path of an electron into a parabola. Raise the p.d. far enough and it hits the plate.",
    controls: [
      { key: "V", label: "Plate p.d.", unit: "V", min: 10, max: 1000, step: 10, value: 200 },
      { key: "d", label: "Plate separation", unit: "cm", min: 1, max: 5, step: 0.5, value: 2 },
      { key: "v0", label: "Entry speed", unit: "×10⁷ m s⁻¹", min: 1, max: 3, step: 0.1, value: 2 },
      { key: "L", label: "Plate length", unit: "cm", min: 2, max: 10, step: 0.5, value: 5 },
    ],
    model(p) {
      const r = P.plates({ V: p.V, d: p.d / 100, v0: p.v0 * 1e7, L: p.L / 100 });
      return {
        plots: [{ title: "Path of the electron", ylabel: "deflection / mm", xlabel: "x / mm", xmin: 0, ymin: 0, series: [
          { label: "electron", points: r.points.map(([x, y]) => [x * 1000, y * 1000]) },
          { label: "plate", color: "warn", dashed: true, points: [[0, p.d * 10 / 2], [p.L * 10, p.d * 10 / 2]] }] }],
        readout: [["Field strength V/d", `${sig(r.E)} V m⁻¹`], ["Acceleration eE/m", `${sig(r.a)} m s⁻²`],
          ["Deflection at the exit", r.hits ? "The electron hits the plate" : `${sig(r.yExit * 1000)} mm`]],
      };
    },
  },
  {
    id: "internal", topic: 16, title: "Internal resistance and power",
    blurb: "Terminal p.d. falls as more current is drawn: V = E − Ir. The load takes maximum power when R equals r.",
    controls: [
      { key: "E", label: "e.m.f. E", unit: "V", min: 1.5, max: 12, step: 0.5, value: 6 },
      { key: "r", label: "Internal resistance r", unit: "Ω", min: 0.2, max: 5, step: 0.1, value: 1 },
      { key: "R", label: "Load resistance R", unit: "Ω", min: 0.2, max: 20, step: 0.2, value: 4 },
    ],
    model(p) {
      const r = P.internal(p);
      return {
        plots: [
          { title: "Terminal p.d. against current", ylabel: "V", xlabel: "I / A", xmin: 0, ymin: 0, series: [{ points: r.vi, marker: [r.I, r.V] }] },
          { title: "Power in the load against R", ylabel: "W", xlabel: "R / Ω", xmin: 0, ymin: 0, series: [{ points: r.powerCurve, marker: [p.R, r.P] }] },
        ],
        readout: [["Current E/(R + r)", `${sig(r.I)} A`], ["Terminal p.d. V = IR", `${sig(r.V)} V`], ["Lost volts Ir", `${sig(r.I * p.r)} V`],
          ["Power in the load", `${sig(r.P)} W`], ["Maximum possible power E²/4r (at R = r)", `${sig(r.Pmax)} W`]],
      };
    },
  },
  {
    id: "divider", topic: 16, title: "Potential divider with a load",
    blurb: "The output p.d. of a divider, and how a load across it pulls the output down.",
    controls: [
      { key: "Vs", label: "Supply p.d.", unit: "V", min: 3, max: 12, step: 1, value: 9 },
      { key: "R1", label: "Resistor R₁ (top)", unit: "Ω", min: 100, max: 5000, step: 100, value: 1000 },
      { key: "R2", label: "Resistor R₂ (output)", unit: "Ω", min: 100, max: 5000, step: 100, value: 1000 },
      { key: "RL", label: "Load resistance R_L", unit: "Ω", min: 100, max: 20000, step: 100, value: 20000 },
    ],
    model(p) {
      const r = P.divider(p);
      const unloaded = (p.Vs * p.R2) / (p.R1 + p.R2);
      return {
        plots: [{ title: "Output p.d. against R₂", ylabel: "V", xlabel: "R₂ / Ω", xmin: 0, ymin: 0, series: [
          { label: "no load", color: "muted", dashed: true, points: r.unloaded }, { label: "with load", points: r.loaded, marker: [p.R2, r.Vout] }] }],
        readout: [["Output with the load", `${sig(r.Vout)} V`], ["Output with no load", `${sig(unloaded)} V`],
          ["R₂ in parallel with the load", `${sig((p.R2 * p.RL) / (p.R2 + p.RL))} Ω`]],
      };
    },
  },
  {
    id: "bfield", topic: 17, title: "Charged particle in a magnetic field",
    blurb: "A particle moving at right angles to a uniform field travels on a circle of radius r = mv/(qB).",
    controls: [
      { key: "A", label: "Mass number (mass in u)", unit: "", min: 1, max: 20, step: 1, value: 1 },
      { key: "z", label: "Charge", unit: "×e", min: 1, max: 3, step: 1, value: 1 },
      { key: "v", label: "Speed", unit: "×10⁶ m s⁻¹", min: 0.1, max: 10, step: 0.1, value: 1 },
      { key: "B", label: "Flux density", unit: "mT", min: 1, max: 200, step: 1, value: 100 },
    ],
    model(p) {
      const r = P.bfield({ m: p.A * 1.66e-27, q: p.z * 1.6e-19, v: p.v * 1e6, B: p.B * 1e-3 });
      return {
        plots: [{ title: "Path (field into the page)", ylabel: "y / cm", xlabel: "x / cm", equal: true, series: [{ points: r.points.map(([x, y]) => [x * 100, y * 100]) }] }],
        readout: [["Radius mv/(qB)", `${sig(r.r * 100)} cm`], ["Period 2πm/(qB)", `${sig(r.T * 1e6)} μs`],
          ["Frequency", `${sig(1 / r.T / 1e6)} MHz`]],
      };
    },
  },
  {
    id: "coil", topic: 18, title: "Electromagnetic induction: a rotating coil",
    blurb: "A coil spinning in a magnetic field. The e.m.f. is the negative rate of change of flux linkage, so it peaks when the flux is zero.",
    controls: [
      { key: "N", label: "Turns N", unit: "", min: 10, max: 500, step: 10, value: 100 },
      { key: "B", label: "Flux density", unit: "mT", min: 10, max: 500, step: 10, value: 100 },
      { key: "A", label: "Coil area", unit: "cm²", min: 10, max: 200, step: 10, value: 100 },
      { key: "f", label: "Frequency of rotation", unit: "Hz", min: 10, max: 100, step: 5, value: 50 },
    ],
    model(p) {
      const r = P.coil({ N: p.N, B: p.B * 1e-3, A: p.A * 1e-4, f: p.f });
      return {
        plots: [
          { title: "Flux linkage NΦ", ylabel: "Wb", xlabel: "t / s", xmin: 0, series: [{ points: r.flux }] },
          { title: "Induced e.m.f.", ylabel: "V", xlabel: "t / s", xmin: 0, series: [{ points: r.emf }] },
        ],
        readout: [["Peak e.m.f. NBAω", `${sig(r.peak)} V`], ["r.m.s. e.m.f. (peak / √2)", `${sig(r.rms)} V`], ["Angular speed ω", `${sig(2 * Math.PI * p.f)} rad s⁻¹`]],
      };
    },
  },
  {
    id: "rectifier", topic: 15, title: "Half-wave rectification",
    blurb: "A single diode lets current through in one direction only, turning a.c. into pulses of d.c.",
    controls: [
      { key: "V0", label: "Peak voltage", unit: "V", min: 1, max: 20, step: 1, value: 10 },
      { key: "f", label: "Frequency", unit: "Hz", min: 10, max: 100, step: 5, value: 50 },
    ],
    model(p) {
      const r = P.rectifier(p);
      return {
        plots: [{ title: "Voltage across the load", ylabel: "V", xlabel: "t / s", xmin: 0, series: [
          { label: "supply", color: "muted", dashed: true, points: r.input }, { label: "after the diode", points: r.output }] }],
        readout: [["Mean output p.d. (V₀/π)", `${sig(r.mean)} V`], ["r.m.s. of the half-wave output (V₀/2)", `${sig(r.rms)} V`],
          ["r.m.s. of the full supply (V₀/√2)", `${sig(p.V0 / Math.SQRT2)} V`]],
      };
    },
  },
  {
    id: "transformer", topic: 18, title: "The ideal transformer",
    blurb: "Vs/Vp = Ns/Np and, with no losses, Ip/Is = Ns/Np. Lower the efficiency to see the primary current rise.",
    controls: [
      { key: "Np", label: "Primary turns", unit: "", min: 50, max: 1000, step: 50, value: 200 },
      { key: "Ns", label: "Secondary turns", unit: "", min: 50, max: 2000, step: 50, value: 600 },
      { key: "Vp", label: "Primary r.m.s. p.d.", unit: "V", min: 1, max: 240, step: 1, value: 12 },
      { key: "RL", label: "Load resistance", unit: "Ω", min: 5, max: 500, step: 5, value: 50 },
      { key: "eff", label: "Efficiency", unit: "%", min: 50, max: 100, step: 1, value: 100 },
    ],
    model(p) {
      const r = P.transformer({ ...p, eff: p.eff / 100 });
      return {
        plots: [{ title: "Primary and secondary p.d.", ylabel: "V", xlabel: "t / s", xmin: 0, series: [
          { label: "primary", color: "muted", dashed: true, points: r.primary }, { label: "secondary", points: r.secondary }] }],
        readout: [[p.Ns >= p.Np ? "Step-up transformer: Vs" : "Step-down transformer: Vs", `${sig(r.Vs)} V (r.m.s.)`], ["Secondary current Is = Vs/R", `${sig(r.Is)} A`],
          ["Output power", `${sig(r.Pout)} W`], ["Input power", `${sig(r.Pin)} W`], ["Primary current Ip", `${sig(r.Ip)} A`]],
      };
    },
  },
  {
    id: "hydrogen", topic: 19, title: "Hydrogen energy levels",
    blurb: "Photons are emitted or absorbed when an electron jumps between levels E = −13.6 eV / n². Pick the starting and finishing levels.",
    controls: [
      { key: "ni", label: "Initial level n", unit: "", min: 1, max: 8, step: 1, value: 3 },
      { key: "nf", label: "Final level n", unit: "", min: 1, max: 8, step: 1, value: 2 },
    ],
    model(p) {
      const r = P.hydrogen({ ni: p.ni, nf: p.nf });
      const nm = r.lambda * 1e9;
      const band = nm < 380 ? "ultraviolet" : nm <= 750 ? "visible" : "infrared";
      return {
        plots: [{ title: "Energy levels", ylabel: "E / eV", xlabel: "", hideX: true, noLegend: true, xmin: 0,
          series: [...r.levels.map((pts) => ({ points: pts })), { color: "warn", points: r.arrow, marker: r.arrow[1] }] }],
        readout: r.kind === "none"
          ? [["Transition", "None: the two levels are the same"]]
          : [["Process", r.kind === "emission" ? "A photon is emitted" : "A photon is absorbed"], ["Photon energy ΔE", `${sig(r.dE)} eV`],
             ["Wavelength λ = hc/ΔE", `${sig(nm)} nm (${band})`], ["Frequency", `${sig(r.dE * 1.6e-19 / P.H / 1e14)} ×10¹⁴ Hz`]],
      };
    },
  },
  {
    id: "binding", topic: 20, title: "Binding energy per nucleon",
    blurb: "The curve peaks near iron: fusing light nuclei or splitting heavy ones moves towards the peak and releases energy.",
    controls: [{ key: "A", label: "Nucleon number A", unit: "", min: 8, max: 250, step: 1, value: 56 }],
    model(p) {
      const r = P.bindingCurve(p);
      return {
        plots: [{ title: "Binding energy per nucleon", ylabel: "MeV", xlabel: "A", xmin: 0, ymin: 0, series: [{ points: r.points, marker: [p.A, r.perNucleon] }] }],
        readout: [["Binding energy per nucleon", `${sig(r.perNucleon)} MeV`], ["Total binding energy", `${sig(r.perNucleon * p.A)} MeV`], ["Region", r.region]],
      };
    },
  },

  {
    id: "energy", topic: 4, title: "Energy and work on a slope",
    blurb: "A block slides down a rough slope. Potential energy becomes kinetic energy and heat; the total never changes.",
    controls: [
      { key: "m", label: "Mass", unit: "kg", min: 0.5, max: 10, step: 0.5, value: 2 },
      { key: "h", label: "Starting height", unit: "m", min: 0.5, max: 5, step: 0.5, value: 1 },
      { key: "angle", label: "Slope angle", unit: "°", min: 10, max: 80, step: 1, value: 30 },
      { key: "mu", label: "Coefficient of friction μ", unit: "", min: 0, max: 1, step: 0.05, value: 0.2 },
    ],
    model(p) {
      const r = P.slideEnergy(p);
      return {
        plots: [{ title: "Energy against distance down the slope", ylabel: "J", xlabel: "distance / m", xmin: 0, ymin: 0, series: [
          { label: "kinetic", points: r.ke }, { label: "potential", color: "warn", points: r.pe }, { label: "heat (friction)", color: "muted", dashed: true, points: r.heat }] }],
        readout: [["Slides?", r.slides ? "Yes" : "No: friction holds it"], ["Speed at the bottom", `${sig(r.vEnd)} m s⁻¹`],
          ["Work done against friction", `${sig(r.work)} J`], ["Starting potential energy mgh", `${sig(p.m * P.G * p.h)} J`],
          ["Slope length h / sinθ", `${sig(r.length)} m`]],
      };
    },
  },
];

let redraw = null;
if (typeof window !== "undefined") window.addEventListener("resize", () => redraw && redraw());

export function mountDemo(demo, container, h) {
  const values = Object.fromEntries(demo.controls.map((c) => [c.key, c.value]));
  const plotsBox = h("div", { class: "demo-plots" });
  const readout = h("dl", { class: "readout" });

  const resizeWatcher = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => update()) : null;
  const update = () => {
    const out = demo.model(values);
    if (plotsBox.children.length !== out.plots.length) {
      plotsBox.replaceChildren(...out.plots.map(() => h("canvas", { class: "demo-plot" })));
      for (const c of plotsBox.children) resizeWatcher?.observe(c); // fires once the canvas is attached and sized
    }
    out.plots.forEach((plot, i) => drawPlot(plotsBox.children[i], plot));
    readout.replaceChildren(...out.readout.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]));
  };

  const sliders = demo.controls.map((c) => {
    const val = h("output", {}, `${sig(c.value)} ${c.unit}`);
    const input = h("input", { type: "range", min: c.min, max: c.max, step: c.step, value: c.value, "aria-label": c.label });
    input.addEventListener("input", () => {
      values[c.key] = Number(input.value);
      val.textContent = `${sig(values[c.key])} ${c.unit}`;
      update();
    });
    return h("label", { class: "slider" }, h("span", {}, c.label, " ", val), input);
  });

  container.replaceChildren(h("div", { class: "demo-controls" }, ...sliders), plotsBox, readout);
  redraw = update;
  update();
}
