/**
 * ADN Empresarial — Barra «Mercados» como cinta continua en celular.
 *
 * Envuelve la lista de cotizaciones en .adn-divisas__cinta > .adn-divisas__pista
 * y le agrega una copia visual (aria-hidden) para que el desplazamiento sea un
 * bucle sin corte: la pista se mueve de 0 a -50 % (exactamente una copia).
 *
 * - Solo se anima en pantallas de hasta 767 px (adn-cabecera-lateral.css). En
 *   escritorio los envoltorios no generan caja (display: contents) y la copia
 *   no se muestra: la barra queda como estaba.
 * - La duración se ajusta al ancho real del contenido (velocidad constante),
 *   entre 20 y 25 s por recorrido.
 * - Lectores de pantalla: solo leen la lista original; la copia es aria-hidden.
 * - Si los valores de la lista cambian, la copia se rehace (MutationObserver).
 * - prefers-reduced-motion: sin animación; la lista se desplaza a mano (CSS).
 */
( function () {
	'use strict';

	var lista = document.querySelector( '.adn-divisas__lista' );
	if ( ! lista || lista.closest( '.adn-divisas__cinta' ) ) {
		return;
	}

	var PX_POR_SEGUNDO = 28;
	var MIN_S = 20;
	var MAX_S = 25;

	var cinta = document.createElement( 'div' );
	cinta.className = 'adn-divisas__cinta';
	var pista = document.createElement( 'div' );
	pista.className = 'adn-divisas__pista';

	lista.parentNode.insertBefore( cinta, lista );
	cinta.appendChild( pista );
	pista.appendChild( lista );

	var copia = null;

	function rehacerCopia() {
		if ( copia ) {
			copia.remove();
		}
		copia = lista.cloneNode( true );
		copia.classList.add( 'adn-divisas__lista--copia' );
		copia.removeAttribute( 'aria-label' );
		copia.setAttribute( 'aria-hidden', 'true' );
		pista.appendChild( copia );
		medir();
	}

	function medir() {
		var ancho = lista.getBoundingClientRect().width;
		if ( ! ancho ) {
			return;
		}
		var segundos = Math.min( MAX_S, Math.max( MIN_S, ancho / PX_POR_SEGUNDO ) );
		cinta.style.setProperty( '--adn-cinta-duracion', segundos.toFixed( 1 ) + 's' );
	}

	rehacerCopia();

	if ( 'MutationObserver' in window ) {
		new MutationObserver( rehacerCopia ).observe( lista, { subtree: true, childList: true, characterData: true } );
	}

	var espera = 0;
	window.addEventListener( 'resize', function () {
		window.clearTimeout( espera );
		espera = window.setTimeout( medir, 150 );
	}, { passive: true } );
}() );
