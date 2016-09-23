# DYMAJO Transit
This is an Auckland Transport app. At the moment, it only supports real time board. Route Search, Journey Planner and more are planned for the future.

## Development

### Prereqs
- Sign up for an account at <https://dev-portal.at.govt.nz>
- Set the system enviromental variable atApiKey to your API key
- Get a Google Maps Static API Key
- Set the system enviromental variable mapsApiKey to your API key
- You'll also need Azure Table Storage - install the emulator, or use a testing server. There's instructions in the Azure documentation on how to set credentials.

### To Install
- `npm install` to install deps
- `npm run install-typings` to install typings for typescript

### To Run
- `npm run build-js` to build js
- `npm run build-css` to build css
- `node app` to run webserver on `localhost:8000`

### To Develop
- `npm run watch-js` to watch and recompile js
- `npm run watch-css` to watch and recompile css
- Feel free to send us a pull request and report issues!