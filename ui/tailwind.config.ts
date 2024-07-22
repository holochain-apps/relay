import { join } from 'path';
import type { Config } from 'tailwindcss';
import { skeleton } from '@skeletonlabs/tw-plugin';
import forms from '@tailwindcss/forms';
import { vollaTheme } from './volla-theme'

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			fontSize: {
				xxs: '0.6rem'
			},
			fontFamily: {
				'sans':['NotoSans', 'ui-sans-serif', 'system-ui']
			},
			maxWidth: {
        '1/2': '50%',
				'2/3': '66%'
      }
		}
	},
	plugins: [
		forms,
		skeleton({
			themes: {
				preset: [
					{
						name: 'skeleton',
						enhancements: true
					}
				],
				custom: [
					vollaTheme
				]
			}
		})
	]
} satisfies Config;
