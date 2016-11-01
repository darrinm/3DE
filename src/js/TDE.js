/**
 * @author darrinm / https://darrin.massena.com/
 */

var TDE = function() {}

TDE.save = function (projectId, title, serializedProject ) {

	var user = firebase.auth().currentUser;
	var userName = user.displayName;

	// Create a thumbnail.
	// Save the project.

	var fileRef = firebase.storage().ref( 'user/' + user.uid + '/' + projectId + '/' + 'project.json' );
	return fileRef.putString( serializedProject ).then( function( snapshot ) {

		// Save the thumbnail.

		// Add the project to the database.

		var projectRef = firebase.database().ref( 'projects/' + user.uid + '/' + projectId );
		return projectRef.set( {
			'owner': user.uid,
			'ownerName': userName,
			'title': title,
			'description': '<na>',
	// TODO:			'thumbnail': thumbnailURL,
	// TODO:			'created': ?,
			'modified': ( new Date ).toJSON()
		} );

	} );

}

// TODO: delete old files
TDE.publish = function( projectId, title, files ) {

	var publishBucket = '3de-pub';
	var user = firebase.auth().currentUser;
	var userName = user.displayName;

	// Remove characters that aren't URL friendly.
	var safeTitle = title.replace(/[ %\/\?\:\&\=\+\$\#\,\@\;]/g, '');
	var publishName = userName + '/' + safeTitle;
	var publishPath = publishBucket + '/' + publishName;

	var uploads = [];
	files.forEach( function( file ) {

		uploads.push( TDE.upload ( publishBucket, publishName + '/' + file.name, file.data ) );

	} );

	return Promise.all( uploads ).then( function( resources ) {

		var playURL = 'https://storage.googleapis.com/' + publishPath + '/index.html';
		var thumbnailURL = 'https://storage.googleapis.com/' + publishPath + '/thumbnail.jpg';

		// Add to published project database.

		var publishedRef = firebase.database().ref( 'published-projects/' + projectId );
		publishedRef.set( {
			'owner': user.uid,
			'ownerName': userName,
			'title': title,
			'description': '<na>',
			'play': playURL,
			'thumbnail': thumbnailURL,
			'publishedOn': ( new Date ).toJSON()
		} );
		return playURL;

	} );

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
	var contentType = mimeTypes[ object.split( '.' ).pop().toLowerCase() ] || 'text/plain';

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


