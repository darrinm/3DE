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
        // TODO: can't trust client defined project.path
        return storage.bucket(publishBucketName).deleteFiles({ prefix: project.path + '/' })
            .then(() => publishedRef.remove());
    }); // not firebase.Promise<any>
}
// TODO: vr
var vr = true;
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
    var privBucket = storage.bucket('de-io-3a257.appspot.com');
    var pubBucket = storage.bucket(publishBucketName);
    function setMetadata(file) {
        setContentType(file.name);
        return file.makePublic().then(() => file.setMetadata(options.metadata));
    }
    function copy(src, dst) {
        const dstFile = pubBucket.file(publishName + '/' + dst);
        return new Promise((resolve, reject) => {
            setContentType(dst);
            request(origin + '/' + src).pipe(dstFile.createWriteStream(options))
                .on('finish', () => resolve(true))
                .on('error', (err) => reject(err));
        });
    }
    // When debugging locally copy the template files from the local web server.
    // When operating as the public cloud function copy the template files from the public web server.
    var origin = isProduction() ? 'https://darrinm.github.io/3DE' : 'http://localhost:8080';
    // Run lots of slow async operations in parallel!
    let promises = [];
    // Copy project.json -> app.json
    // TODO: read and parse the project so, e.g. vr variable can be determined.
    // Alternatively, write desired variables to the project table.
    promises.push(privBucket.file(sourcePrefix + 'project.json').copy(publishPrefix + 'app.json')
        .then((data) => setMetadata(data[0])));
    // var newFile = data[0];
    // var apiResponse = data[1];
    promises.push(privBucket.file(sourcePrefix + 'thumbnail.jpg').copy(publishPrefix + 'thumbnail.jpg')
        .then((data) => setMetadata(data[0])));
    // Use app/index.html as a template, injecting the project title and appropriate script includes.
    promises.push(requestp(origin + '/js/libs/app/index.html').then((html) => {
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
    }).then((html) => {
        setContentType('index.html');
        return pubBucket.file(publishName + '/index.html').save(html, options);
    }));
    promises.push(copy('js/libs/app.js', 'js/app.js'));
    promises.push(copy('three.min.js', 'js/three.min.js'));
    if (vr) {
        promises.push(copy('deps/VRControls.js', 'js/VRControls.js'));
        promises.push(copy('deps/VREffect.js', 'js/VREffect.js'));
        promises.push(copy('deps/WebVR.js', 'js/WebVR.js'));
    }
    return Promise.all(promises);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsTUFBWSxLQUFLLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUN4QyxpQ0FBaUM7QUFDakMsTUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDbkMsTUFBWSxRQUFRLFdBQU0sd0JBQXdCLENBQUMsQ0FBQTtBQWFuRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO0FBRW5ELElBQUksTUFBTSxHQUFPLElBQUksQ0FBQztBQUN0QixJQUFJLEVBQThCLENBQUM7QUFDbkMsSUFBSSxJQUF3QixDQUFDO0FBQzdCLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDO0FBRXBDLG1CQUFtQjtBQUNuQiw2REFBNkQ7QUFDN0QscUVBQXFFO0FBQ3JFLHNKQUFzSjtBQUV0SixPQUFPLENBQUMsR0FBRyxHQUFHLFVBQVUsT0FBZ0IsRUFBRSxRQUFrQjtJQUMzRCxRQUFRLENBQUMsU0FBUyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZELFFBQVEsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUN6RSxRQUFRLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBRW5FLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNqQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sQ0FBQztJQUNSLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0IsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FB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