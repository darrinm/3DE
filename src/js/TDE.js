/**
 * @author darrinm / https://darrin.massena.com/
 */

var TDE = function () {}
TDE.serverURL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ?
		'http://localhost:8081' : 'https://us-central1-de-io-3a257.cloudfunctions.net';

TDE.saveProject = function ( project, serializedProject ) {

	var user = firebase.auth().currentUser;
	var userName = user.displayName;

	// Create a thumbnail.
	// Save the project.

	var fileRef = firebase.storage().ref( 'user/' + user.uid + '/' + project.id + '/' + 'project.json' );
	return fileRef.putString( serializedProject ).then( function( snapshot ) {

		// Save a thumbnail.

		var image = TDE.createThumbnail( editor );
		var thumbRef = firebase.storage().ref( 'user/' + user.uid + '/' + project.id + '/' + 'thumbnail.jpg' );
		return thumbRef.put( image ).then( function( snapshot ) {

			// Add the project to the database.

			var projectRef = firebase.database().ref( 'projects/' + user.uid + '/' + project.id );
			return projectRef.set( {
				'owner': user.uid,
				'ownerName': userName, // TODO: don't trust client to specify this
				'title': project.title,
				'description': '<na>',
				'thumbnail': thumbRef.fullPath,
		// TODO:			'created': ?,
				'modified': ( new Date ).toJSON()
			} );

		} );

	} );

}

TDE.loadProject = function ( projectId ) {

	var user = firebase.auth().currentUser;
	var userName = user.displayName;

	var fileRef = firebase.storage().ref( 'user/' + user.uid + '/' + projectId + '/' + 'project.json' );
	return fileRef.getDownloadURL().then( function( url ) {

		var manager = new THREE.LoadingManager( function () {} );

		var loader = new THREE.XHRLoader( manager );
		loader.load( url, function ( content ) {

			editor.clear();
			editor.fromJSON( JSON.parse( content ) );

		} );

	} );

}

TDE.deletePublishedProject = function ( projectId ) {

	return callAPI( { command: 'deletePublishedProject', projectId: projectId } );

}

TDE.deleteProject = function ( projectId ) {

	var user = firebase.auth().currentUser;

	// Delete the published project (if any).

	return TDE.deletePublishedProject( projectId ).then( function() {

		// Delete the thumbnail file.

		var thumbRef = firebase.storage().ref( 'user/' + user.uid + '/' + projectId + '/' + 'thumbnail.jpg' );
		return thumbRef.delete().then( function() {

			// Delete the project file.

			var fileRef = firebase.storage().ref( 'user/' + user.uid + '/' + projectId + '/' + 'project.json' );
			return fileRef.delete().then( function() {

				// Delete the project database entry.

				var projectRef = firebase.database().ref( 'projects/' + user.uid + '/' + projectId );
				return projectRef.remove();

			} );

		} );

	});

}

TDE.publishProject = function ( projectId ) {

	return callAPI( { command: 'publishProject', projectId: projectId } );

}

function callAPI( json ) {

	var user = firebase.auth().currentUser;

	return user.getToken( /* forceRefresh */ true ).then( function ( idToken ) {
//		console.log( 'token: ' + idToken );
		json.token = idToken;

		return new Promise( function( resolve, reject ) {
			var xhr = new XMLHttpRequest();
			xhr.open( 'POST', TDE.serverURL + '/api', true );
			xhr.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );

			xhr.onload = function( event ) {

				if ( this.status === 200 || this.status === 0 ) {

					resolve( this.responseText );

				} else {

					reject( this.status );

				}

			}

			xhr.send( JSON.stringify( json ) );
		});

	});

}

// TODO: don't allow public write access!
TDE.upload = function( bucket, object, data ) {

	var mimeTypes = {
		html: 'text/html',
		json: 'application/json',
		js: 'text/javascript',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg'
	}
	var contentType = mimeTypes[ object.split( '.' ).pop().toLowerCase() ] | 'text/plain';

	// Get resumable upload session URI.

	return new Promise( function( resolve, reject ) {

		var xhr = new XMLHttpRequest();
		xhr.open( 'POST', 'https://www.googleapis.com/upload/storage/v1/b/' + bucket + '/o?uploadType=resumable&predefinedAcl=publicRead', true );
		xhr.setRequestHeader( 'Content-Type', 'application/json' );

		xhr.onload = function( event ) {

			if ( this.status === 200 || this.status === 0 ) {

				resolve( xhr.getResponseHeader( 'Location' ) );

			} else {

				reject( this.status );

			}

		}

		// Disable browser caching. Consider inserting version numbers as cache-busting query parameters instead.
		xhr.send( JSON.stringify( { name: object, 'contentType': contentType, cacheControl: 'private, max-age=0, no-transform' } ) );

	// Upload the file to the upload session URI.

	} ).then( function( uploadLocation ) {

		return new Promise( function( resolve, reject ) {

			var xhr = new XMLHttpRequest();
			xhr.open( 'PUT', uploadLocation, true );

			xhr.onload = function( event ) {

				if ( this.status === 200 || this.status === 0 ) {

					resolve( this.response );

				} else {

					reject( this.status );

				}

			}

			xhr.send( data );

		} );

	} );

}

// Create a thumbnail image for the project. Return in an ArrayBuffer.

TDE.createThumbnail = function ( editor ) {

	// TODO: carry over settings, e.g. antialias from project
	var renderer = new THREE.WebGLRenderer( { preserveDrawingBuffer: true, antialias: true } );
	renderer.setSize( 800, 600 );
	var oldAspect = editor.camera.aspect;
	editor.camera.aspect = 800 / 600;
	editor.camera.updateProjectionMatrix();
	renderer.shadowMap.enabled = true;
	renderer.render( editor.scene, editor.camera );
	editor.camera.aspect = oldAspect;
	editor.camera.updateProjectionMatrix();

	var dataURL = renderer.domElement.toDataURL( 'image/jpeg' );
	var image = atob( dataURL.split( ',' )[ 1 ] );

	function arrayBufferFromString( str ) {

		var buf = new ArrayBuffer( str.length );
		var bufView = new Uint8Array( buf );
		for ( var i = 0, strLen = str.length; i < strLen; i ++ ) {

			bufView[ i ] = str.charCodeAt( i );

		}
		return buf;

	}

	return arrayBufferFromString( image );
}
