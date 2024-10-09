export function getDuration(timing: EffectTiming) {
	if (typeof timing.duration !== 'number')
		throw new Error('NumberFlow timing duration must be a number')
	return timing.duration ?? 0
}

export function frames<F extends string | (number | null)>(
	durationMs: number,
	frame: (t: number) => F,
	fps = 60
) {
	const length = Math.trunc((durationMs / 1000) * fps)
	return Array.from({ length }, (_, i) => frame(i / (length - 1)))
}
