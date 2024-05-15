import { TCPHelper } from '@companion-module/base'
import { PhilipsSICPConfig } from './config.js'

export class SICPClass {
	requestSICPVersion: Uint8Array = new Uint8Array([0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5])
	TurnOffCommand: Uint8Array = new Uint8Array([0x06, 0x01, 0x00, 0x18, 0x01, 0x1e])
	socket: TCPHelper

	#config: PhilipsSICPConfig = {
		host: '',
		port: 5000,
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

	sendCommand(SICPrequest: Uint8Array): void {
		const buffer = Buffer.from(SICPrequest)
		void this.socket.send(buffer)
	}
}
