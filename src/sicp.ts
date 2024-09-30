import { DropdownChoiceId, InstanceStatus, TCPHelper } from '@companion-module/base'
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
	private pollTime = 600
	private reconnectionPoll: NodeJS.Timeout | undefined

	TCPqueue: pQueue | undefined

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
		ToggleNext: false,
	}

	private _groupid = 0x00

	public get groupid(): number {
		if (this._groupid) return this._groupid
		return 0x00
	}

	#self: PhilipsSICPInstance

	constructor(self: PhilipsSICPInstance) {
		this.#config = self.config
		this.#self = self
		if (this.#testMode) this.pollTime = 3000
		this.init_tcp()
		this.init_tcpqueue()
	}

	init_tcpqueue(): void {
		this.TCPqueue = new pQueue({
			concurrency: 1,
			timeout: 600,
			autoStart: true,
		})

		if (!this.pollTimer)
			this.pollTimer = setInterval(() => {
				void this.PollFeedback()
			}, this.pollTime)

		this.TCPqueue?.on('add', () => {
			if (this.TCPqueue && this.TCPqueue?.size > 20) {
				this.TCPqueue?.clear()
				this.#self.log('warn', 'Queue overflowed and was emptied!')
			}
		})
		setTimeout(() => {
			this.AddToQueue(sicpcommands.GetGroupID())
		}, 500)
	}

	init_tcp(): void {
		this.#self.updateStatus(InstanceStatus.Connecting)
		this.socket = new TCPHelper(this.#config.host, this.#config.port)
		this.socket._socket.setTimeout(500, () => {
			if (this.socketStatus.InConnection) {
				this.socketStatus.InConnection = false
				this.socket?._socket.removeAllListeners()
				this.socketStatus.Initialized = false
				this.#self.updateStatus(InstanceStatus.Disconnected)
				this.socket?.destroy()
				this.init_tcp()
				this.#self.log('warn', 'Connection timed out! Display did not respond.')
			}
		})

		this.socket.on('status_change', (status, message) => {
			this.socketStatus.StatusCode = status
			if (message != undefined) this.#self.log('debug', message)
		})

		this.socket.on('error', (err) => {
			this.state.PowerState = false
			this.#self.checkFeedbacks()
			this.processTcpError(err)
		})

		this.socket.on('data', (data) => {
			const dataArray = new Uint8Array(data)
			this.process_data(dataArray)
			this.#self.log('debug', 'State: ' + this.state.PowerState)
		})

		this.socketStatus.Initialized = this.socket.connect()
		if (this.socketStatus.Initialized && this.socket.isConnected) {
			this.stopReconnectionPoll()
			this.#self.updateStatus(InstanceStatus.Ok)
		}
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
				if (this.#testMode) this.#self.log('debug', 'ToggleNext: ' + this.state.ToggleNext)
				if (this.state.ToggleNext) {
					this.state.ToggleNext = false
					if (!this.state.PowerState) {
						this.sendTurnOn()
						break
					} else this.AddToQueue(sicpcommands.SetPowerStateRequest(false, this.groupid))
				}
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
			case 0x5d: {
				if (data[0] == 0x06) this._groupid = data[4]
				break
			}
			default:
		}

		this.#self.checkFeedbacks()
	}

	processTcpError(error: Error): void {
		let tryReconnect = false
		this.TCPqueue?.pause()
		this.TCPqueue = undefined
		if (error.message.match(/(ECONNREFUSED)/i)) {
			tryReconnect = true
			this.#self.updateStatus(InstanceStatus.ConnectionFailure)
			this.#self.log('error', 'Network error: Could not connect to display')
		} else {
			tryReconnect = false
			this.#self.updateStatus(InstanceStatus.UnknownError)
		}

		if (tryReconnect) this.startReconnectionPoll()
		else this.stopReconnectionPoll()
		this.#self.log('debug', 'Network error ' + error)
	}

	updateConfig(config: PhilipsSICPConfig): void {
		this.#self.log('debug', 'Config has changed')
		if (JSON.stringify(config) !== JSON.stringify(this.#config)) {
			this.#config = config
			if (this.#config.host != config.host || this.#config.port != config.port) {
				this.socket?.destroy()
				this.init_tcp()
			}
		}
		setTimeout(() => {
			this.AddToQueue(sicpcommands.GetGroupID())
		}, 500)
	}

	sendTurnOn(): void {
		if (!this.#config.wol) this.AddToQueue(sicpcommands.SetPowerStateRequest(true, this.groupid))
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

	AddToQueue(SICPrequest: Uint8Array | Array<Uint8Array> | undefined): void {
		if (!this.socketStatus.Initialized) return
		if (SICPrequest instanceof Uint8Array) {
			this.SingleToQueue(SICPrequest)
		} else if (SICPrequest instanceof Array) {
			SICPrequest.forEach((instance) => {
				if (instance instanceof Uint8Array) this.SingleToQueue(instance)
			})
		}
	}

	private SingleToQueue(SICPrequest: Uint8Array): void {
		try {
			void this.TCPqueue?.add(async () => {
				const success = await this.sendCommand(SICPrequest)
				if (this.#testMode) {
					this.#self.log('debug', 'IsSend:' + String(success))
				}
			})
		} catch (error) {
			this.#self.log('warn', 'cannot send')
		}
	}

	async sendCommand(SICPrequest: Uint8Array): Promise<boolean> {
		const buffer = Buffer.from(SICPrequest)
		this.socketStatus.LastRequest = SICPrequest
		if (this.#testMode) this.#self.log('debug', 'InConnection: ' + this.socketStatus.InConnection)

		if (!this.socket || this.socket.isDestroyed) return false
		if (this.socket && !this.socket?.isConnected) this.socket.connect()

		for (let i = 0; i < 100; i++) {
			if (!this.socketStatus.InConnection || !this.socketStatus.Initialized) break
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

	//Polls
	startReconnectionPoll(): void {
		this.stopReconnectionPoll()
		this.reconnectionPoll = setInterval(() => {
			this.init_tcp()
			this.init_tcpqueue()
		}, 5000)
	}

	stopReconnectionPoll(): void {
		if (this.reconnectionPoll) {
			clearInterval(this.reconnectionPoll)
			delete this.reconnectionPoll
		}
	}

	destroy(): void {
		this.TCPqueue?.clear()
		this.socket?.destroy()
	}
}

interface SICPStatus {
	PowerState: boolean
	ToggleNext: boolean
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
