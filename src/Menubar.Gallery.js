/**
 * @author darrinm / http://darrin.massena.com/
 */

Menubar.Gallery = function ( editor ) {

	var container = new UI.Panel();
	container.setClass( 'menu' );

	var gallery = new UI.Text( 'Gallery' );
	gallery.setClass( 'title' );
	gallery.dom.style.cursor = 'pointer';
	container.add( gallery );

	gallery.onClick( function () {

		window.location = 'gallery.html';

	});

	return container;

};
