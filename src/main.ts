import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type PhilipsSICPConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { SICPClass } from './sicp.js'

export class PhilipsSICPInstance extends InstanceBase<PhilipsSICPConfig> {
	config!: PhilipsSICPConfig // Setup in init()
	SICP!: SICPClass

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: PhilipsSICPConfig): Promise<void> {
		this.config = config
		this.SICP = new SICPClass(this)
		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		this.SICP.destroy()
	}

	async configUpdated(config: PhilipsSICPConfig): Promise<void> {
		this.config = config
		this.SICP.updateConfig(config)
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(PhilipsSICPInstance, UpgradeScripts)
