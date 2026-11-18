/**
 * ADN Empresarial — Página de lectura de «Ideas para mover tu negocio».
 *
 * «Compartir» usa la URL real de la página (location.href):
 *   - con el menú nativo del dispositivo si existe (Web Share API);
 *   - si no, copia el enlace al portapapeles y lo avisa;
 *   - si tampoco se puede copiar, muestra el enlace para copiarlo a mano.
 */
( function () {
	'use strict';

	var boton = document.querySelector( '.adn-articulo__compartir' );
	var aviso = document.querySelector( '.adn-articulo__aviso' );
	if ( ! boton ) {
		return;
	}

	function avisar( texto ) {
		if ( ! aviso ) {
			return;
		}
		aviso.textContent = texto;
		window.clearTimeout( avisar.t );
		avisar.t = window.setTimeout( function () {
			aviso.textContent = '';
		}, 4000 );
	}

	boton.addEventListener( 'click', function () {
		var url = window.location.href.split( '#' )[ 0 ];
		var titulo = boton.getAttribute( 'data-titulo' ) || document.title;

		if ( navigator.share ) {
			navigator.share( { title: titulo, url: url } ).catch( function () {} );
			return;
		}
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			navigator.clipboard.writeText( url ).then( function () {
				avisar( 'Enlace copiado' );
			}, function () {
				avisar( url );
			} );
			return;
		}
		avisar( url );
	} );
}() );
