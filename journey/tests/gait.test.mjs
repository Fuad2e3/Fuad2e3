import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gaitPose } from '../js/gait.js';

const PHASES = Array.from({ length: 64 }, (_, i) => (i / 64) * Math.PI * 2);

test('rest pose when not walking', () => {
  for (const v of Object.values(gaitPose(1.3, 0))) assert.equal(v, 0);
});

test('legs swing opposite each other', () => {
  for (const f of PHASES) {
    const g = gaitPose(f, 1);
    assert.ok(Math.abs(g.hipL + g.hipR) < 1e-9, `phase ${f}`);
  }
});

test('knees and elbows never bend backwards', () => {
  for (const f of PHASES) {
    const g = gaitPose(f, 1);
    for (const k of ['kneeL', 'kneeR', 'elbowL', 'elbowR']) assert.ok(g[k] >= 0, `${k} ${g[k]} at ${f}`);
  }
});

test('swinging leg bends its knee more than the standing leg', () => {
  const g = gaitPose(0, 1); // left leg moving forward
  assert.ok(g.kneeL > g.kneeR + 0.3, `${g.kneeL} vs ${g.kneeR}`);
});

test('arms counter-swing the legs', () => {
  for (const f of PHASES) {
    const g = gaitPose(f, 1);
    if (Math.abs(g.hipL) > 0.05) assert.equal(Math.sign(g.shoulderL), -Math.sign(g.hipL), `phase ${f}`);
  }
});

test('body is highest at mid-stance', () => {
  assert.ok(gaitPose(0, 1).bob > gaitPose(Math.PI / 2, 1).bob);
});

test('feet stay roughly level', () => {
  for (const f of PHASES) {
    const g = gaitPose(f, 1);
    // foot world pitch = -hip + knee + ankle ≈ 0
    assert.ok(Math.abs(-g.hipL + g.kneeL + g.ankleL) < 0.35, `left foot at ${f}`);
  }
});
