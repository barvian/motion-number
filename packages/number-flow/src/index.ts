import { createElement, offset, replaceChildren, type HTMLProps, type Justify } from './util/dom'
import { forEach } from './util/iterable'
import {
	type KeyedDigitPart,
	type KeyedNumberPart,
	type KeyedSymbolPart,
	type NumberPartKey,
	type PartitionedParts
} from './formatter'
import { ServerSafeHTMLElement } from './ssr'
import styles, { maskHeight, supportsAnimationComposition, supportsLinear } from './styles'
import {
	frames,
	lerp,
	type CustomPropertyKeyframes,
	customPropertyFrames,
	supportsShadowRootGetAnimations,
	supportsAnimationFinished
} from './util/animate'
import { BROWSER } from 'esm-env'

export { SlottedTag, slottedStyles, supportsAnimationComposition, supportsLinear } from './styles'
export * from './formatter'

const canGetAnimationsFinished = supportsShadowRootGetAnimations && supportsAnimationFinished

export const defaultFadeTiming: EffectTiming = { duration: 500, easing: 'ease-out' }
export const defaultXTiming: EffectTiming = supportsLinear
	? {
			duration: 900,
			easing:
				'linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)'
		}
	: {
			duration: 900,
			// Spring-like cubic-bezier stolen from Vaul: https://vaul.emilkowal.ski/
			easing: `cubic-bezier(.32,.72,0,1)`
		}
export const defaultYTiming = defaultXTiming

let styleSheet: CSSStyleSheet | undefined

type AnimationsFinishedListener = () => void
type RemoveAnimationsFinishedListener = () => void

// This one is used internally for framework wrappers, and
// doesn't include things like i.e. attribute support:
export class NumberFlowLite extends ServerSafeHTMLElement {
	static define() {
		if (BROWSER) customElements.define('number-flow', this)
	}

	xTiming = defaultXTiming
	yTiming = defaultYTiming
	fadeTiming = defaultFadeTiming
	root = false
	manual = false

	#created = false
	#pre?: SymbolSection
	#integer?: NumberSection
	#fraction?: NumberSection
	#post?: SymbolSection

	set parts(newVal: PartitionedParts | undefined) {
		if (newVal == null) {
			return
		}

		const { pre, integer, fraction, post } = newVal

		// Initialize if needed
		if (!this.#created) {
			// Don't check for declarative shadow DOM because we'll recreate it anyway:
			this.attachShadow({ mode: 'open' })

			// Add stylesheet
			if (typeof CSSStyleSheet !== 'undefined' && this.shadowRoot!.adoptedStyleSheets) {
				if (!styleSheet) {
					styleSheet = new CSSStyleSheet()
					styleSheet.replaceSync(styles)
				}
				this.shadowRoot!.adoptedStyleSheets = [styleSheet]
			} else {
				const style = document.createElement('style')
				style.textContent = styles
				this.shadowRoot!.appendChild(style)
			}

			this.shadowRoot!.appendChild(createElement('slot'))

			this.#pre = new SymbolSection(this, pre, {
				// part: 'pre',
				inert: true,
				ariaHidden: 'true',
				justify: 'right'
			})
			this.shadowRoot!.appendChild(this.#pre.el)
			this.#integer = new NumberSection(this, integer, {
				// part: 'integer',
				inert: true,
				ariaHidden: 'true',
				justify: 'right'
			})
			this.shadowRoot!.appendChild(this.#integer.el)
			this.#fraction = new NumberSection(this, fraction, {
				// part: 'fraction',
				inert: true,
				ariaHidden: 'true',
				justify: 'left'
			})
			this.shadowRoot!.appendChild(this.#fraction.el)
			this.#post = new SymbolSection(this, post, {
				// part: 'post',
				inert: true,
				ariaHidden: 'true',
				justify: 'left'
			})
			this.shadowRoot!.appendChild(this.#post.el)
		} else {
			if (!this.manual) this.willUpdate()

			this.#pre!.update(pre)
			this.#integer!.update(integer)
			this.#fraction!.update(fraction)
			this.#post!.update(post)

			if (!this.manual) this.didUpdate()
		}

		this.#created = true
	}

	willUpdate() {
		const rect = this.root ? this.getBoundingClientRect() : new DOMRect()
		this.#pre!.willUpdate(rect)
		this.#integer!.willUpdate(rect)
		this.#fraction!.willUpdate(rect)
		this.#post!.willUpdate(rect)
	}

	#animationsFinishedListeners = new Set<AnimationsFinishedListener>()

	onAnimationsFinished(
		cb: AnimationsFinishedListener
	): RemoveAnimationsFinishedListener | undefined {
		this.#animationsFinishedListeners!.add(cb)
		return () => this.#animationsFinishedListeners!.delete(cb)
	}

	#handleAnimationsFinished = () => {
		this.#animationsFinishedListeners!.forEach((cb) => cb())
		this.#animationsFinishedListeners!.clear()
	}

	didUpdate() {
		const rect = this.root ? this.getBoundingClientRect() : new DOMRect()
		this.#pre!.didUpdate(rect)
		this.#integer!.didUpdate(rect)
		this.#fraction!.didUpdate(rect)
		this.#post!.didUpdate(rect)

		if (canGetAnimationsFinished) {
			const allFinished = this.shadowRoot!.getAnimations().map((anim) => anim.finished)
			Promise.all(allFinished)
				.then(this.#handleAnimationsFinished)
				.catch(() => {}) // if an animation is cancelled
		}
	}
}

