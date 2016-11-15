var google = require('googleapis');
var express = require('express');
var bodyParser = require('body-parser');
var func = require('./index');

var app = express();

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.use(bodyParser.json());

// This method looks for the GCLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS
// environment variables.
google.auth.getApplicationDefault(function (err, authClient, projectId) {
	if (err) {
		throw err;
	}

	// The createScopedRequired method returns true when running on GAE or a local developer
	// machine. In that case, the desired scopes must be passed in manually. When the code is
	// running in GCE or a Managed VM, the scopes are pulled from the GCE metadata server.
	// See https://cloud.google.com/compute/docs/authentication for more information.
	if (authClient.createScopedRequired && authClient.createScopedRequired()) {
		// Scopes can be specified either as an array or as a single, space-delimited string.
		authClient = authClient.createScoped([
			'https://www.googleapis.com/auth/cloud-platform',
			'https://www.googleapis.com/auth/devstorage.read_write'
		]);
	}

	app.post('/api', func.api);
	app.get('/api', func.api);
	app.listen(8081, function () { });
});
