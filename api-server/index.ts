import * as firebase from 'firebase'; // Because firebase-admin is not fully typed!
import * as admin from 'firebase-admin';
// TODO: consider request-promise
import * as request from 'request';
import * as requestp from 'request-promise-native';
import { Request, Response } from 'express';

interface ProjectInfo {
	owner: string;
	ownerName: string;
	title: string;
	description: string;
	thumbnail: string;
	created: string; // Date.toJSON
	modified: string; // Date.toJSON
}

const storage = require('@google-cloud/storage')();

var config: {} = null;
var db: firebase.database.Database;
var auth: firebase.auth.Auth;
const publishBucketName = '3de-pub';

// APIs (commands):
// publishProject, projectId: <projectId>, token: <userToken>
// deletePublishedProject, projectId: <projectId>, token: <userToken>
// TODO: deletePublishedProjectFiles, projectId: <projectId>, token: <userToken> -- delete contents of an already published project before overwriting

exports.api = function (request: Request, response: Response) {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'content-type');

	if (request.method == 'OPTIONS') {
		response.sendStatus(200);
		return;
	}

	if (request.method == 'GET') {
		response.send(JSON.stringify(isProduction()));
		return;
	}

	configure().then(() => verifyToken(request.body.token))
	.then((userId: string) => executeCommand(request.body, userId))
	.then((result: string) => {
		if (result)
			response.send(result);
		else
			response.sendStatus(200);
		response.end();

	}, (err: string) => {
		response.sendStatus(500);
		response.end();
	});
}

function configure() {
	if (config)
		return Promise.resolve(true);

	console.log('downloading api-config.json');
	return storage.bucket('de-io-3a257.appspot.com').file('api-config.json').download()
	.then((data: string) => {
		config = JSON.parse(data);
		console.log('config loaded');

		admin.initializeApp({
			credential: admin.credential.cert(config),
//			credential: admin.credential.applicationDefault(),
			databaseURL: 'https://de-io-3a257.firebaseio.com'
		});
		auth = admin.auth() as any as firebase.auth.Auth;
		db = admin.database() as any as firebase.database.Database;
	});
}

function verifyToken(token: string) {
	return auth.verifyIdToken(token).then((decodedToken) => decodedToken.uid)
	.catch((error) => console.log('verifyIdToken err: ' + JSON.stringify(error)));
}

