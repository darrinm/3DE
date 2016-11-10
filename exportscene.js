//var script=document.createElement('script');
//script.src='http://localhost:8080/scenexporter.js';
//script.className='ExportScene';document.head.appendChild(script);%7D)()
var output = scene.toJSON();
output = JSON.stringify( output, null, '\t' );
console.log(output);
