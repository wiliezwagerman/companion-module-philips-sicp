import type { PhilipsSICPInstance } from './main.js'
import { Choices, Sources, SetPowerStateRequest, SetSourceRequest } from './sicpcommand.js'

export enum ActionID {
	Turn_Off = 'turn_off',
	Turn_On = 'turn_on',
	Set_Source = 'set_source',
}

export function UpdateActions(self: PhilipsSICPInstance): void {
	self.setActionDefinitions({
		[ActionID.Turn_Off]: {
			name: 'Turn off',
			options: [],
			callback: async () => {
				self.SICP.AddToQueue(SetPowerStateRequest(false))
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
				if (source) self.SICP.AddToQueue(SetSourceRequest(source))
			},
		},
	})
}
