/**
 * @author darrinm / https://darrin.massena.com/
 */

var TDE = function() {}

// TODO: delete old files
TDE.publish = function( projectId, title, files ) {

	var publishBucket = '3de-pub';
	// TODO: username
	var userName = 'darrinm';
	var publishName = userName + '/' + title;
	var publishPath = publishBucket + '/' + publishName;

	var uploads = [];
	files.forEach( function( file ) {

		uploads.push( TDE.upload ( publishBucket, publishName + '/' + file.name, file.data ) );

	} );

	return Promise.all( uploads ).then( function( response ) {

		var playURL = 'https://storage.googleapis.com/' + publishPath + '/index.html';
		var thumbnailURL = 'https://storage.googleapis.com/' + publishPath + '/thumbnail.jpg';

		// Add to published project database.

		var publishedRef = firebase.database().ref( 'published-projects/' + projectId );
		var user = firebase.auth().currentUser;
		publishedRef.set( {
			"owner": user.uid,
			"title": title,
			"description": "<na>",
			"play": playURL,
			"edit": "url",
			"thumbnail": thumbnailURL,
			"publishedOn": ( new Date ).toJSON()
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


