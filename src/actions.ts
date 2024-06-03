import type { PhilipsSICPInstance } from './main.js'
import {
	Choices,
	Sources,
	SetPowerStateRequest,
	SetSourceRequest,
	GetPowerStateRequest,
	GetInputSourceRequest,
} from './sicpcommand.js'

export enum ActionID {
	Power = 'power',
	Set_Source = 'set_source',
}

export function UpdateActions(self: PhilipsSICPInstance): void {
	self.setActionDefinitions({
		[ActionID.Power]: {
			name: 'Power',
			options: [
				{
					type: 'dropdown',
					id: 'state',
					label: 'State',
					choices: [
						{ id: 'on', label: 'on' },
						{ id: 'off', label: 'off' },
						{ id: 'toggle', label: 'toggle' },
					],
					default: 'on',
				},
			],
			callback: async (info) => {
				switch (info.options.state?.toString()) {
					case 'on': {
						self.SICP.sendTurnOn()
						break
					}
					case 'off': {
						self.SICP.AddToQueue([SetPowerStateRequest(false, self.SICP.groupid), GetPowerStateRequest()])
						break
					}
					case 'toggle': {
						self.SICP.state.ToggleNext = true
						self.SICP.AddToQueue(GetPowerStateRequest())
						break
					}
				}
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
				{
					type: 'checkbox',
					id: 'OSD',
					label: 'Show source',
					default: true,
				},
			],
			callback: async (event) => {
				const source = event.options.source?.toString()
				if (source) {
					const request = SetSourceRequest(source, self.SICP.groupid, event.options.OSD?.valueOf())
					if (source && request) self.SICP.AddToQueue([request, GetInputSourceRequest()])
				}
			},
		},
	})
}
