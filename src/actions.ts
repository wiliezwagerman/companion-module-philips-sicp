import type { PhilipsSICPInstance } from './main.js'
import { Choices, Sources } from './sicpcommand.js'

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
		Set_Source: {
			name: 'Set Source',
			options: [
				{
					type: 'dropdown',
					id: 'source',
					label: 'Source',
					choices: Choices(),
					default: Sources[0].choice.id,
				},
			],
			callback: async (event) => {
				const source = event.options.source?.toString()
				if (source) self.SICP.sendSetSource(source)
			},
		},
	})
}
