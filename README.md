## [Try it now.](https://darrinm.github.io/3DE)

## Install
< nothing >

## Build
< nothing >

## Run
```bash
cd src
live-server
```

## Deploy
```bash
# From project root
bin/deploy
```

## Test
```bash
gcloud auth application-default login
cd api-server
node host.js
http --verbose POST :8081/api token=whatever

or with Visual Studio Code
launchctl setenv GCLOUD_PROJECT de-io-3a257

#npm install -g @google-cloud/functions-emulator
#functions start
#functions deploy api-server api --trigger-http
# http://localhost:8008/api
```
