import { expect, test } from 'vitest';
import { classicProfile as p } from '../src/core/profile.js';

test('baseline uses seconds and logical pixels; platform weights total one', () => {
  expect(p.moveSpeed).toBe(170);
  expect(p.gravity).toBe(1500);
  expect(p.weights.reduce((sum, [, weight]) => sum + weight, 0)).toBeCloseTo(1);
  expect(p.width / p.height).toBe(0.75);
});
