/**
 * @author mrdoob / http://mrdoob.com/
 */

Sidebar.Project = function ( editor ) {

	var project = editor.project;
	var signals = editor.signals;

	var rendererTypes = {

		'WebGLRenderer': THREE.WebGLRenderer,
		'CanvasRenderer': THREE.CanvasRenderer,
		'SVGRenderer': THREE.SVGRenderer,
		'SoftwareRenderer': THREE.SoftwareRenderer,
		'RaytracingRenderer': THREE.RaytracingRenderer

	};

	var container = new UI.Panel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	// class

	var options = {};

	for ( var key in rendererTypes ) {

		if ( key.indexOf( 'WebGL' ) >= 0 && System.support.webgl === false ) continue;

		options[ key ] = key;

	}

	var rendererTypeRow = new UI.Row();
	var rendererType = new UI.Select().setOptions( options ).setWidth( '150px' ).onChange( function () {

		var value = this.getValue();

		project.renderer.type = value;
		updateRenderer();

	} );

	rendererTypeRow.add( new UI.Text( 'Renderer' ).setWidth( '90px' ) );
	rendererTypeRow.add( rendererType );

	container.add( rendererTypeRow );

	if ( project.renderer.type !== undefined ) {

		rendererType.setValue( project.renderer.type );

	}

	// antialiasing

	var rendererPropertiesRow = new UI.Row().setMarginLeft( '90px' );

	var rendererAntialias = new UI.THREE.Boolean( project.renderer.antialias, 'antialias' ).onChange( function () {

		project.renderer.antialias = this.getValue();
		updateRenderer();

	} );
	rendererPropertiesRow.add( rendererAntialias );

	// shadow

	var rendererShadows = new UI.THREE.Boolean( project.renderer.shadows, 'shadows' ).onChange( function () {

		project.renderer.shadows = this.getValue();
		updateRenderer();

	} );
	rendererPropertiesRow.add( rendererShadows );

	rendererPropertiesRow.add( new UI.Break() );

	// gamma input

	var rendererGammaInput = new UI.THREE.Boolean( project.renderer.gammaInput, 'γ input' ).onChange( function () {

		project.renderer.gammaInput = this.getValue();
		updateRenderer();

	} );
	rendererPropertiesRow.add( rendererGammaInput );

	// gamma output

	var rendererGammaOutput = new UI.THREE.Boolean( project.renderer.gammaOutput, 'γ output' ).onChange( function () {

		project.renderer.gammaOutput = this.getValue();
		updateRenderer();

	} );
	rendererPropertiesRow.add( rendererGammaOutput );

	container.add( rendererPropertiesRow );

	// Editable

	var editableRow = new UI.Row();
	var editable = new UI.Checkbox( project.editable ).setLeft( '100px' ).onChange( function () {

		project.editable = this.getValue();

	} );

	editableRow.add( new UI.Text( 'Editable' ).setWidth( '90px' ) );
	editableRow.add( editable );

	container.add( editableRow );

	// VR

	var vrRow = new UI.Row();
	var vr = new UI.Checkbox( project.vr ).setLeft( '100px' ).onChange( function () {

		project.vr = this.getValue();
		// updateRenderer();

	} );

	vrRow.add( new UI.Text( 'VR' ).setWidth( '90px' ) );
	vrRow.add( vr );

	container.add( vrRow );

	// uuid

	// TODO: format better
	// TODO: update on project change
	var objectUUIDRow = new UI.Row();
	var objectUUID = new UI.Text();
	objectUUID.setValue( project.id );

	objectUUIDRow.add( new UI.Text( 'UUID' ).setWidth( '90px' ) );
	objectUUIDRow.add( objectUUID );

	container.add( objectUUIDRow );

	signals.projectChanged.add( refreshUI );

	//

	// TODO: better to just destroy/recreate the whole thing?
	function refreshUI() {

		project = editor.project;
		rendererType.setValue( project.renderer.type );
		rendererAntialias.setValue( project.renderer.antialias );
		rendererShadows.setValue( project.renderer.shadows );
		rendererGammaInput.setValue( project.renderer.gammaInput );
		rendererGammaOutput.setValue( project.renderer.gammaOutput );
		editable.setValue( project.editable );
		vr.setValue( project.vr );
		objectUUID.setValue( project.id );

	}

	function updateRenderer() {

		createRenderer( rendererType.getValue(), rendererAntialias.getValue(), rendererShadows.getValue(), rendererGammaInput.getValue(), rendererGammaOutput.getValue() );

	}

	function createRenderer( type, antialias, shadows, gammaIn, gammaOut ) {

		if ( type === 'WebGLRenderer' && System.support.webgl === false ) {

			type = 'CanvasRenderer';

		}

		rendererPropertiesRow.setDisplay( type === 'WebGLRenderer' ? '' : 'none' );

		var renderer = new rendererTypes[ type ]( { antialias: antialias } );
		renderer.gammaInput = gammaIn;
		renderer.gammaOutput = gammaOut;
		if ( shadows && renderer.shadowMap ) {

			renderer.shadowMap.enabled = true;
			// renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		}

		signals.rendererChanged.dispatch( renderer );

	}

	createRenderer( project.renderer.type, project.renderer.antialias, project.renderer.shadows, project.renderer.gammaInput, project.renderer.gammaOutput );

	return container;

};
