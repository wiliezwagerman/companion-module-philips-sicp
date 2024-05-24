import { DropdownChoiceId, TCPHelper } from '@companion-module/base'
import { PhilipsSICPConfig } from './config.js'
import wol from 'wake_on_lan'
import { PhilipsSICPInstance } from './main.js'
import * as sicpcommands from './sicpcommand.js'

export class SICPClass {
	socket: TCPHelper | undefined
	regex_mac = new RegExp(/^[0-9a-fA-F]{12}$/)

	socketStatus = 'Not Initialized'

	#config: PhilipsSICPConfig = {
		host: '',
		port: 5000,
		wol: false,
		mac: '',
		broadcast: '255.255.255.255',
	}

	state: SICPStatus = {
		PowerState: false,
	}

	#self: PhilipsSICPInstance

	constructor(self: PhilipsSICPInstance) {
		this.#config = self.config
		this.#self = self
		this.init_tcp()
	}

	init_tcp(): void {
		this.socket = new TCPHelper(this.#config.host, this.#config.port)

		this.socket.on('status_change', (status, message) => {
			this.socketStatus = status
			if (message != undefined) this.#self.log('debug', message)
		})

		this.socket.on('error', (err) => {
			this.#self.log('debug', 'Network error ' + err)
			this.#self.log('error', 'Network error: ' + err.message)
			this.state.PowerState = false
			this.#self.checkFeedbacks()
		})

		this.socket.on('data', (data) => {
			const dataArray = new Uint8Array(data)
			this.process_data(dataArray)
			this.#self.log('debug', 'State: ' + this.state.PowerState)
		})
	}

	process_data(data: Uint8Array): void {
		switch (data[3]) {
			case 0x19: {
				if (data[4] == 0x02) this.state.PowerState = true
				else this.state.PowerState = false
				break
			}
			case 0xad: {
				this.state.InputSource = sicpcommands.Sources.find((t) => t.command == data[4])?.choice.id
				break
			}
			default:
		}
		this.#self.checkFeedbacks()
	}

	updateConfig(config: PhilipsSICPConfig): void {
		if (config.host !== this.#config.host || config.port !== this.#config.port) {
			this.#config = config
			this.socket?.destroy()
			this.init_tcp()
		}
	}

	SwitchPower(state: boolean): void {
		const Command: Array<number> = sicpcommands.BaseCommand
		Command.push(0x18)
		if (state) Command.push(0x01)
		else Command.push(0x02)
		void this.sendCommand(sicpcommands.CompleteCommand(Command)).then(() => {
			this.sendGetPowerState()
		})
	}

	sendTurnOn(): void {
		if (!this.#config.wol) this.SwitchPower(true)
		else {
			const macAdd: string = this.#config.mac.replace(/[:.-]/g, '')
			const options: wol.WakeOptions = {
				port: 9,
				address: this.#config.broadcast,
				num_packets: 3,
				interval: 100,
			}
			if (this.regex_mac.test(macAdd)) {
				wol.wake(macAdd, options)
				this.#self.log('debug', 'mac: ' + macAdd)
			}
		}
	}

	sendSetSource(Source: string): void {
		const Command: Array<number> = sicpcommands.BaseCommand
		const command: number | undefined = sicpcommands.Sources.find((entry) => entry.choice.id == Source)?.command
		if (!command) return
		Command.push(0xac)
		Command.push(command)
		Command.push(0x09, 0x01, 0x00)
		void this.sendCommand(sicpcommands.CompleteCommand(Command))
	}

	sendGetPowerState(): void {
		const Command: Array<number> = sicpcommands.BaseCommand
		Command.push(0x19)
		void this.sendCommand(sicpcommands.CompleteCommand(Command))
		return
	}

	async sendCommand(SICPrequest: Uint8Array): Promise<boolean> {
		const buffer = Buffer.from(SICPrequest)
		this.#self.log('debug', 'buffer:' + buffer.readInt8())
		if (this.socket == undefined || !this.socket.isConnected) this.init_tcp()
		if (this.socket?.isConnected) {
			return this.socket.send(buffer)
		} else
			return new Promise(() => {
				return false
			})
	}
}

interface SICPStatus {
	PowerState: boolean
	InputSource?: DropdownChoiceId | undefined
}