type SectionProps = { justify: Justify } & HTMLProps<'span'>

abstract class Section {
	readonly el: HTMLSpanElement
	readonly justify: Justify

	// All children in the DOM:
	protected children = new Map<NumberPartKey, Char>()

	constructor(
		readonly flow: NumberFlowLite,
		parts: KeyedNumberPart[],
		{ justify, className, ...opts }: SectionProps,
		children?: (chars: Node[]) => Node[]
	) {
		this.justify = justify
		const chars = parts.map<Node>((p) => this.addChar(p).el)
		// Zero width space prevents the height from collapsing when empty
		// TODO: replace this with height: 1lh when it's better supported:
		chars.push(document.createTextNode('\u200B'))

		this.el = createElement(
			'span',
			{
				...opts,
				className: `section section--justify-${justify} ${className ?? ''}`
			},
			children ? children(chars) : chars
		)
	}

	protected addChar(
		part: KeyedNumberPart,
		{
			startDigitsAtZero = false,
			...props
		}: { startDigitsAtZero?: boolean } & Pick<AnimatePresenceProps, 'animateIn'> = {}
	) {
		const comp =
			part.type === 'integer' || part.type === 'fraction'
				? new Digit(this, part.type, startDigitsAtZero ? 0 : part.value, {
						...props,
						onRemove: this.onCharRemove(part.key)
					})
				: new Sym(this, part.type, part.value, {
						...props,
						onRemove: this.onCharRemove(part.key)
					})
		this.children.set(part.key, comp)
		return comp
	}

	private onCharRemove =
		(key: NumberPartKey): OnRemove =>
		() => {
			this.children.delete(key)
		}

	protected unpop(char: Char) {
		char.el.classList.remove('section__exiting')
		char.el.style[this.justify] = ''
	}

	protected pop(chars: Map<any, Char>) {
		// Calculate offsets for removed before popping, to avoid layout thrashing:
		chars.forEach((char) => {
			char.el.style[this.justify] = `${offset(char.el, this.justify)}px`
		})
		chars.forEach((char) => {
			char.el.classList.add('section__exiting')
			char.present = false
		})
	}

	protected addNewAndUpdateExisting(parts: KeyedNumberPart[], parent: HTMLElement = this.el) {
		const added = new Map<KeyedNumberPart, Char>()
		const updated = new Map<KeyedNumberPart, Char>()

		// Add new parts before any other updates, so we can save their position correctly:
		const reverse = this.justify === 'left'
		const op = reverse ? 'prepend' : 'append'
		forEach(
			parts,
			(part) => {
				let comp: Char
				// Already exists/needs update, so set aside for now
				if (this.children.has(part.key)) {
					comp = this.children.get(part.key)!
					updated.set(part, comp)
					this.unpop(comp)
					comp.present = true
				} else {
					// New part
					comp = this.addChar(part, { startDigitsAtZero: true, animateIn: true })
					added.set(part, comp)
				}
				parent[op](comp.el)
			},
			{ reverse }
		)

		const rect = parent.getBoundingClientRect() // this should only cause a layout if there were added children
		added.forEach((comp) => {
			comp.willUpdate(rect)
		})
		// Update added children to their initial value (we start them at 0)
		added.forEach((comp, part) => {
			comp.update(part.value)
		})

		// Update any updated children
		updated.forEach((comp, part) => {
			comp.update(part.value)
		})
	}
}

