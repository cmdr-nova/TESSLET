import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceLabel, parseCoords, snap } from './geo.ts';

test('coordinates are snapped to the ~2 km grid', () => {
	const c = parseCoords('51.51534', '-0.14102')!;
	assert.ok(Math.abs(c.lat - 51.52) < 1e-9);
	assert.ok(Math.abs(c.lng - -0.14) < 1e-9);
	assert.ok(Math.abs(snap(10.009) - 10.0) < 1e-9);
});

test('bad coordinates are rejected', () => {
	assert.equal(parseCoords('abc', '1'), null);
	assert.equal(parseCoords('91', '0'), null);
	assert.equal(parseCoords('0', '181'), null);
});

test('distances are only shown as coarse buckets', () => {
	assert.equal(distanceLabel(0.3), 'Less than 5 km away');
	assert.equal(distanceLabel(7), 'Less than 10 km away');
	assert.equal(distanceLabel(19), 'Less than 25 km away');
	assert.equal(distanceLabel(61), 'About 50 km away');
	assert.equal(distanceLabel(null), '');
});
