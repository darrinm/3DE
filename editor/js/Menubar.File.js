/**
 * @author mrdoob / http://mrdoob.com/
 */

Menubar.File = function ( editor ) {

	var container = new UI.Panel();
	container.setClass( 'menu' );

	var title = new UI.Panel();
	title.setClass( 'title' );
	title.setTextContent( 'File' );
	container.add( title );

	var options = new UI.Panel();
	options.setClass( 'options' );
	container.add( options );

	// New

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'New' );
	option.onClick( function () {

		if ( confirm( 'Any unsaved data will be lost. Are you sure?' ) ) {

			editor.clear();

		}

	} );
	options.add( option );

	// Open (Dropbox)

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Open (Dropbox)...' );
	option.onClick( function () {

		if ( confirm( 'Any unsaved data will be lost. Are you sure?' ) ) {
			var chooseOptions = {

				// Required. Called when a user selects an item in the Chooser.
				success: function ( files ) {
					var manager = new THREE.LoadingManager( function () {
					} );

					var loader = new THREE.XHRLoader( manager );
					loader.load( files[0].link, function ( content ) {

						editor.clear();
						editor.fromJSON( JSON.parse( content ) );
						editor.setTitle( files[0].name.replace(/\.[^/.]+$/, "") );

					} );
				},

				// Optional. Called when the user closes the dialog without selecting a file
				// and does not include any parameters.
				cancel: function () {

				},

				// Optional. "preview" (default) is a preview link to the document for sharing,
				// "direct" is an expiring link to download the contents of the file. For more
				// information about link types, see Link types below.
				linkType: "direct", // or "preview"

				// Optional. A value of false (default) limits selection to a single file, while
				// true enables multiple file selection.
				multiselect: false, // or true

				// Optional. This is a list of file extensions. If specified, the user will
				// only be able to select files with these extensions. You may also specify
				// file types, such as "video" or "images" in the list. For more information,
				// see File types below. By default, all extensions are allowed.
				extensions: ['.3de'],
			};

			Dropbox.choose( chooseOptions );

		}

	} );
	options.add( option );

	// Save (Dropbox)

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Save (Dropbox)...' );
	option.onClick( function () {

		var output = editor.toJSON();
		output.metadata.type = 'App';
		delete output.history;

		output = JSON.stringify( output, null, '\t' );
		output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		var parameters = {
			files: [
				{ 'url': 'data:text/plain;base64,' + window.btoa( output ), 'filename': editor.title + '.3de' }
			]
		};

		Dropbox.save( parameters );
	} );
	options.add( option );

	//

	options.add( new UI.HorizontalRule() );

	// Import

	var fileInput = document.createElement( 'input' );
	fileInput.type = 'file';
	fileInput.addEventListener( 'change', function ( event ) {

		editor.loader.loadFile( fileInput.files[ 0 ] );

	} );

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Import...' );
	option.onClick( function () {

		fileInput.click();

	} );
	options.add( option );

	//

	options.add( new UI.HorizontalRule() );

	// Export Geometry

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Export Geometry' );
	option.onClick( function () {

		var object = editor.selected;

		if ( object === null ) {

			alert( 'No object selected.' );
			return;

		}

		var geometry = object.geometry;

		if ( geometry === undefined ) {

			alert( 'The selected object doesn\'t have geometry.' );
			return;

		}

		var output = geometry.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( e ) {

			output = JSON.stringify( output );

		}

		saveString( output, 'geometry.json' );

	} );
	options.add( option );

	// Export Object

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Export Object' );
	option.onClick( function () {

		var object = editor.selected;

		if ( object === null ) {

			alert( 'No object selected' );
			return;

		}

		var output = object.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( e ) {

			output = JSON.stringify( output );

		}

		saveString( output, 'model.json' );

	} );
	options.add( option );

	// Export Scene

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Export Scene' );
	option.onClick( function () {

		var output = editor.scene.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( e ) {

			output = JSON.stringify( output );

		}

		saveString( output, 'scene.json' );

	} );
	options.add( option );

	// Export OBJ

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Export OBJ' );
	option.onClick( function () {

		var object = editor.selected;

		if ( object === null ) {

			alert( 'No object selected.' );
			return;

		}

		var exporter = new THREE.OBJExporter();

		saveString( exporter.parse( object ), 'model.obj' );

	} );
	options.add( option );

	// Export STL

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Export STL' );
	option.onClick( function () {

		var exporter = new THREE.STLExporter();

		saveString( exporter.parse( editor.scene ), 'model.stl' );

	} );
	options.add( option );

	//

	options.add( new UI.HorizontalRule() );

	// Publish

	var gatherFiles = function ( onGathered ) {

		var files = [];

		//

		var output = editor.toJSON();
		output.metadata.type = 'App';
		delete output.history;

		var vr = output.project.vr;

		output = JSON.stringify( output, null, '\t' );
		output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		files.push( { name: 'app.json', data: output } );

		//

		var manager = new THREE.LoadingManager( function () {
			onGathered( files );
		} );

		var loader = new THREE.XHRLoader( manager );
		loader.load( 'js/libs/app/index.html', function ( content ) {

			var includes = [];

			if ( vr ) {

				includes.push( '<script src="js/VRControls.js"></script>' );
				includes.push( '<script src="js/VREffect.js"></script>' );
				includes.push( '<script src="js/WebVR.js"></script>' );

			}

			content = content.replace( '<!-- includes -->', includes.join( '\n\t\t' ) );

			files.push( { name: 'index.html', data: content } );

		} );

		loader.load( 'js/libs/app.js', function ( content ) {

			files.push( { name: 'js/app.js', data: content } );

		} );

		loader.load( 'three.min.js', function ( content ) {

			files.push( { name: 'js/three.min.js', data: content } );

		} );

		if ( vr ) {

			loader.load( 'deps/VRControls.js', function ( content ) {

				files.push( { name: 'js/VRControls.js', data: content } );

			} );

			loader.load( 'deps/VREffect.js', function ( content ) {

				files.push( { name: 'js/VREffect.js', data: content } );

			} );

			loader.load( 'deps/WebVR.js', function ( content ) {

				files.push( { name: 'js/WebVR.js', data: content } );

			} );

		}

	}

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Publish' );
	option.onClick( function () {

		gatherFiles( function ( files ) {

			var zip = new JSZip();

			files.forEach( function ( file ) {

				zip.file( file.name, file.data );

			} );

			save( zip.generate( { type: 'blob' } ), 'download.zip' );

		} );

	} );
	options.add( option );

	// Publish (3DE.io)

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Publish (3DE.io)' );
	option.onClick( function() {

		// Open the preview window now (on click event) so it won't get blocked.
		var preview = window.open( '', 'preview' );

		gatherFiles( function( files ) {

			// Create a thumbnail for the project.
			var renderer = new THREE.WebGLRenderer( { preserveDrawingBuffer: true, antialias: true } );
			renderer.setSize( 800, 600 );
			var oldAspect = editor.camera.aspect;
			editor.camera.aspect = 800 / 600;
			editor.camera.updateProjectionMatrix();
			renderer.shadowMap.enabled = true;
			renderer.render( editor.scene, editor.camera );
			editor.camera.aspect = oldAspect;
			editor.camera.updateProjectionMatrix();

			var dataURL = renderer.domElement.toDataURL( 'image/png' );
			var image = atob( dataURL.split( ',' )[ 1 ] );

			function str2ab( str ) {

				var buf = new ArrayBuffer( str.length );
				var bufView = new Uint8Array( buf );
				for ( var i = 0, strLen = str.length; i < strLen; i ++ ) {

					bufView[ i ] = str.charCodeAt( i );

				}
				return buf;

			}

			files.push( { name: 'thumbnail.png', data: str2ab( image ) } );

			// TODO: projectId
			TDE.publish( 'projectId', editor.title, files ).then( function( response ) {

				preview.location = response;

			}, function( status ) {

				console.log( 'publish error status ', status );
				preview.close();

			} );

		} );

	} );
	options.add( option );


	//

	var link = document.createElement( 'a' );
	link.style.display = 'none';
	document.body.appendChild( link ); // Firefox workaround, see #6594

	function save( blob, filename ) {

		link.href = URL.createObjectURL( blob );
		link.download = filename || 'data.json';
		link.click();

		// URL.revokeObjectURL( url ); breaks Firefox...

	}

	function saveString( text, filename ) {

		save( new Blob( [ text ], { type: 'text/plain' } ), filename );

	}

	return container;

};
