import { GetConfigFields } from './config.js'

export class SICPClass {
	requestSICPVersion: Uint8Array = new Uint8Array([0x06, 0x01, 0x00, 0xa2, 0x00, 0xa5])
	net = require('node:net')
	socket = new this.net.Socket()

	constructor() {
		this.socket.setKeepAlive(true)
		this.socket.connect(GetConfigFields()[0], GetConfigFields()[1])
	}

	sendCommand(SICPrequest: Uint8Array): void {
		this.socket.write(SICPrequest, 'hex')
	}
}
