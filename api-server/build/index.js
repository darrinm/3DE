"use strict";
const admin = require('firebase-admin');
// TODO: consider request-promise
const request = require('request');
const requestp = require('request-promise-native');
const storage = require('@google-cloud/storage')();
var config = null;
var db;
var auth;
const publishBucketName = '3de-pub';
// APIs (commands):
// publishProject, projectId: <projectId>, token: <userToken>
// deletePublishedProject, projectId: <projectId>, token: <userToken>
// TODO: deletePublishedProjectFiles, projectId: <projectId>, token: <userToken> -- delete contents of an already published project before overwriting
exports.api = function (request, response) {
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
        .then((userId) => executeCommand(request.body, userId))
        .then((result) => {
        if (result)
            response.send(result);
        else
            response.sendStatus(200);
        response.end();
    }, (err) => {
        response.sendStatus(500);
        response.end();
    });
};
function configure() {
    if (config)
        return Promise.resolve(true);
    console.log('downloading api-config.json');
    return storage.bucket('de-io-3a257.appspot.com').file('api-config.json').download()
        .then((data) => {
        config = JSON.parse(data);
        console.log('config loaded');
        admin.initializeApp({
            credential: admin.credential.cert(config),
            //			credential: admin.credential.applicationDefault(),
            databaseURL: 'https://de-io-3a257.firebaseio.com'
        });
        auth = admin.auth();
        db = admin.database();
    });
}
function verifyToken(token) {
    return auth.verifyIdToken(token).then((decodedToken) => decodedToken.uid)
        .catch((error) => console.log('verifyIdToken err: ' + JSON.stringify(error)));
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
function deletePublishedProject(projectId, userId) {
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
            .then(() => publishedRef.remove());
    }); // not firebase.Promise<any>
}
function publishProject(projectId, userId) {
    console.log('publishProject ' + projectId);
    return getProjectInfo(projectId, userId).then((projectInfo) => {
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
function getProjectInfo(projectId, userId) {
    var projectRef = db.ref('projects/' + userId + '/' + projectId);
    return projectRef.once('value')
        .then((snapshot) => snapshot.val()); // not firebase.Promise<any>
}
// TODO: vr
// TODO: metadata? e.g. contentType
// TODO: makePublic?
var vr = true;
// Are we running on the production server or testing/developing locally?
function isProduction() {
    return process.env.NODE_ENV === 'production';
}
const mimeTypes = {
    html: 'text/html',
    json: 'application/json',
    js: 'text/javascript',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg'
};
let options = {
    predefinedAcl: 'publicRead',
    metadata: {
        contentType: '', cacheControl: 'private, max-age=0, no-transform'
    }
};
function getContentType(name) {
    return mimeTypes[name.split('.').pop().toLowerCase()] || 'text/plain';
}
function setContentType(name) {
    options.metadata.contentType = getContentType(name);
}
function publishProjectFiles(projectId, publishName, userId, title) {
    var publishPrefix = 'gs://' + publishBucketName + '/' + publishName + '/';
    var sourcePrefix = 'user/' + userId + '/' + projectId + '/';
    var bucket = storage.bucket('de-io-3a257.appspot.com');
    var pubBucket = storage.bucket(publishBucketName);
    function setMetadata(file) {
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
        .then((data) => setMetadata(data[0]))
        .then((data) => bucket.file(sourcePrefix + 'thumbnail.jpg').copy(publishPrefix + 'thumbnail.jpg'))
        .then((data) => setMetadata(data[0]))
        .then((data) => {
        return requestp(origin + '/js/libs/app/index.html').then((html) => {
            var includes = [];
            if (vr) {
                includes.push('<script src="js/VRControls.js"></script>');
                includes.push('<script src="js/VREffect.js"></script>');
                includes.push('<script src="js/WebVR.js"></script>');
            }
            html = html.replace('<!-- includes -->', includes.join('\n\t\t'));
            // As per http://stackoverflow.com/questions/784586/convert-special-characters-to-html-in-javascript
            // TODO: Node-ify
            function htmlEncode(s) {
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
        .then((html) => {
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
    function copy(src, dst) {
        const dstFile = pubBucket.file(publishName + '/' + dst);
        return new Promise((resolve, reject) => {
            setContentType(dst);
            request(origin + '/' + src).pipe(dstFile.createWriteStream(options))
                .on('finish', () => {
                return resolve(true);
            })
                .on('error', (err) => {
                return reject(err);
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsTUFBWSxLQUFLLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUN4QyxpQ0FBaUM7QUFDakMsTUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDbkMsTUFBWSxRQUFRLFdBQU0sd0JBQXdCLENBQUMsQ0FBQTtBQWFuRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO0FBRW5ELElBQUksTUFBTSxHQUFPLElBQUksQ0FBQztBQUN0QixJQUFJLEVBQThCLENBQUM7QUFDbkMsSUFBSSxJQUF3QixDQUFDO0FBQzdCLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDO0FBRXBDLG1CQUFtQjtBQUNuQiw2REFBNkQ7QUFDN0QscUVBQXFFO0FBQ3JFLHNKQUFzSjtBQUV0SixPQUFPLENBQUMsR0FBRyxHQUFHLFVBQVUsT0FBZ0IsRUFBRSxRQUFrQjtJQUMzRCxRQUFRLENBQUMsU0FBUyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZELFFBQVEsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUN6RSxRQUFRLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBRW5FLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNqQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sQ0FBQztJQUNSLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0IsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FB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