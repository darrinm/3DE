var https = require('https');
var storage = require('@google-cloud/storage')();
var firebase = require('firebase');
var config = null;

exports.api = function (request, response) {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

	if (request.method == 'OPTIONS') {
		response.send(200);
		return;
	}

	function handleRequest() {
		console.log('request.body: ' + JSON.stringify(request.body));
		var idToken = request.body.token;
		firebase.auth().verifyIdToken(idToken).then(function (decodedToken) {
			var uid = decodedToken.uid;
			console.log('uid: ' + uid);
			response.sendStatus(200);

		}).catch(function (error) {
			console.log('verifyIdToken err: ' + JSON.stringify(err));
			response.sendStatus(500);
		});
	}

	if (config) {
		handleRequest();
	} else {
		storage.bucket('de-io-3a257.appspot.com').file('api-config.json').download(function (err, data) {
			if (err) {
	//		console.log('configFile.download: err: ' + JSON.stringify(err) + '\ndata: ' + data);
				console.log('config.json download err: ' + err);
				response.sendStatus(500);
				return;
			}

			config = JSON.parse(data);
	//		console.log('config: ' + JSON.stringify(config));

			var firebaseConfig = {
				serviceAccount: config,
				databaseURL: 'https://de-io-3a257.firebaseio.com'
			};
			firebase.initializeApp(firebaseConfig);

			handleRequest();
		});
	}
}
