/**
 * @author darrinm / http://darrin.massena.com/
 */

Menubar.Logo = function ( editor ) {

	var container = new UI.Panel();
	container.setClass( 'menu' );

	var logo = new UI.Text( '3DE' );
	logo.setClass( 'logo' );
	container.add( logo );

	logo.onClick( function () {

		window.location = 'index.html';

	});

	return container;

};
