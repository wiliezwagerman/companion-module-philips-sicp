import { combineRgb } from '@companion-module/base'
import type { PhilipsSICPInstance } from './main.js'

export function UpdateFeedbacks(self: PhilipsSICPInstance): void {
	self.setFeedbackDefinitions({
		PowerState: {
			name: 'Display On',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [],
			callback: () => {
				return self.SICP.state.PowerState
			},
		},
	})
}
