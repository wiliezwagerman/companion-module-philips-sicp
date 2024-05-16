import { TCPHelper } from '@companion-module/base'
import { PhilipsSICPConfig } from './config.js'
import wol from 'wake_on_lan'

export class SICPClass {
	requestSICPVersion: Uint8Array = new Uint8Array([0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5])
	TurnOffCommand: Uint8Array = new Uint8Array([0x06, 0x01, 0x00, 0x18, 0x01, 0x1e])
	TurnOnCommand: Uint8Array = new Uint8Array([0x06, 0x01, 0x00, 0x18, 0x02, 0x1d])
	socket: TCPHelper
	regex_mac = new RegExp(/^[0-9a-fA-F]{12}$/)

	#config: PhilipsSICPConfig = {
		host: '',
		port: 5000,
		wol: true,
		mac: '',
	}

	constructor(config: PhilipsSICPConfig) {
		this.#config = config
		this.socket = new TCPHelper(this.#config.host, this.#config.port)
	}

	updateConfig(config: PhilipsSICPConfig): void {
		if (config.host !== this.#config.host || config.port !== this.#config.port) this.#config = config
	}

	sendTurnOff(): void {
		this.sendCommand(this.TurnOffCommand)
	}

	sendTurnOn(): void {
		if (!this.#config.wol) this.sendCommand(this.TurnOnCommand)
		else {
			const macAdd: string = this.#config.mac.replace(/[:.-]/g, '')
			if (this.regex_mac.test(macAdd)) {
				wol.wake(macAdd, {
					num_packets: 1,
				})
			}
		}
	}

	sendCommand(SICPrequest: Uint8Array): void {
		const buffer = Buffer.from(SICPrequest)
		void this.socket.send(buffer)
	}
}
