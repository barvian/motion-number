import Demo, {
	DemoMenu,
	DemoMenuButton,
	DemoMenuItem,
	DemoMenuItems,
	type DemoProps
} from '@/components/Demo'
import NumberFlow from '@number-flow/react'
import * as React from 'react'
import useCycle from '@/hooks/useCycle'

const NUMBERS = [-10, -30]

export default function DemoHOC({ ...rest }: Omit<DemoProps, 'children' | 'code'>) {
	const [value, cycleValue] = useCycle(NUMBERS)
	const [continuous, setContinuous] =
		React.useState<React.ComponentProps<typeof NumberFlow>['continuous']>(false)

	return (
		<Demo
			{...rest}
			title={
				<DemoMenu>
					<DemoMenuButton className="gap-1">
						<code className="text-muted">continuous:</code>
						<code className="font-semibold">{JSON.stringify(continuous)}</code>
					</DemoMenuButton>
					<DemoMenuItems>
						<DemoMenuItem onClick={() => setContinuous(false)} disabled={continuous === false}>
							<code className="font-semibold">false</code>
						</DemoMenuItem>
						<DemoMenuItem onClick={() => setContinuous(true)} disabled={continuous === true}>
							<code className="font-semibold">true</code>
						</DemoMenuItem>
						<DemoMenuItem onClick={() => setContinuous(1)} disabled={continuous === 1}>
							<code className="font-semibold">1</code>
						</DemoMenuItem>
					</DemoMenuItems>
				</DemoMenu>
			}
			onClick={cycleValue}
		>
			<NumberFlow
				continuous={continuous}
				style={{ '--number-flow-line-height': '0.85em' }}
				value={value}
				className="~text-xl/4xl font-semibold"
			/>
		</Demo>
	)
}
