import { TCPHelper } from '@companion-module/base'
import { PhilipsSICPConfig } from './config.js'
import wol from 'wake_on_lan'
import { PhilipsSICPInstance } from './main.js'

export class SICPClass {
	requestSICPVersion: Array<number> = [0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5]
	TurnOffCommand: Array<number> = [0x06, 0x01, 0x00, 0x18, 0x01, 0x1e]
	TurnOnCommand: Array<number> = [0x06, 0x01, 0x00, 0x18, 0x02, 0x1d]
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
		})

		this.socket.on('data', (data) => {
			this.#self.log('debug', 'Received data: ' + data)
		})
	}

	updateConfig(config: PhilipsSICPConfig): void {
		if (config.host !== this.#config.host || config.port !== this.#config.port) {
			this.#config = config
			this.socket?.destroy()
			this.init_tcp()
		}
	}

	sendTurnOff(): void {
		this.sendCommand(this.TurnOffCommand)
	}

	sendTurnOn(): void {
		if (!this.#config.wol) this.sendCommand(this.TurnOnCommand)
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

	sendCommand(SICPrequest: Array<number>): void {
		const buffer = Buffer.from(SICPrequest)
		this.#self.log('debug', 'buffer:' + buffer.readInt8())
		if (this.socket == undefined || !this.socket.isConnected) this.init_tcp()
		if (this.socket?.isConnected) void this.socket.send(buffer)
	}
}
