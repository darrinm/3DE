/**
 * @author mrdoob / http://mrdoob.com/
 */

Menubar.Help = function ( editor ) {

	var container = new UI.Panel();
	container.setClass( 'menu' );

	var title = new UI.Panel();
	title.setClass( 'title' );
	title.setTextContent( 'Help' );
	container.add( title );

	var options = new UI.Panel();
	options.setClass( 'options' );
	container.add( options );

	// Source code

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'Source code' );
	option.onClick( function () {

		window.open( 'https://github.com/darrinm/3DE', '_blank' )

	} );
	options.add( option );

	// About

	var option = new UI.Row();
	option.setClass( 'option' );
	option.setTextContent( 'About' );
	option.onClick( function () {

		window.open( 'https://github.com/darrinm/3DE/blob/master/README.md', '_blank' );

	} );
	options.add( option );

	return container;

};
