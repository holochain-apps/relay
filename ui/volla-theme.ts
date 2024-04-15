import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

// Generated using https://www.skeleton.dev/docs/generator

export const vollaTheme: CustomThemeConfig = {
    name: 'volla-theme',
    properties: {
		// =~= Theme Properties =~=
		"--theme-font-family-base": `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
		"--theme-font-family-heading": `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
		"--theme-font-color-base": "0 0 0",
		"--theme-font-color-dark": "255 255 255",
		"--theme-rounded-base": "9999px",
		"--theme-rounded-container": "8px",
		"--theme-border-base": "1px",
		// =~= Theme On-X Colors =~=
		"--on-primary": "0 0 0",
		"--on-secondary": "var(--color-primary-500)",
		"--on-tertiary": "var(--color-tertiary-100)",
		"--on-success": "0 0 0",
		"--on-warning": "0 0 0",
		"--on-error": "255 255 255",
		"--on-surface": "255 255 255",
		// =~= Theme Colors  =~=
		// primary | #FD3524
		"--color-primary-50": "255 225 222", // #ffe1de
		"--color-primary-100": "255 215 211", // #ffd7d3
		"--color-primary-200": "255 205 200", // #ffcdc8
		"--color-primary-300": "254 174 167", // #feaea7
		"--color-primary-400": "254 114 102", // #fe7266
		"--color-primary-500": "253 53 36", // #FD3524
		"--color-primary-600": "228 48 32", // #e43020
		"--color-primary-700": "190 40 27", // #be281b
		"--color-primary-800": "152 32 22", // #982016
		"--color-primary-900": "124 26 18", // #7c1a12
		// secondary | #ffffff
		"--color-secondary-50": "255 255 255", // #ffffff
		"--color-secondary-100": "255 255 255", // #ffffff
		"--color-secondary-200": "255 255 255", // #ffffff
		"--color-secondary-300": "255 255 255", // #ffffff
		"--color-secondary-400": "255 255 255", // #ffffff
		"--color-secondary-500": "255 255 255", // #ffffff
		"--color-secondary-600": "230 230 230", // #e6e6e6
		"--color-secondary-700": "191 191 191", // #bfbfbf
		"--color-secondary-800": "153 153 153", // #999999
		"--color-secondary-900": "125 125 125", // #7d7d7d
		// tertiary | #000000
		"--color-tertiary-50": "217 217 217", // #d9d9d9
		"--color-tertiary-100": "204 204 204", // #cccccc
		"--color-tertiary-200": "191 191 191", // #bfbfbf
		"--color-tertiary-300": "153 153 153", // #999999
		"--color-tertiary-400": "77 77 77", // #4d4d4d
		"--color-tertiary-500": "0 0 0", // #000000
		"--color-tertiary-600": "0 0 0", // #000000
		"--color-tertiary-700": "0 0 0", // #000000
		"--color-tertiary-800": "0 0 0", // #000000
		"--color-tertiary-900": "0 0 0", // #000000
		// success | #669c35
		"--color-success-50": "232 240 225", // #e8f0e1
		"--color-success-100": "224 235 215", // #e0ebd7
		"--color-success-200": "217 230 205", // #d9e6cd
		"--color-success-300": "194 215 174", // #c2d7ae
		"--color-success-400": "148 186 114", // #94ba72
		"--color-success-500": "102 156 53", // #669c35
		"--color-success-600": "92 140 48", // #5c8c30
		"--color-success-700": "77 117 40", // #4d7528
		"--color-success-800": "61 94 32", // #3d5e20
		"--color-success-900": "50 76 26", // #324c1a
		// warning | #EAB308
		"--color-warning-50": "252 244 218", // #fcf4da
		"--color-warning-100": "251 240 206", // #fbf0ce
		"--color-warning-200": "250 236 193", // #faecc1
		"--color-warning-300": "247 225 156", // #f7e19c
		"--color-warning-400": "240 202 82", // #f0ca52
		"--color-warning-500": "234 179 8", // #EAB308
		"--color-warning-600": "211 161 7", // #d3a107
		"--color-warning-700": "176 134 6", // #b08606
		"--color-warning-800": "140 107 5", // #8c6b05
		"--color-warning-900": "115 88 4", // #735804
		// error | #fd3524
		"--color-error-50": "255 225 222", // #ffe1de
		"--color-error-100": "255 215 211", // #ffd7d3
		"--color-error-200": "255 205 200", // #ffcdc8
		"--color-error-300": "254 174 167", // #feaea7
		"--color-error-400": "254 114 102", // #fe7266
		"--color-error-500": "253 53 36", // #fd3524
		"--color-error-600": "228 48 32", // #e43020
		"--color-error-700": "190 40 27", // #be281b
		"--color-error-800": "152 32 22", // #982016
		"--color-error-900": "124 26 18", // #7c1a12
		// surface | #000000
		"--color-surface-50": "217 217 217", // #d9d9d9
		"--color-surface-100": "204 204 204", // #cccccc
		"--color-surface-200": "191 191 191", // #bfbfbf
		"--color-surface-300": "153 153 153", // #999999
		"--color-surface-400": "77 77 77", // #4d4d4d
		"--color-surface-500": "0 0 0", // #000000
		"--color-surface-600": "0 0 0", // #000000
		"--color-surface-700": "0 0 0", // #000000
		"--color-surface-800": "0 0 0", // #000000
		"--color-surface-900": "0 0 0", // #000000

	}
}