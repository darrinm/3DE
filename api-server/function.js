var https = require('https');
var storage = require('@google-cloud/storage')();
var firebase = require('firebase');



exports.api = function (request, response) {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

	if (request.method == 'OPTIONS') {
		response.send(200);
		return;
	}

	storage.bucket('de-io-3a257.appspot.com').file('api-config.json').download(function (err, data) {
		if (err) {
//		console.log('configFile.download: err: ' + JSON.stringify(err) + '\ndata: ' + data);
			console.log('config.json download err: ' + err);
			response.sendStatus(500);
			return;
		}

		var config = JSON.parse(data);
//		console.log('config: ' + JSON.stringify(config));

		var firebaseConfig = {
			serviceAccount: {
				projectId: config.projectId,
				clientEmail: config.clientEmail,
				privateKey: config.privateKey
			},
			databaseURL: 'https://de-io-3a257.firebaseio.com'
		};
		firebase.initializeApp(firebaseConfig);

		var idToken = request.query.token;
		firebase.auth().verifyIdToken(idToken).then(function (decodedToken) {
			var uid = decodedToken.uid;
			console.log('decodedToken: ' + uid);


		}).catch(function (error) {
			console.log('verifyIdToken err: ' + JSON.stringify(err));
		});
	});
}
