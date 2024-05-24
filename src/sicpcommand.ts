/* eslint-disable @typescript-eslint/no-unused-vars */
//const requestSICPVersion: Array<number> = [0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5]

import { DropdownChoice } from '@companion-module/base'

//const GetPowerState: Array<number> = [0x05, 0x01, 0x00, 0x19, 0x1d]
export const BaseCommand: Array<number> = [0x01, 0x00]

export const TurnOffCommand: Array<number> = [0x06, 0x01, 0x00, 0x18, 0x02, 0x1d]
export const TurnOnCommand: Array<number> = [0x06, 0x01, 0x00, 0x18, 0x01, 0x1e]

export const Sources: { choice: DropdownChoice; command: number }[] = [
	{ choice: { id: 'HDMI1', label: 'HDMI 1' }, command: 0x0d },
	{ choice: { id: 'HDMI2', label: 'HDMI 2' }, command: 0x06 },
	{ choice: { id: 'HDMI3', label: 'HDMI 3' }, command: 0x0f },
	{ choice: { id: 'HDMI4', label: 'HDMI 4' }, command: 0x19 },
	{ choice: { id: 'DVI', label: 'DVI' }, command: 0x0e },
	{ choice: { id: 'VGA', label: 'VGA' }, command: 0x05 },
	{ choice: { id: 'DP', label: 'DP' }, command: 0x0a },
]

export function CompleteCommand(input: Array<number>): Uint8Array {
	input.unshift(input.length + 2)

	let checksum = 0x00
	input.forEach((t) => {
		checksum ^= t
	})
	input.push(checksum)
	return new Uint8Array(input)
}

export function Choices(): DropdownChoice[] {
	const output: DropdownChoice[] = new Array<DropdownChoice>()
	Sources.forEach((entry) => {
		return output.push(entry.choice)
	})
	return output
}
function sendSetSource(Source: any, string: any) {
	throw new Error('Function not implemented.')
}