class NumberSection extends Section {
	readonly #inner: HTMLSpanElement

	constructor(
		flow: NumberFlowLite,
		parts: KeyedNumberPart[],
		{ className, ...props }: SectionProps
	) {
		let inner: HTMLSpanElement
		super(
			flow,
			parts,
			{
				...props,
				className: `${className ?? ''} section--masked`
			},
			(parts) => [
				(inner = createElement(
					'span',
					{
						className: 'section__inner'
					},
					parts
				))
			]
		)

		// @ts-expect-error TS doesn't know the cb is invoked immediately
		this.#inner = inner
	}

	#prevWidth?: number
	#prevOffset?: number

	willUpdate(parentRect: DOMRect) {
		const rect = this.el.getBoundingClientRect()
		this.#prevWidth = rect.width
		this.#prevOffset = rect[this.justify] - parentRect[this.justify]

		const innerRect = this.#inner.getBoundingClientRect()
		this.children.forEach((comp) => comp.willUpdate(innerRect))
	}

	update(parts: KeyedNumberPart[]) {
		const removed = new Map<NumberPartKey, Char>()

		this.children.forEach((comp, key) => {
			// Keep track of removed children:
			if (!parts.find((p) => p.key === key)) {
				removed.set(key, comp)
			}
			// Put everything back into the flow briefly, to recompute offsets:
			this.unpop(comp)
		})

		this.addNewAndUpdateExisting(parts, this.#inner)

		// Set all removed digits to 0, for mathematical correctness:
		removed.forEach((comp) => {
			if (comp instanceof Digit) comp.update(0)
		})

		// Then end with them popped out again:
		this.pop(removed)
	}

	#animation?: Animation
	#maskAnimation?: Animation
	#innerAnimation?: Animation

	didUpdate(parentRect: DOMRect) {
		// Cancel any previous animations before getting the new rects:
		this.#animation?.cancel()
		this.#innerAnimation?.cancel()
		this.#maskAnimation?.cancel()

		const rect = this.el.getBoundingClientRect()
		const offset = rect[this.justify] - parentRect[this.justify]

		const x = this.#prevOffset! - offset
		const scale = Math.max(this.#prevWidth!, 0.01) / Math.max(rect.width, 0.01) // can't properly compute scale if width is 0

		// Make sure to pass this in before starting to animate:
		const innerRect = this.#inner.getBoundingClientRect()
		this.children.forEach((comp) => comp.didUpdate(innerRect))

		this.#animation = this.el.animate(
			{
				transform: [`translateX(${x}px) scaleX(${scale})`, 'none']
			},
			this.flow.xTiming
		)
		if (scale !== 1) {
			// Invert the scale on the inner element:
			this.#innerAnimation = this.#inner?.animate(
				{
					// 1/x isn't linear so we need to do sampling:
					transform: frames(1000, (t) => `scaleX(${1 / lerp(scale, 1, t)})`)
				},
				this.flow.xTiming
			)

			this.#maskAnimation = this.el.animate(
				customPropertyFrames(
					1000,
					(t): CustomPropertyKeyframes => ({
						'--_number-flow-scale-x': lerp(scale, 1, t)
					})
				),
				this.flow.xTiming
			)
		}
	}
}

class SymbolSection extends Section {
	#prevOffset?: number

	willUpdate(parentRect: DOMRect) {
		const rect = this.el.getBoundingClientRect()
		this.#prevOffset = rect[this.justify] - parentRect[this.justify]

		this.children.forEach((comp) => comp.willUpdate(rect))
	}

	update(parts: KeyedNumberPart[]) {
		const removed = new Map<NumberPartKey, Char>()

		this.children.forEach((comp, key) => {
			// Keep track of removed children:
			if (!parts.find((p) => p.key === key)) {
				removed.set(key, comp)
			}
		})

		// Pop them, before any additions
		this.pop(removed)

		this.addNewAndUpdateExisting(parts)
	}

