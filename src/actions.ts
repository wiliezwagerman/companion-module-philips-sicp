import type { PhilipsSICPInstance } from './main.js'

export function UpdateActions(self: PhilipsSICPInstance): void {
	self.setActionDefinitions({
		sample_action: {
			name: 'Turn off',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Off',
					default: 5,
					min: 0,
					max: 100,
				},
			],
			callback: async () => {
				self.SICP.sendTurnOff()
			},
		},
	})
}
