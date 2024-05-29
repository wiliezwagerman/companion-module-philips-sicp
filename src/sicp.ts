import { DropdownChoiceId, TCPHelper } from '@companion-module/base'
import { PhilipsSICPConfig } from './config.js'
import wol from 'wake_on_lan'
import { PhilipsSICPInstance } from './main.js'
import * as sicpcommands from './sicpcommand.js'
import { FeedbackID } from './feedbacks.js'
import pQueue from 'p-queue'
import delay from 'delay'

export class SICPClass {
	socket: TCPHelper | undefined
	regex_mac = new RegExp(/^[0-9a-fA-F]{12}$/)
	subscriptions = new Array<{ id: string; count: number }>()
	private pollTimer: NodeJS.Timeout | undefined
	#testMode = true

	TCPqueue = new pQueue({
		concurrency: 1,
		timeout: 600,
		autoStart: true,
	})

	socketStatus = new socketStatus()

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
		if (!this.pollTimer)
			this.pollTimer = setInterval(() => {
				void this.PollFeedback()
			}, 3000)
	}

	init_tcp(): void {
		this.socket = new TCPHelper(this.#config.host, this.#config.port)
		this.socket._socket.setTimeout(500, () => {
			if (this.socketStatus.InConnection) {
				this.socketStatus.InConnection = false
				this.socket?._socket.removeAllListeners()
				this.socketStatus.Initialized = false
				this.init_tcp()
				this.#self.log('warn', 'Connection timed out! Display did not respond.')
			}
		})

		this.socket.on('status_change', (status, message) => {
			this.socketStatus.StatusCode = status
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

		this.socketStatus.Initialized = this.socket.connect()
	}

	AddSubscription(FeedbackID: string): void {
		const subElement = this.subscriptions.find((element) => element.id == FeedbackID)
		if (!subElement) {
			this.subscriptions.push({ id: FeedbackID, count: 1 })
			this.#self.log('info', 'Added subscription: ' + FeedbackID)
		} else subElement.count++
	}

	RemoveSubscription(FeedbackID: string): void {
		this.#self.log('debug', 'unsubscribe ' + FeedbackID)
		const subElement = this.subscriptions.find((element) => element.id == FeedbackID)
		if (subElement && subElement.count > 1) subElement.count--
		else if (subElement) {
			const index = this.subscriptions.indexOf(subElement)
			if (index > -1) {
				this.subscriptions.splice(index, 1)
			}
			this.#self.log('info', 'Removed subscription: ' + FeedbackID)
		}
	}

	async PollFeedback(): Promise<void> {
		this.subscriptions.forEach((t) => {
			switch (t.id) {
				case FeedbackID.PowerState: {
					this.AddToQueue(sicpcommands.GetPowerStateRequest())
					break
				}
				case FeedbackID.InputSource: {
					this.AddToQueue(sicpcommands.GetInputSourceRequest())
					break
				}
				default:
					break
			}
		})
	}

	process_data(data: Uint8Array): void {
		this.printCommand(data, 'received: ')
		this.socketStatus.InConnection = false
		if (data[3] != 0x00) this.socketStatus.LastRequestSucces = true

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
			case 0x00: {
				if (data[4] == 0x06) this.socketStatus.LastRequestSucces = true
				else this.socketStatus.LastRequestSucces = false
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

	sendTurnOn(): void {
		if (!this.#config.wol) this.AddToQueue(sicpcommands.SetPowerStateRequest(true))
		else {
			const macAdd: string = this.#config.mac.replace(/[:.-]/g, '')
			const options: wol.WakeOptions = {
				port: 9,
				address: this.#config.broadcast,
				num_packets: 5,
				interval: 100,
			}
			if (this.regex_mac.test(macAdd)) {
				wol.wake(macAdd, options)
				this.#self.log('debug', 'mac: ' + macAdd)
			}
			setTimeout(() => {
				this.AddToQueue(sicpcommands.GetPowerStateRequest())
			}, 500)
		}
	}

	AddToQueue(SICPrequest: Uint8Array | undefined): void {
		if (SICPrequest) {
			try {
				void this.TCPqueue.add(async () => {
					const success = await this.sendCommand(SICPrequest)
					if (this.#testMode) {
						this.#self.log('debug', 'IsSend:' + String(success))
					}
				})
			} catch (error) {
				this.#self.log('warn', 'cannot send')
			}
		}
	}

	async sendCommand(SICPrequest: Uint8Array): Promise<boolean> {
		const buffer = Buffer.from(SICPrequest)
		this.socketStatus.LastRequest = SICPrequest
		if (this.#testMode) this.#self.log('debug', 'InConnection: ' + this.socketStatus.InConnection)

		if (!this.socket) this.init_tcp()
		if (this.socket && !this.socket?.isConnected) this.socket.connect()

		for (let i = 0; i < 100; i++) {
			if (!this.socketStatus.InConnection) break
			await delay(10)
		}

		if (this.socket && !this.socketStatus.InConnection) {
			this.socketStatus.InConnection = true
			this.printCommand(SICPrequest, 'send: ')
			return this.socket.send(buffer)
		} else
			return new Promise(() => {
				return false
			})
	}

	printCommand(request: Uint8Array, prefix = ''): void {
		if (this.#testMode) {
			let output = prefix
			request.forEach((n) => {
				output += n.toString(16) + ':'
			})
			this.#self.log('debug', output)
		}
	}

	destroy(): void {
		this.TCPqueue.clear()
		this.socket?.destroy()
	}
}

interface SICPStatus {
	PowerState: boolean
	InputSource?: DropdownChoiceId | undefined
}

class socketStatus {
	Initialized = false
	private _InConnection = false
	StatusCode = 'Not Initialized'
	LastRequest?: Uint8Array | undefined
	LastRequestSucces?: boolean

	ConnectionTimer: NodeJS.Timeout | undefined

	public set InConnection(_state: boolean) {
		if (_state) {
			this.ConnectionTimer = setTimeout(() => {
				this._InConnection = false
			}, 500)
			if (!this._InConnection) this._InConnection = true
		} else {
			this.ConnectionTimer = undefined
			this._InConnection = false
		}
	}

	public get InConnection() {
		return this._InConnection
	}
}