	#animation?: Animation

	didUpdate(parentRect: DOMRect) {
		// Cancel any previous animations before getting the new rects:
		this.#animation?.cancel()
		const rect = this.el.getBoundingClientRect()
		const offset = rect[this.justify] - parentRect[this.justify]

		// Make sure to pass this in before starting to animate:
		this.children.forEach((comp) => comp.didUpdate(rect))

		this.#animation = this.el.animate(
			{
				transform: [`translateX(${this.#prevOffset! - offset}px)`, 'none']
			},
			this.flow.xTiming
		)
	}
}

type OnRemove = () => void
interface AnimatePresenceProps {
	onRemove?: OnRemove
	animateIn?: boolean
}

class AnimatePresence {
	#present = true
	#onRemove?: OnRemove
	#animation?: Animation
	#removeOnAnimationsFinished?: RemoveAnimationsFinishedListener

	constructor(
		readonly flow: NumberFlowLite,
		readonly el: HTMLElement,
		{ onRemove, animateIn = false }: AnimatePresenceProps = {}
	) {
		if (animateIn) {
			this.el.animate(
				{
					opacity: ['0', '1']
				},
				flow.fadeTiming
			)
		}

		this.#onRemove = onRemove
	}

	get present() {
		return this.#present
	}
	set present(val) {
		if (this.#present === val) return
		const opacity = getComputedStyle(this.el).getPropertyValue('opacity')
		this.#animation?.cancel()
		this.#removeOnAnimationsFinished?.()
		this.#animation = this.el.animate(
			{
				opacity: [opacity, val ? '1' : '0']
			},
			{
				...this.flow.fadeTiming,
				fill: val ? 'none' : 'forwards'
			}
		)
		if (!val) {
			const onFinish = () => {
				this.el.remove()
				this.#onRemove?.()
			}
			if (canGetAnimationsFinished)
				this.#removeOnAnimationsFinished = this.flow.onAnimationsFinished(onFinish)
			else this.#animation.onfinish = onFinish
		}
		this.#present = val
	}
}

interface CharOptions extends AnimatePresenceProps {}

abstract class Char<P extends KeyedNumberPart = KeyedNumberPart> extends AnimatePresence {
	constructor(
		readonly section: Section,
		protected value: P['value'],
		override readonly el: HTMLSpanElement,
		options?: AnimatePresenceProps
	) {
		super(section.flow, el, options)
	}

	abstract willUpdate(parentRect: DOMRect): void
	abstract update(value: P['value']): void
	abstract didUpdate(parentRect: DOMRect): void
}

class Digit extends Char<KeyedDigitPart> {
	constructor(
		section: Section,
		_: KeyedDigitPart['type'],
		value: KeyedDigitPart['value'],
		opts?: CharOptions
	) {
		super(
			section,
			value,
			createElement('span', {
				className: `digit`,
				// part: `digit ${type} ${value}`,
				textContent: value + ''
			}),
			opts
		)
	}

	#prevValue?: KeyedDigitPart['value']
	// Relative to parent:
	#prevY?: number
	#prevCenter?: number

	willUpdate(parentRect: DOMRect) {
		this.#prevValue = this.value
		const rect = this.el.getBoundingClientRect()
		this.#prevY = rect.y - parentRect.y
		const prevOffset = rect[this.section.justify] - parentRect[this.section.justify]
		const halfWidth = rect.width / 2
		this.#prevCenter =
			this.section.justify === 'left' ? prevOffset + halfWidth : prevOffset - halfWidth
	}

	update(value: KeyedDigitPart['value']) {
		this.value = value

		if (this.#prevValue !== value) {
			// // @ts-expect-error wrong built-in DOM types
			// this.el.part = `digit ${this.type} ${value}`

			// We need all the digits, in case of interruptions:
			replaceChildren(this.el, [
				...(value === 0
					? []
					: [
							createElement(
								'span',
								{ className: 'digit__stack digit__lt' },
								Array.from({ length: value }, (_, i) =>
									createElement('span', { textContent: i + '' })
								)
							)
						]),
				document.createTextNode(value + ''),
				...(value === 9
					? []
					: [
							createElement(
								'span',
								{ className: 'digit__stack digit__gt' },
								Array.from({ length: 9 - value }, (_, i) =>
									createElement('span', { textContent: value + i + 1 + '' })
								)
							)
						])
			])
		}
	}