function executeCommand(command: { command: string, projectId: string }, userId: string): Promise<any> {
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

function deletePublishedProject(projectId: string, userId: string): Promise<any> {
	console.log('deletePublishedProject ' + projectId);

	var publishedRef = db.ref('published-projects/' + projectId);
	return publishedRef.once('value').then((snapshot) => {
		var project = snapshot.val();
		if (project == null)
			return 200; // TODO: project not found (already deleted?)
		if (project.owner != userId) {
			throw new Error('Only the project owner can delete it');
		}
		console.log(JSON.stringify(project));

		// Delete all the published project files.
		// TODO: can't rely on client defined project.path
		return storage.bucket(publishBucketName).deleteFiles({ prefix: project.path + '/' })

		// Delete the published-projects record.
		.then(() =>	publishedRef.remove());
	}) as Promise<any>; // not firebase.Promise<any>
}

function publishProject(projectId: string, userId: string): Promise<any> {
	console.log('publishProject ' + projectId);

	return getProjectInfo(projectId, userId).then((projectInfo: ProjectInfo) => {
		// Remove characters that aren't URL friendly.
		var title = projectInfo.title;
		var safeTitle = title.replace(/[ %\/\?\:\&\=\+\$\#\,\@\;]/g, '');

		var userName = projectInfo.ownerName;
		var publishName = userName + '/' + safeTitle;
		var publishPath = publishBucketName + '/' + publishName;

		// TODO: Delete existing published files (if any) on GCS (3de-pub bucket).

		// Gather and preprocess all the files to be published. (i.e. build)
		// Write the built files to GCS (3de-pub bucket).
		return publishProjectFiles(projectId, publishName, userId, title).then(() => {
			// Add/update an entry in the 'published-project' database.
			// Update the project's entry in the 'projects' database to indicate its published state.

			var playURL = 'https://storage.googleapis.com/' + publishPath + '/index.html';
			var thumbnailURL = 'https://storage.googleapis.com/' + publishPath + '/thumbnail.jpg';

			// Add to published project database.

			var publishedRef = db.ref('published-projects/' + projectId);
			publishedRef.set({
				owner: userId,
				ownerName: userName,
				title: title,
				description: '<na>',
				path: publishName,
				play: playURL,
				thumbnail: thumbnailURL,
				publishedOn: (new Date).toJSON(),
				vr: vr ? true : false
			});
			return playURL;
		});
	});
}

// Get project owner, ownerName, title, description, thumbnail, created, modified
function getProjectInfo(projectId: string, userId: string): Promise<any> {
	var projectRef = db.ref('projects/' + userId + '/' + projectId);
	return projectRef.once('value')
	.then((snapshot) => snapshot.val()) as Promise<any>; // not firebase.Promise<any>
}

// TODO: vr
// TODO: metadata? e.g. contentType
// TODO: makePublic?
var vr = true;

// Are we running on the production server or testing/developing locally?
function isProduction(): boolean {
	return process.env.NODE_ENV === 'production';
}

const mimeTypes: { [index: string]: string } = {
	html: 'text/html',
	json: 'application/json',
	js: 'text/javascript',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg'
}

let options = {
	predefinedAcl: 'publicRead',
	metadata: {
		contentType: '', cacheControl: 'private, max-age=0, no-transform'
	}
}

function getContentType(name: string): string {
	return mimeTypes[name.split( '.' ).pop().toLowerCase()] || 'text/plain';
}

function setContentType(name: string) {
	options.metadata.contentType = getContentType(name);
}

function publishProjectFiles(projectId: string, publishName: string, userId: string, title: string) {

	var publishPrefix = 'gs://' + publishBucketName + '/' + publishName + '/';
	var sourcePrefix = 'user/' + userId + '/' + projectId + '/';
	var bucket = storage.bucket('de-io-3a257.appspot.com');
	var pubBucket = storage.bucket(publishBucketName);

	function setMetadata(file: any): Promise<any> {
		setContentType(file.name);
		return file.makePublic().then(() => file.setMetadata(options.metadata));
	}

	// When debugging locally copy the template files from the local web server.
	// When operating as the public cloud function copy the template files from the public web server.
	var origin = isProduction() ? 'https://darrinm.github.io/3DE' : 'http://localhost:8080';

	// Copy project.json -> app.json
	// TODO: read and parse the project so, e.g. vr variable can be determined.
	// Alternatively, write desired variables to the project table.
	return bucket.file(sourcePrefix + 'project.json').copy(publishPrefix + 'app.json')
	.then((data: any[]) => setMetadata(data[0]))
	// var newFile = data[0];
	// var apiResponse = data[1];
	.then((data: any[]) => bucket.file(sourcePrefix + 'thumbnail.jpg').copy(publishPrefix + 'thumbnail.jpg'))
	.then((data: any[]) => setMetadata(data[0]))

	// Use app/index.html as a template, injecting the project title and appropriate script includes.
	.then((data: any[]) => {
		return requestp(origin + '/js/libs/app/index.html').then((html: string) => {
			var includes: string[] = [];

			if (vr) {
				includes.push('<script src="js/VRControls.js"></script>');
				includes.push('<script src="js/VREffect.js"></script>');
				includes.push('<script src="js/WebVR.js"></script>');
			}

			html = html.replace('<!-- includes -->', includes.join('\n\t\t'));

			// As per http://stackoverflow.com/questions/784586/convert-special-characters-to-html-in-javascript
			// TODO: Node-ify
			function htmlEncode(s: string) {
				/* TODO:
				var el = document.createElement('div');
				el.innerText = el.textContent = s;
				s = el.innerHTML;
				*/
				return s;
			}

			return html.replace('<title>three.js</title>', '<title>' + htmlEncode(title) + '</title>');
		});
	})
	.then((html: string) => {
		setContentType('index.html');
		return pubBucket.file(publishName + '/index.html').save(html, options);
	})
	.then(() => copy('js/libs/app.js', 'js/app.js'))
	.then(() => copy('three.min.js', 'js/three.min.js'))
	.then(() => {
		if (vr) {
			return copy('deps/VRControls.js', 'js/VRControls.js')
			.then(() => copy('deps/VREffect.js', 'js/VREffect.js'))
			.then(() => copy('deps/WebVR.js', 'js/WebVR.js'));
		}
		return Promise.resolve(true);
	});

	function copy(src: string, dst: string): Promise<any> {
		const dstFile = pubBucket.file(publishName + '/' + dst);
		return new Promise((resolve, reject) => {
			setContentType(dst);
			request(origin + '/' + src).pipe(dstFile.createWriteStream(options))
			.on('finish', () => {
				return resolve(true)
			})
			.on('error', (err: any) => {
				return reject(err)
			});
		});
	}
}
