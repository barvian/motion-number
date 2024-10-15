import clsx from 'clsx/lite'
import { ArrowRight } from 'lucide-react'
export default function Notice() {
	return (
		<>
			{/* The only way I could get the blend mode working was to separate the divs which requires fixed sizes */}
			<div
				role="presentation"
				className={clsx(
					'h-16.5',
					'~top-4/8 fixed left-1/2 z-40 -ml-36 w-72 rounded-lg mix-blend-multiply shadow-lg shadow-blue-700/15'
				)}
			/>
			<a
				role="alert"
				href="https://number-flow.barvian.me"
				className={clsx(
					'h-16.5',
					'~top-4/8 prose dark:prose-invert group fixed left-1/2 z-50 -ml-36 w-72 rounded-lg border border-blue-200/15 bg-blue-500 px-4 py-3 text-center text-sm text-white transition hover:brightness-[110%] active:brightness-[98%] active:duration-[25ms] dark:bg-blue-700 dark:text-blue-50'
				)}
			>
				Introducing NumberFlow, the successor to MotionNumber
				<ArrowRight className="relative -top-px ml-1 inline-block size-3.5 align-middle transition-transform group-hover:translate-x-0.5" />
			</a>
		</>
	)
}
