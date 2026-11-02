// Location privacy. Researchers have located dating-app users to within meters by
// trilaterating exact "X km away" readouts, so we never store or reveal precise positions.
// 1. Coordinates are snapped to a ~2 km grid BEFORE they hit the database.
// 2. Distances are only ever shown as coarse buckets.

const GRID = 0.02; // degrees, about 2.2 km of latitude

export function snap(value: number) {
	return Math.round(value / GRID) * GRID;
}

export function parseCoords(lat: unknown, lng: unknown) {
	const la = Number(lat);
	const lo = Number(lng);
	if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
	return { lat: snap(la), lng: snap(lo) };
}

export function distanceLabel(km: number | null) {
	if (km == null) return '';
	if (km < 5) return 'Less than 5 km away';
	if (km < 10) return 'Less than 10 km away';
	if (km < 25) return 'Less than 25 km away';
	return `About ${Math.round(km / 25) * 25} km away`;
}
