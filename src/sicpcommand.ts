/* eslint-disable @typescript-eslint/no-unused-vars */
//const requestSICPVersion: Array<number> = [0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5]

import { DropdownChoice } from '@companion-module/base'

export const ControlByte = 0x01

export const Sources: { choice: DropdownChoice; command: number }[] = [
	{ choice: { id: 'HDMI1', label: 'HDMI 1' }, command: 0x0d },
	{ choice: { id: 'HDMI2', label: 'HDMI 2' }, command: 0x06 },
	{ choice: { id: 'HDMI3', label: 'HDMI 3' }, command: 0x0f },
	{ choice: { id: 'HDMI4', label: 'HDMI 4' }, command: 0x19 },
	{ choice: { id: 'DVI', label: 'DVI' }, command: 0x0e },
	{ choice: { id: 'VGA', label: 'VGA' }, command: 0x05 },
	{ choice: { id: 'VGA2', label: 'VGA 2' }, command: 0x1a },
	{ choice: { id: 'VGA3', label: 'VGA 3' }, command: 0x1b },
	{ choice: { id: 'DP', label: 'Display Port' }, command: 0x0a },
	{ choice: { id: 'DP2', label: 'Display Port 2' }, command: 0x07 },
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

export function SetPowerStateRequest(state: boolean, groupID: number): Uint8Array {
	const Command: Array<number> = getBase(groupID)
	Command.push(0x18)
	if (state) Command.push(0x02)
	else Command.push(0x01)
	return CompleteCommand(Command)
}

export function SetSourceRequest(Source: string, groupID: number, OSD: any = true): Uint8Array | undefined {
	const Command: Array<number> = getBase(groupID)
	const command: number | undefined = Sources.find((entry) => entry.choice.id == Source)?.command
	if (!command) return
	Command.push(0xac)
	Command.push(command)
	Command.push(0x09)

	if (OSD == false) Command.push(0x02)
	else Command.push(0x01)

	Command.push(0x00)
	return CompleteCommand(Command)
}

export function GetPowerStateRequest(): Uint8Array {
	const Command: Array<number> = getBase()
	Command.push(0x19)
	return CompleteCommand(Command)
}

export function GetGroupID(): Uint8Array {
	const Command: Array<number> = getBase(0x00)
	Command.push(0x5d)
	return CompleteCommand(Command)
}

export function GetInputSourceRequest(): Uint8Array {
	const Command: Array<number> = getBase()
	Command.push(0xad)
	return CompleteCommand(Command)
}

function getBase(groupID = 0x00): Array<number> {
	const output: Array<number> = new Array<number>()
	output.push(ControlByte)
	output.push(groupID)
	return output
}
