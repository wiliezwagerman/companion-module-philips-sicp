import { combineRgb } from '@companion-module/base'
import type { PhilipsSICPInstance } from './main.js'

export function UpdateFeedbacks(self: PhilipsSICPInstance): void {
	self.setFeedbackDefinitions({
		ChannelState: {
			name: 'Display On',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [],
			callback: async () => {
				await self.SICP.sendGetPowerState()
				return self.SICP.state.PowerState
			},
		},
	})
}
