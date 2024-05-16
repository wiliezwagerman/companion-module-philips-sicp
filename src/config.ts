import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface PhilipsSICPConfig {
	host: string
	port: number
	wol: boolean
	mac: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			regex: Regex.IP,
			required: true,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 5000,
		},
		{
			type: 'checkbox',
			id: 'wol',
			label: 'WoL',
			width: 6,
			default: true,
			tooltip: 'Use this option when you want to use WoL instead of SICP for waking',
		},
		{
			type: 'textinput',
			id: 'mac',
			label: 'MAC address:',
			width: 12,
			default: '',
			regex: '/^([0-9a-f]{2}([:.-]{0,1}|$)){6}$/i',
			isVisible: (options) => {
				return options.wol === true
			},
		},
	]
}
