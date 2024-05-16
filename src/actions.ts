import type { PhilipsSICPInstance } from './main.js'

export function UpdateActions(self: PhilipsSICPInstance): void {
	self.setActionDefinitions({
		Turn_Off: {
			name: 'Turn off',
			options: [],
			callback: async () => {
				self.SICP.sendTurnOff()
			},
		},
		Turn_On: {
			name: 'Turn on',
			options: [],
			callback: async () => {
				self.SICP.sendTurnOn()
			},
		},
	})
}