	#xAnimation?: Animation
	#yAnimation?: Animation

	didUpdate(parentRect: DOMRect) {
		// Cancel any previous animations before getting the new rect:
		this.#xAnimation?.cancel()
		if (this.#prevValue !== this.value) this.#yAnimation?.cancel()
		const rect = this.el.getBoundingClientRect()
		const offset = rect[this.section.justify] - parentRect[this.section.justify]
		const halfWidth = rect.width / 2
		const center = this.section.justify === 'left' ? offset + halfWidth : offset - halfWidth

		const x = `translateX(${this.#prevCenter! - center}px)`
		// Add the offset between the prev top and current parent top to account for interruptions:
		const y = `translateY(calc((100% + ${maskHeight}) * ${this.value - this.#prevValue!} + ${this.#prevY!}px))`

		// If animation composition is not supported, animate x with y using x's easing
		// which is probably safer (i.e. if they use bounce for y):
		this.#xAnimation = this.el.animate(
			{
				transform: [supportsAnimationComposition ? x : `${x} ${y}`, 'none']
			},
			{
				...this.flow.xTiming,
				composite: 'accumulate' // in case there's an in-flight y animation
			}
		)
		if (supportsAnimationComposition && this.#prevValue !== this.value) {
			this.#yAnimation = this.el.animate(
				{
					transform: [y, 'none']
				},
				{
					...this.flow.yTiming,
					composite: 'accumulate'
				}
			)
		}
	}
}

class Sym extends Char<KeyedSymbolPart> {
	constructor(
		section: Section,
		private type: KeyedSymbolPart['type'],
		value: KeyedSymbolPart['value'],
		opts?: CharOptions
	) {
		const val = createElement('span', {
			className: 'symbol__value',
			textContent: value
		})
		super(
			section,
			value,
			createElement(
				'span',
				{
					className: `symbol`
				},
				[val]
			),
			opts
		)
		this.#children.set(
			value,
			new AnimatePresence(this.flow, val, {
				onRemove: this.#onChildRemove(value)
			})
		)
	}

	#children = new Map<KeyedSymbolPart['value'], AnimatePresence>()

	#prevOffset?: number

	willUpdate(parentRect: DOMRect) {
		if (this.type === 'decimal') return // decimal never needs animation b/c it's the first in a left aligned section and never moves
		const rect = this.el.getBoundingClientRect()
		this.#prevOffset = rect[this.section.justify] - parentRect[this.section.justify]
	}

	#onChildRemove =
		(key: KeyedSymbolPart['value']): OnRemove =>
		() => {
			this.#children.delete(key)
		}

	update(value: KeyedSymbolPart['value']) {
		if (this.value !== value) {
			// Pop the current value:
			const current = this.#children.get(this.value)!
			current.present = false
			current.el.classList.add('symbol__exiting')

			// If we already have the new value and it hasn't finished removing, reclaim it:
			if (this.#children.has(value)) {
				const prev = this.#children.get(value)!
				prev.present = true
				prev.el.classList.remove('symbol__exiting')
			} else {
				// Otherwise, create a new one:
				const newVal = createElement('span', {
					className: 'symbol__value',
					textContent: value
				})
				this.el.appendChild(newVal)
				this.#children.set(
					value,
					new AnimatePresence(this.flow, newVal, {
						animateIn: true,
						onRemove: this.#onChildRemove(value)
					})
				)
			}
		}
		this.value = value
	}

	#xAnimation?: Animation

	didUpdate(parentRect: DOMRect) {
		if (this.type === 'decimal') return
		// Cancel any previous animations before getting the new rect:
		this.#xAnimation?.cancel()
		const rect = this.el.getBoundingClientRect()
		const offset = rect[this.section.justify] - parentRect[this.section.justify]

		this.#xAnimation = this.el.animate(
			{
				transform: [`translateX(${this.#prevOffset! - offset}px)`, 'none']
			},
			this.flow.xTiming
		)
	}
}
