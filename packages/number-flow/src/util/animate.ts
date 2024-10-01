import { BROWSER } from 'esm-env'
import { supportsAtProperty } from '../styles'

export const supportsShadowRootGetAnimations =
	BROWSER && typeof ShadowRoot.prototype.getAnimations !== 'undefined'

export const supportsAnimationFinished = BROWSER && 'finished' in Animation.prototype

export function frames<F extends string | (number | null)>(
	durationMs: number,
	frame: (t: number) => F,
	fps = 60
) {
	const length = Math.trunc((durationMs / 1000) * fps)
	return Array.from({ length }, (_, i) => frame(i / (length - 1)))
}

export type CustomPropertyKeyframes = {
	[property: `--${string}`]: string | number | null | undefined
}

// Makeshift solution for animating custom propeties
// when @property isn't supported:
export function customPropertyFrames(
	durationMs: number,
	frame: (t: number) => CustomPropertyKeyframes,
	fps = 60
) {
	// If CSS.registerProperty is supported, assume they've been registered and do a normal animation
	// on them:
	if (supportsAtProperty) {
		return [frame(0), frame(1)]
	}

	// Discrete values (i.e. custom properties) change halfway between keyframes, so nudge
	// everything over half a frame...
	const length = Math.max(Math.trunc((durationMs / 1000) * fps), 0)
	const frames = Array.from(
		{ length },
		(_, f): Keyframe => ({
			...frame(f / length),
			offset: (f + 0.5) / length
		})
	)
	// ...and add another initial frame
	frames.unshift({
		...frame(0),
		offset: 0
	})

	return frames
}

export const lerp = (min: number, max: number, weight: number) => min + (max - min) * weight
