export function getDiffAtPlace(
	previous: number | undefined,
	current: number | undefined,
	place: number
): number {
	if (previous == null || current == null) return 0
	const placeMultiplier = Math.pow(10, place)
	const previousValue = Math.floor(previous / placeMultiplier)
	const currentValue = Math.floor(current / placeMultiplier)
	return currentValue - previousValue
}

export const lerp = (min: number, max: number, weight: number) => min + (max - min) * weight
