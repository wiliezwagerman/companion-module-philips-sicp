import { combineRgb } from '@companion-module/base'
import type { PhilipsSICPInstance } from './main.js'
import { Choices, Sources } from './sicpcommand.js'

export enum FeedbackID {
	PowerState = 'powerstate',
	InputSource = 'inputsource',
}

export function UpdateFeedbacks(self: PhilipsSICPInstance): void {
	self.setFeedbackDefinitions({
		[FeedbackID.PowerState]: {
			name: 'Display On',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [],
			subscribe: (info) => {
				self.SICP.AddSubscription(info.feedbackId)
			},
			unsubscribe: (info) => {
				self.SICP.RemoveSubscription(info.feedbackId)
			},
			callback: () => {
				return self.SICP.state.PowerState
			},
		},
		[FeedbackID.InputSource]: {
			name: 'Active Input Source',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					id: 'source',
					label: 'Source',
					choices: Choices(),
					default: Sources[0].choice.id,
				},
			],
			subscribe: (info) => {
				self.SICP.AddSubscription(info.feedbackId)
			},
			unsubscribe: (info) => {
				self.SICP.RemoveSubscription(info.feedbackId)
			},
			callback: (info) => {
				return self.SICP.state.InputSource?.toString() == info.options.source?.toString()
			},
		},
	})
}
