/**
 * @author mrdoob / http://mrdoob.com/
 */

Sidebar.Settings = function ( editor ) {

	var config = editor.config;
	var signals = editor.signals;

	var container = new UI.Panel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	var autosaveRow = new UI.Row();
	var autosave = new UI.THREE.Boolean( config.getKey( 'autosave' ), 'autosave' );
	autosave.text.setColor( '#888' );
	autosave.onChange( function () {

		var value = this.getValue();

		config.setKey( 'autosave', value );

		if ( value === true ) {

			signals.sceneGraphChanged.dispatch();

		}

	} );
	autosaveRow.add( autosave );
	container.add( autosaveRow );

	signals.savingStarted.add( function () {

		autosave.text.setTextDecoration( 'underline' );

	} );

	signals.savingFinished.add( function () {

		autosave.text.setTextDecoration( 'none' );

	} );

	// class

	var options = {
		'css/light.css': 'light',
		'css/dark.css': 'dark'
	};

	var themeRow = new UI.Row();
	var theme = new UI.Select().setWidth( '150px' );
	theme.setOptions( options );

	if ( config.getKey( 'theme' ) !== undefined ) {

		theme.setValue( config.getKey( 'theme' ) );

	}

	theme.onChange( function () {

		var value = this.getValue();

		editor.setTheme( value );
		editor.config.setKey( 'theme', value );

	} );

	themeRow.add( new UI.Text( 'Theme' ).setWidth( '90px' ) );
	themeRow.add( theme );

	container.add( themeRow );

	return container;

};
