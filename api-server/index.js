const storage = require('@google-cloud/storage')();
const firebase = require('firebase');
var config = null;

// APIs:
// command: deletePublishedProject, projectId: <projectId>, token: <userToken>
// NA: command: deletePublishedProjectFiles, projectId: <projectId>, token: <userToken> -- delete contents of an already published project before overwriting
// NA: get temp upload url to <userName>/<safeProjectTitle>/

exports.api = function (request, response) {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'content-type');

	if (request.method == 'OPTIONS') {
		response.sendStatus(200);
		return;
	}

	configure().then(function () {
		return verifyToken(request.body.token);

	}).then(function (userId) {
		return executeCommand(request.body, userId);

	}).then(function (status) {
		response.sendStatus(status);
		response.end();

	}, function (err) {
		response.sendStatus(500);
		response.end();
	});
}

function configure() {
	if (config)
		return Promise.resolve(true);

	console.log('downloading api-config.json');
	// NOTE: Documentation lies. download requires a callback and does NOT return a promise.
	// https://googlecloudplatform.github.io/google-cloud-node/#/docs/storage/0.4.0/storage/file
	return new Promise(function (resolve, reject) {
		storage.bucket('de-io-3a257.appspot.com').file('api-config.json').download(function (err, data) {
			if (err) {
				console.log('api-config.json download err: ' + err);
				reject(err);
				return;
			}
			config = JSON.parse(data);
			console.log('config loaded');

			var firebaseConfig = {
				serviceAccount: config,
				databaseURL: 'https://de-io-3a257.firebaseio.com'
			};
			firebase.initializeApp(firebaseConfig);
			resolve(data);
		});
	});
}

function verifyToken(token) {
	return firebase.auth().verifyIdToken(token).then(function (decodedToken) {
		var uid = decodedToken.uid;
		return uid;
	}).catch(function (error) {
		console.log('verifyIdToken err: ' + JSON.stringify(error));
	});
}

function executeCommand(command, userId) {
	switch (command.command) {
		case 'publishProject':
			return publishProject(command.projectId, userId);

		case 'deletePublishedProject':
			return deletePublishedProject(command.projectId, userId);

		default:
			console.log('unknown command: ' + command.command);
			return Promise.reject(501);
	}
}

function publishProject(projectId, userId) {
	// Gather and preprocess all the files to be published. (i.e. build)
	// Delete existing published files (if any) on GCS (3de-pub bucket).
	// Write the built files to GCS (3de-pub bucket).
	// Add/update an entry in the 'published-project' database.
	// Update the project's entry in the 'projects' database to indicate its published state.
}

function deletePublishedProject(projectId, userId) {
	var publishedRef = firebase.database().ref('published-projects/' + projectId);
	return publishedRef.once('value').then(function (snapshot) {
		var project = snapshot.val();
		if (project == null)
			return 200; // TODO: project not found (already deleted?)
		if (project.owner != userId) {
			throw new Error('Only the project owner can delete it');
		}
		console.log(JSON.stringify(project));

		/* If we want to scope firebase calls to the user.
		var firebaseConfig = {
			serviceAccount: config,
			databaseURL: 'https://de-io-3a257.firebaseio.com',
			databaseAuthVariableOverride: {
    			uid: userId
			}
		};
		firebase.initializeApp(firebaseConfig, 'asUser' + userId);
		*/

		// Delete all the published project files.
		// TODO: can't rely on client defined project.path
		// More documentation lies WRT to returning a promise.
		return new Promise(function (resolve, reject) {
			storage.bucket('3de-pub').deleteFiles({ prefix: project.path + '/' }, function (err) {
				if (err) {
					console.log('deletePublishedProject deleteFiles err: ' + err);
					reject(err);
					return;
				}

				// Delete the published-projects record.
				return publishedRef.remove().then(function () {
					resolve(200);
				});
			});
		});
	});
}
