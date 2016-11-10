/**
 * @author darrinm / http://darrin.massena.com/
 */

Menubar.User = function ( editor ) {

	var fbui;
	var modalOverlay;
	var modalContainer;

	var container = new UI.Panel();
	container.setClass( 'menu right' );

	var userUI = new UI.Text( '' );
	userUI.setClass( 'title' );
	userUI.dom.style.cursor = 'pointer';
	container.add( userUI );

	Menubar.User.signInOut = function () {

		var user = firebase.auth().currentUser;

		if ( user ) {

			firebase.auth().signOut().then( function () {
				// Sign-out successful.
			}, function ( error ) {
				// An error happened.
			} );

		} else {

			// TODO: consider UI.Modal

			modalOverlay = document.createElement( 'div' );
			modalOverlay.style.cssText = 'width: 100%; height: 100%; position: fixed; top: 0; left: 0';
			document.body.appendChild( modalOverlay );

			modalContainer = document.createElement( 'div' );
			modalContainer.id = 'firebaseui-auth-container';
			modalContainer.style.cssText = 'position: absolute; left: 0; right: 0; margin-top: 50px; margin-left: auto; margin-right: auto; width: 400px';
			document.body.insertBefore( modalContainer, document.body.firstChild );

			var removeOverlay = function () {

				fbui.reset();
				document.body.removeChild( modalOverlay );
				modalOverlay = null;
				document.body.removeChild( modalContainer );
				modalContainer = null;
				document.removeEventListener( 'keydown', keyDownListener, true );
			};

			// Have the escape key cancel the mode. Also, don't let keyboard events bubble beyond the modal contents.
			var keyDownListener = function ( event ) {
				event.stopPropagation();

				if ( event.keyCode == 27 ) { // escape
					removeOverlay();
				}

			};
			document.addEventListener( 'keydown', keyDownListener, true );

			// Have clicks outside the modal cancal it. Also, don't let mouse events bubble beyond the modal contents.
			modalOverlay.addEventListener( 'mousedown', function ( event ) {

				event.stopPropagation();
				removeOverlay();

			} );

			var uiConfig = {
				'signInOptions': [
					firebase.auth.EmailAuthProvider.PROVIDER_ID
				],
				'signInFlow': 'popup',
				'accountChooserEnabled': false,
				'tosUrl': '<your-tos-url>',
				'callbacks': {
					'signInSuccess': function( currentUser, credential, redirectUrl ) {
						// Return type determines whether we continue the redirect automatically
						// or whether we leave that to developer to handle.
						return false;
					}
				}
			};

			if ( !fbui ) {

				fbui = new firebaseui.auth.AuthUI( firebase.auth() );

			}

			// The start method will wait until the DOM is loaded.
			fbui.start( '#firebaseui-auth-container', uiConfig );

			/*
			firebase.auth().signInWithEmailAndPassword('darrin@massena.com', '3dfjru4!').catch(function(error) {
				// Handle Errors here.
				var errorCode = error.code;
				var errorMessage = error.message;
				// ...
				console.log(errorCode, errorMessage);
			});
			*/
		}

	}

	userUI.onClick( Menubar.User.signInOut );

	firebase.auth().onAuthStateChanged( function ( user ) {

		if ( user ) {
			// User is signed in.
			user.getToken().then( function ( accessToken ) {
				userUI.setValue( user.displayName || user.email );
			});

			if ( editor.pendingProject ) {

				TDE.loadProject( editor.pendingProject );
				editor.pendingProject = null;

			}

		} else {

			// User is signed out.
			userUI.setValue( 'Sign in' );
		}

	}, function ( error ) {

		console.log( error );

	});

	return container;

};
