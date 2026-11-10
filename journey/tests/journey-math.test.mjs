import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../js/data.js';
import { clamp01, stationIndexAt, localProgress, walkPhase, positionAt } from '../js/journey-math.js';

test('ranges cover 0..1 without gaps', () => {
  assert.equal(STATIONS[0].range[0], 0);
  assert.equal(STATIONS.at(-1).range[1], 1);
  for (let i = 1; i < STATIONS.length; i++) assert.equal(STATIONS[i].range[0], STATIONS[i - 1].range[1]);
  assert.deepEqual(STATIONS.map((s) => s.id), ['intro', 'mobile', 'web', 'ai', 'academic', 'contact']);
});

test('project counts match README', () => {
  const count = (id) => STATIONS.find((s) => s.id === id).projects.length;
  assert.deepEqual([count('mobile'), count('web'), count('ai'), count('academic')], [9, 11, 5, 15]);
  for (const s of STATIONS) for (const p of s.projects) assert.match(p.url, /^https:\/\//, p.name);
});

test('clamp01', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(0.3), 0.3);
});

test('stationIndexAt', () => {
  const cases = [[0, 0], [0.1, 1], [0.5, 2], [0.6, 3], [0.8, 4], [1, 5], [-0.2, 0], [1.4, 5]];
  for (const [p, i] of cases) assert.equal(stationIndexAt(p, STATIONS), i, `p=${p}`);
});

test('localProgress', () => {
  const mobile = STATIONS.find((s) => s.id === 'mobile');
  assert.ok(Math.abs(localProgress(0.2, mobile) - 0.5) < 1e-9);
  assert.equal(localProgress(0, mobile), 0);
  assert.equal(localProgress(1, mobile), 1);
});

test('positionAt is pure in progress', () => {
  const pts = [[0, 0, 0], [10, 0, 0]];
  assert.deepEqual(positionAt(0.5, pts), [5, 0, 0]);
  positionAt(0.9, pts);
  assert.deepEqual(positionAt(0.5, pts), [5, 0, 0]);
  assert.deepEqual(positionAt(0, pts), [0, 0, 0]);
  assert.deepEqual(positionAt(1, pts), [10, 0, 0]);
});

test('positionAt uses arc length', () => {
  const pts = [[0, 0, 0], [0, 0, 2], [8, 0, 2]]; // total length 10
  assert.deepEqual(positionAt(0.1, pts), [0, 0, 1]);
  assert.deepEqual(positionAt(0.6, pts), [4, 0, 2]);
});

test('walkPhase', () => {
  assert.ok(Math.abs(walkPhase(0.5, 60) - 60 * Math.PI) < 1e-9);
});

import { progressFromScroll } from '../js/journey-math.js';

test('progressFromScroll maps each section onto its station range', () => {
  const st = [{ range: [0, 0.2] }, { range: [0.2, 1] }];
  const spans = [[0, 1000], [1000, 3000]]; // [top, bottom] in px, doc height 3000
  const vh = 1000; // max scroll 2000
  assert.equal(progressFromScroll(0, vh, spans, st), 0);
  assert.equal(progressFromScroll(2000, vh, spans, st), 1);
  // scrollY 1000 -> reading line at 1000 + 1000*0.5 = 1500 -> 25% into section 2 -> 0.2 + 0.8*0.25
  assert.ok(Math.abs(progressFromScroll(1000, vh, spans, st) - 0.4) < 1e-9);
  assert.equal(progressFromScroll(-50, vh, spans, st), 0);
  assert.equal(progressFromScroll(9999, vh, spans, st), 1);
});
