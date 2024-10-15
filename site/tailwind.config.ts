import type { Config } from 'tailwindcss'
import reset from 'tw-reset'
import fluid, {
	extract,
	fontSize,
	screens as _screens,
	type FluidThemeConfig
} from 'fluid-tailwind'
const { lg: _, xl: __, '2xl': ___, ...screens } = _screens
import typography from '@tailwindcss/typography'

export default {
	presets: [reset()],
	content: {
		files: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
		transform: {
			mdx: (src) =>
				src
					// Ignore classes in code blocks
					.replaceAll(/```.*?```/gs, '')
					// Only return stuff in <component>s
					.match(/<[^/].*?>/g)
					?.join() ?? ''
		},
		extract
	},
	corePlugins: {
		container: false
	},
	theme: {
		fontSize,
		fluid: (({ theme }) => ({
			defaultScreens: [, theme('screens.xl')]
		})) satisfies FluidThemeConfig,
		screens: {
			xs: '20rem',
			...screens
		},
		extend: {
			spacing: {
				'16.5': '4.125rem'
			}
		}
	},
	plugins: [fluid, typography]
} satisfies Config
