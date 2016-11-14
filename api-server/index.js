const storage = require('@google-cloud/storage')();
const firebase = require('firebase');
const request = require('request');

var config = null;

// APIs:
// command: deletePublishedProject, projectId: <projectId>, token: <userToken>
// TODO: command: deletePublishedProjectFiles, projectId: <projectId>, token: <userToken> -- delete contents of an already published project before overwriting
// TODO: get temp upload url to <userName>/<safeProjectTitle>/

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

// Get project owner, ownerName, title, description, thumbnail, created, modified
function getProjectInfo(projectId, userId) {
	var projectRef = firebase.database().ref('projects/' + userId + '/' + projectId);
	return projectRef.once('value').then(function (snapshot) {
		var projectInfo = snapshot.val();
		return projectInfo;
	});
}

// TODO: userName
// TODO: safeTitle
// TODO: runningOnLocalhost
// TODO: vr
// TODO: metadata? e.g. contentType
// TODO: makePublic?
function publishProjectFiles(projectId, userId, userName) {
	var publishPath = userName + '/' + safeTitle;
	var publishPrefix = 'gs://3de-pub/' + publishPath + '/';
	var sourcePrefix = 'user/' + userId + '/' + projectId + '/';
	var bucket = storage.bucket('de-io-3a257.appspot.com');
	var pubBucket = storage.bucket('3de-pub');
	var origin = runningOnLocalhost ? 'http://localhost:8080' : 'https://darrinm.github.io/3DE';

	// Copy project.json -> app.json
	// TODO: read and parse the project so, e.g. vr variable can be determined.
	// Alternatively, write desired variables to the project table.
	return bucket.file(sourcePrefix + 'project.json').copy(publishPrefix + 'app.json')

	.then(function (data) {
		// var newFile = data[0];
		// var apiResponse = data[1];
		return bucket.file(sourcePrefix + 'thumbnail.jpg').copy(publishPrefix + '/thumbnail.jpg');

	// Use app/index.html as a template, injecting the project title and appropriate script includes.
	}).then(function (data) {
		return new Promise(function (resolve, reject) {
			request('js/libs/app/index.html', function (error, response, content) {
				if (error) {
					return reject(error);
				}

				var includes = [];

				if (vr) {
					includes.push('<script src="js/VRControls.js"></script>');
					includes.push('<script src="js/VREffect.js"></script>');
					includes.push('<script src="js/WebVR.js"></script>');
				}

				content = content.replace('<!-- includes -->', includes.join('\n\t\t'));

				// As per http://stackoverflow.com/questions/784586/convert-special-characters-to-html-in-javascript
				// TODO: Node-ify
				function htmlEncode(s) {
					var el = document.createElement('div');
					el.innerText = el.textContent = s;
					s = el.innerHTML;
					return s;
				}

				content = content.replace('<title>three.js</title>', '<title>' + htmlEncode(project.title) + '</title>');
				return resolve(content);
			});
		});
	}).then(function (content) {
		return pubBucket.file(publishPath + '/index.html').createWriteStream().write(content); // TODO: end? and, not a promise
	}).then(function (data) {
		return copy('js/libs/app.js', 'js/app.js');
	}).then(function (data) {
		return copy('three.min.js', 'js/three.min.js');
	}).then(function (data) {
		if (vr) {
			return copy('deps/VRControls.js', 'js/VRControls.js')
			.then(function (data) {
				return copy('deps/VREffect.js', 'js/VREffect.js');
			}).then(function (data) {
				return copy('deps/WebVR.js', 'js/WebVR.js');
			});
		}
	});

	function copy(src, dst) {
		return request(origin + '/' + src).pipe(pubBucket.file(publishPath + '/' + dst).createWriteStream());
	}
}

function publishFile(src, dstURL) {

}

function copyFile(srcURL, dstURL) {

}


/*
function getContent(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
    })
}
*/