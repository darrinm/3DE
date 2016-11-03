/**
 * @author darrinm / http://darrin.massena.com/
 */

Project = function( editor ) {

    this.signals = editor.signals;

    this.title = 'Untitled';
	this.id = THREE.Math.generateUUID();
    this.editable = false;
    this.vr = false;
    this.renderer = {

        type: 'WebGLRenderer',
        gammaInput: false,
        gammaOutput: false,
        shadows: false,
        antialias: false

    }

	this.signals.projectChanged.dispatch();
}

Project.prototype = {

    setTitle: function( title ) {

        this.title = title;
		this.signals.projectChanged.dispatch();

    },

	toJSON: function() {

		return {

            title: this.title,
            id: this.id,

            renderer: this.renderer,
            editable: this.editable,
            vr: this.vr

        }

	},

	fromJSON: function( json ) {

		if ( json === undefined ) return;

        for ( var key in json )
            this[ key ] = json[ key ];

        this.signals.projectChanged.dispatch();

	}

}