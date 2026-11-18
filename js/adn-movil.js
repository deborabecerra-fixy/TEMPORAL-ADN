/**
 * ADN Empresarial — Disposición móvil (hasta 767 px)
 *
 * 1. Publicidad arriba: el anuncio del header (320×50) pasa a una franja al
 *    comienzo de la página, por encima de las barras y del header. Así el
 *    header queda solo con logo + menú y puede quedar fijo (sticky, en CSS).
 * 2. Publicidad abajo: el anuncio del pie (320×100) queda anclado al borde
 *    inferior de la pantalla, con una pestaña para esconderlo y volver a
 *    mostrarlo. La elección se recuerda durante la visita (sessionStorage).
 *
 * No se crean ni duplican espacios publicitarios: se reubican los existentes
 * y, si la pantalla pasa de 767 px, vuelven a su lugar original.
 * El alto del anuncio anclado se publica en --sic-banner-alto (lo usan el
 * relleno inferior de la página y el botón «Volver arriba»).
 */
( function () {
	'use strict';

	var movil = window.matchMedia( '(max-width: 767px)' );
	var raiz = document.documentElement;
	var CLAVE = 'adn-anclado-oculto';

	/* ---------- 1. Anuncio de arriba ---------- */
	var anuncioTop = document.querySelector( '.sic-cabecera .pia-cabecera-anuncio' );
	var marcaTop = null;
	var tope = null;
	if ( anuncioTop ) {
		marcaTop = document.createComment( 'lugar original del anuncio del header' );
		anuncioTop.parentNode.insertBefore( marcaTop, anuncioTop );
		tope = document.createElement( 'div' );
		tope.className = 'adn-movil-tope';
		var primero = document.querySelector( '.adn-divisas' ) || document.querySelector( '.sic-barra' ) || document.querySelector( '.sic-cabecera' );
		primero.parentNode.insertBefore( tope, primero );
	}

	/* ---------- 2. Anuncio de abajo, anclado ---------- */
	var pie = document.getElementById( 'pia-ad-footer' );
	var boton = null;
	var piezaPie = pie && pie.querySelector( '.sic-ads' );
	if ( pie ) {
		boton = document.createElement( 'button' );
		boton.type = 'button';
		boton.className = 'adn-anclado__pestana';
		boton.setAttribute( 'aria-controls', 'pia-ad-footer' );
		boton.innerHTML = '<span class="adn-anclado__flecha" aria-hidden="true"></span>';
		pie.appendChild( boton );
	}

	function leerOculto() {
		try {
			return window.sessionStorage.getItem( CLAVE ) === '1';
		} catch ( e ) {
			return false;
		}
	}

	function guardarOculto( valor ) {
		try {
			window.sessionStorage.setItem( CLAVE, valor ? '1' : '0' );
		} catch ( e ) {}
	}

	function medir() {
		if ( ! pie || ! pie.classList.contains( 'adn-anclado' ) ) {
			raiz.style.removeProperty( '--sic-banner-alto' );
			return;
		}
		var alto = pie.classList.contains( 'is-oculto' ) ? 0 : pie.getBoundingClientRect().height;
		raiz.style.setProperty( '--sic-banner-alto', Math.round( alto ) + 'px' );
	}

	function fijarOculto( oculto ) {
		pie.classList.toggle( 'is-oculto', oculto );
		boton.setAttribute( 'aria-expanded', oculto ? 'false' : 'true' );
		boton.setAttribute( 'aria-label', oculto ? 'Mostrar publicidad' : 'Ocultar publicidad' );
		if ( piezaPie ) {
			piezaPie.inert = oculto; // oculto también para teclado y lectores
		}
		medir();
	}

	if ( boton ) {
		boton.addEventListener( 'click', function () {
			var oculto = ! pie.classList.contains( 'is-oculto' );
			guardarOculto( oculto );
			fijarOculto( oculto );
		} );
	}

	/* ---------- Aplicar / revertir según el ancho ---------- */
	function aplicar() {
		var esMovil = movil.matches;
		raiz.classList.toggle( 'adn-movil-activo', esMovil );

		if ( anuncioTop && tope ) {
			if ( esMovil && anuncioTop.parentNode !== tope ) {
				tope.appendChild( anuncioTop );
			} else if ( ! esMovil && anuncioTop.parentNode === tope ) {
				marcaTop.parentNode.insertBefore( anuncioTop, marcaTop.nextSibling );
			}
		}

		if ( pie && boton ) {
			pie.classList.toggle( 'adn-anclado', esMovil );
			// El anclado no participa de la animación de entrada al bajar.
			pie.classList.remove( 'adn-revelar' );
			if ( esMovil ) {
				fijarOculto( leerOculto() );
			} else {
				pie.classList.remove( 'is-oculto' );
				if ( piezaPie ) {
					piezaPie.inert = false;
				}
				medir();
			}
		}
	}

	aplicar();
	if ( movil.addEventListener ) {
		movil.addEventListener( 'change', aplicar );
	} else if ( movil.addListener ) {
		movil.addListener( aplicar );
	}

	// La creatividad puede cambiar de alto al rotar o al cargar: se vuelve a medir.
	if ( pie && 'ResizeObserver' in window ) {
		new ResizeObserver( medir ).observe( pie );
	}
	window.addEventListener( 'load', medir );
}() );
