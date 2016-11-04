/**
 * @author darrinm / http://darrin.massena.com/
 */

var Menubar = function ( editor ) {

	var container = new UI.Panel();
	container.setId( 'menubar' );

	container.add( new Menubar.Logo( editor ) );
	container.add( new Menubar.Gallery( editor ) );
	container.add( new Menubar.User( editor ) );

	return container;

};
