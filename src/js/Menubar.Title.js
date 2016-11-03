/**
 * @author darrinm / http://darrin.massena.com/
 */

Menubar.Title = function ( editor ) {

	var container = new UI.Panel();
	container.setClass( 'document_title' );

	var title = new UI.Text( editor.project.title );
	title.dom.style.cursor = 'text';
	title.setClass( 'document_title_text' );
	container.add( title );
	title.onClick( function() {

		var newTitle = prompt( 'Title', editor.project.title );
		if ( newTitle ) {
			editor.project.setTitle( newTitle );
		}

	} );

	editor.signals.projectChanged.add( function() {

		if ( title.getValue() != editor.project.title )
			title.setValue( editor.project.title );

	} );

	return container;

};
