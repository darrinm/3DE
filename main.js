var config = {
	apiKey: "AIzaSyDWsSmYFq_oTrmFar-vkJ7XFAKmPlLP_zs",
	authDomain: "de-io-3a257.firebaseapp.com",
	databaseURL: "https://de-io-3a257.firebaseio.com",
	storageBucket: "de-io-3a257.appspot.com",
	messagingSenderId: "599005890547"
};
firebase.initializeApp(config);

var menubar = new Menubar( {} );
document.body.appendChild( menubar.dom );
