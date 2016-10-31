/**
 * @author mrdoob / http://mrdoob.com/
 */

Menubar.Title = function ( editor ) {

	var container = new UI.Panel();
	container.setClass( 'document_title' );

	if (!editor.title)
		editor.setTitle( 'Untitled' );
	var title = new UI.Text( editor.title );
	title.dom.style.cursor = 'text';
	title.setClass( 'document_title_text' );
	container.add( title );
	title.onClick( function () {

		var newTitle = prompt( 'Title', editor.title ? editor.title : 'Untitled' );
		if (newTitle) {
			editor.setTitle(newTitle);
		}

	});

	editor.signals.titleChanged.add( function () {

		title.setValue( editor.title );
	});

	return container;

};
