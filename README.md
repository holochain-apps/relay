# Volla Messages

Private chat for Android and Desktop environments.

Built with Holochain + Tauri + SvelteKit + TailWind + Skeleton

## Developer Notes

Volla Messages is a Holochain application deployed using [p2pShipyard](https://darksoil.studio/p2p-shipyard/) for Mobile and Desktop.  

### Dev Testing Desktop only

`nix develop`
`npm install`
`npm run start`

### Building and Testing on Android

#### Desktop and Android

`nix develop .#androidDev`
`npm install`
`npm run network:android`

#### As an APK

`nix develop .#androidDev`
`npm install`
`npm run tauri android build`
`adb -s device install /path/to/relay.apk`


## License

[Volla Licence 1.0](https://github.com/holochain-apps/volla-messages/blob/main/LICENSE.txt)

Copyright (C) 2023, Holochain Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (Volla License 1.0). This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
