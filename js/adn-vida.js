/**
 * ADN Empresarial — entradas suaves al bajar (1.8.0).
 *
 * Marca tarjetas, títulos de sección y anuncios con .adn-revelar y les pone
 * .adn-visto cuando entran en pantalla, con un pequeño escalonado dentro de
 * cada grupo. Sin JS, o con prefers-reduced-motion, no hace nada y todo se ve.
 */
( function () {
	'use strict';

	if ( ! ( 'IntersectionObserver' in window ) ) {
		return;
	}

	if ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}

	var SELECTOR = [
		'.pia-seccion-titulo',
		'.pia-apertura .wp-block-post',
		'.pia-secundarias .wp-block-post',
		'.pia-tarjetas .wp-block-post',
		'.pia-espacio-publicitario',
		'.sic-archivo__lista > .sic-tarjeta',
		'.sic-relacionadas > .sic-tarjeta',
		'.sic-nota__cuerpo > *'
	].join( ',' );

	function iniciar() {
		var nodos = Array.prototype.slice.call( document.querySelectorAll( SELECTOR ) );
		var alto = window.innerHeight || 800;

		var observador = new IntersectionObserver(
			function ( entradas ) {
				entradas.forEach( function ( entrada ) {
					if ( entrada.isIntersecting ) {
						entrada.target.classList.add( 'adn-visto' );
						observador.unobserve( entrada.target );
					}
				} );
			},
			{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
		);

		nodos.forEach( function ( nodo ) {
			// Lo que ya está en la primera pantalla no se esconde: se ve al cargar.
			if ( nodo.getBoundingClientRect().top < alto * 0.9 ) {
				return;
			}

			var hermanos = nodo.parentElement ? Array.prototype.indexOf.call( nodo.parentElement.children, nodo ) : 0;
			nodo.style.setProperty( '--adn-retraso', Math.min( hermanos, 4 ) * 70 + 'ms' );
			nodo.classList.add( 'adn-revelar' );
			observador.observe( nodo );
		} );

		// Los títulos de la primera pantalla igual giran su cruz.
		Array.prototype.forEach.call( document.querySelectorAll( '.pia-seccion-titulo' ), function ( t ) {
			if ( t.getBoundingClientRect().top < alto * 0.9 ) {
				t.classList.add( 'adn-visto' );
			}
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', iniciar );
	} else {
		iniciar();
	}
}() );
