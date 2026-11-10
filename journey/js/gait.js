// Human walk cycle as joint angles (radians). Pure maths, no Three.js.
// Conventions: hip/shoulder > 0 = limb forward; knee/elbow > 0 = flexed; ankle > 0 = toes down.
// phase: walk-cycle angle; amt: 0 (standing) .. 1 (full stride).
export function gaitPose(phase, amt) {
  if (amt === 0) {
    return { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, ankleL: 0, ankleR: 0, shoulderL: 0, shoulderR: 0, elbowL: 0, elbowR: 0, bob: 0, sway: 0, twist: 0 };
  }
  const leg = (f) => {
    const hip = 0.45 * Math.sin(f);
    // knee folds while the leg swings forward (cos f > 0), small flex at heel strike
    const knee = 0.08 + 0.9 * Math.max(0, Math.cos(f)) ** 1.5;
    // keep the foot level: cancel thigh + shin pitch, a little toe-off behind the body
    const ankle = hip - knee + 0.2 * Math.max(0, -Math.sin(f));
    return { hip: hip * amt, knee: knee * amt, ankle: ankle * amt };
  };
  const l = leg(phase);
  const r = leg(phase + Math.PI);
  const arm = (f) => ({ shoulder: -0.38 * Math.sin(f) * amt, elbow: (0.25 + 0.3 * Math.max(0, -Math.sin(f))) * amt });
  const al = arm(phase);
  const ar = arm(phase + Math.PI);
  return {
    hipL: l.hip, hipR: r.hip, kneeL: l.knee, kneeR: r.knee, ankleL: l.ankle, ankleR: r.ankle,
    shoulderL: al.shoulder, shoulderR: ar.shoulder, elbowL: al.elbow, elbowR: ar.elbow,
    bob: 0.045 * Math.cos(phase) ** 2 * amt,
    sway: 0.03 * Math.sin(phase) * amt,
    twist: 0.12 * Math.sin(phase) * amt,
  };
}
