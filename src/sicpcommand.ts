/* eslint-disable @typescript-eslint/no-unused-vars */
//const requestSICPVersion: Array<number> = [0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5]

import { DropdownChoice } from '@companion-module/base'
import { SICPClass } from './sicp.js'

//const GetPowerState: Array<number> = [0x05, 0x01, 0x00, 0x19, 0x1d]
export const BaseCommand: Array<number> = [0x01, 0x00]

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

export function SwitchPower(sicpSocket: SICPClass, state: boolean): void {
	const Command: Array<number> = getBase()
	Command.push(0x18)
	if (state) Command.push(0x01)
	else Command.push(0x02)
	void sicpSocket.sendCommand(CompleteCommand(Command)).then(() => {
		sendGetPowerState(sicpSocket)
	})
}

export function sendSetSource(sicpSocket: SICPClass, Source: string): void {
	const Command: Array<number> = getBase()
	sicpSocket.printCommand(new Uint8Array(BaseCommand))
	const command: number | undefined = Sources.find((entry) => entry.choice.id == Source)?.command
	if (!command) return
	Command.push(0xac)
	Command.push(command)
	Command.push(0x09, 0x01, 0x00)
	void sicpSocket.sendCommand(CompleteCommand(Command))
}

export function sendGetPowerState(sicpSocket: SICPClass): void {
	const Command: Array<number> = getBase()
	Command.push(0x19)
	void sicpSocket.sendCommand(CompleteCommand(Command))
	return
}

function getBase(): Array<number> {
	const output: Array<number> = new Array<number>()
	BaseCommand.forEach((t) => {
		output.push(t)
	})
	return output
}
