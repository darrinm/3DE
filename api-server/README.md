## [Try it now.](https://darrinm.github.io/3DE)

## Install
npm install

## Build
< nothing >

## Deploy
```bash
# From project root
bin/deploy-api-server
```

## Test
```bash
gcloud auth application-default login
cd api-server
node host.js
http --verbose POST :8081/api <command.json # needs a current user token

# For running/debugging under Visual Studio Code see launch.json

#npm install -g @google-cloud/functions-emulator
#functions start
#functions deploy api-server api --trigger-http
# http://localhost:8008/api
```
