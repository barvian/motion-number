import Link from '@/components/Link'
import { BookOpen, Shapes, GalleryVerticalEnd } from 'lucide-react'
import { motion, MotionConfig } from 'framer-motion'
import { useStore } from '@nanostores/react'
import { urlAtom } from '@/stores/url'
import * as React from 'react'
import clsx from 'clsx/lite'
import { isActive } from '../lib/url'

type Props = JSX.IntrinsicElements['nav'] & {
	stargazers: number
	repo?: string
}

export default function Nav({ stargazers, className, repo, ...props }: Props) {
	const url = useStore(urlAtom)

	// Fix scroll positions after view transitions:
	const scrollableRef = React.useRef<HTMLDivElement>(null)
	React.useEffect(() => {
		const beforeSwap = () => {
			const scrollLeft = scrollableRef.current?.scrollLeft
			document.addEventListener(
				'astro:after-swap',
				() => {
					scrollableRef.current?.scrollTo({ left: scrollLeft, behavior: 'instant' })
				},
				{ once: true }
			)
		}
		document.addEventListener('astro:before-swap', beforeSwap)

		return () => {
			document.removeEventListener('astro:before-swap', beforeSwap)
		}
	}, [])

	const x = React.useMemo(() => {
		if (isActive('/', url)) return 0
		if (isActive('/examples', url)) return 1
		return 2
	}, [url])

	return (
		<MotionConfig transition={{ layout: { duration: 0.35, type: 'spring', bounce: 0 } }}>
			<nav
				{...props}
				className={clsx(
					className,
					'~pb-6/10 pointer-events-none fixed bottom-0 left-0 z-10 w-full pt-12'
				)}
				id="nav"
				style={{ '--x': x }}
			>
				<div className="absolute -inset-[18px] top-auto h-[12rem] bg-gradient-to-t from-white to-white/0 blur-[10px] dark:from-zinc-950 dark:to-zinc-950/0"></div>
				<div className="container flex justify-center">
					{/* The backdrop blur broke with VTs when it was on the scrolling div: */}
					<div className="max-w-full rounded-[1.375rem] bg-zinc-100/90 ring ring-black/[5%] backdrop-blur-xl backdrop-saturate-[140%] dark:border dark:border-white/[8%] dark:bg-zinc-950/90 dark:ring-0">
						<div
							ref={scrollableRef}
							className="scrollbar-none vt/nav pointer-events-auto overflow-x-auto scroll-smooth rounded-[inherit] p-1.5"
						>
							<div className="relative isolate grid grid-cols-[repeat(5,5.6875em)]">
								<div className="dark:bg-white/12.5 spring-bounce-0 spring-duration-300 absolute left-0 top-0 -z-10 h-full w-[5.6875em] translate-x-[calc(var(--x)*5.6875em)] rounded-2xl bg-white shadow-lg transition-transform dark:shadow-none" />
								<Link
									href="/"
									className="text-muted hover:text-primary data-[active]:text-primary flex flex-col items-center gap-1.5 rounded-2xl px-4 pb-1.5 pt-2.5 text-xs font-medium outline-none transition-[color] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
								>
									<BookOpen className="size-6" absoluteStrokeWidth />
									Docs
								</Link>
								<Link
									href="/examples"
									className="text-muted hover:text-primary data-[active]:text-primary flex flex-col items-center gap-1.5 rounded-2xl px-4 pb-1.5 pt-2.5 text-xs font-medium outline-none transition-[color] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
								>
									<Shapes className="size-6" absoluteStrokeWidth />
									Examples
								</Link>
								<Link
									href="/showcase"
									frameworked={false}
									className="text-muted hover:text-primary data-[active]:text-primary flex flex-col items-center gap-1.5 rounded-2xl px-4 pb-1.5 pt-2.5 text-xs font-medium outline-none transition-[color] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
								>
									<GalleryVerticalEnd className="size-6 -scale-y-100" absoluteStrokeWidth />
									Showcase
								</Link>
								<a
									className="text-muted hover:text-primary data-[active]:text-primary flex flex-col items-center gap-1.5 rounded-2xl px-4 pb-1.5 pt-2.5 text-xs font-medium outline-none transition-[color] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
									href={repo}
									target="_blank"
									aria-label="Star on GitHub"
								>
									<svg viewBox="0 0 16 16" className="size-6 fill-current" role="none">
										<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
									</svg>
									{stargazers}
								</a>
								<a
									href="https://x.com/mbarvian"
									className="text-muted hover:text-primary data-[active]:text-primary flex flex-col items-center gap-1.5 rounded-2xl px-4 pb-1.5 pt-2.5 text-xs font-medium outline-none transition-[color] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
									target="_blank"
								>
									<svg viewBox="0 0 24 24" className="size-6 fill-current">
										<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
									</svg>
									Follow
								</a>
							</div>
						</div>
					</div>
				</div>
			</nav>
		</MotionConfig>
	)
}
