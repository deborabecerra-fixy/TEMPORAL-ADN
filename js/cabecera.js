/**
 * Cabecera: buscador y «Volver arriba» (TEMA-018, TEMA-023). Vanilla, sin dependencias.
 *
 * - Buscador: con el campo vacío no envía, muestra el aviso (role="alert") y enfoca el campo;
 *   al enviar con texto el botón dice «Buscando…» y se deshabilita.
 * - Móvil (<= 900 px): el formulario pasa a ser la primera fila del panel del menú.
 * - Volver arriba: aparece tras bajar 800 px, sube (suave salvo movimiento reducido) y deja el
 *   foco en #contenido.
 */
( function () {
	'use strict';

	var textos = window.sicCabecera || {};
	var form = document.querySelector( '.sic-buscador' );

	if ( form ) {
		var campo = form.querySelector( '.sic-buscador__campo' );
		var boton = form.querySelector( '.sic-buscador__boton' );
		var aviso = form.querySelector( '.sic-buscador__aviso' );
		var etiquetaBoton = boton ? boton.querySelector( 'span' ) : null;
		var movil = window.matchMedia( '(max-width: 900px)' );
		var fila = form.parentNode;

		form.addEventListener( 'submit', function ( e ) {
			if ( campo.value.trim() === '' ) {
				e.preventDefault();
				aviso.textContent = textos.vacio || 'Escribe qué quieres buscar.';
				aviso.hidden = false;
				campo.setAttribute( 'aria-invalid', 'true' );
				campo.focus();
				return;
			}
			if ( etiquetaBoton ) {
				etiquetaBoton.textContent = textos.cargando || 'Buscando…';
			}
			// Deshabilitar después del envío: un botón deshabilitado antes no entra en el formulario.
			window.setTimeout( function () {
				boton.disabled = true;
			}, 0 );
		} );

		campo.addEventListener( 'input', function () {
			aviso.hidden = true;
			aviso.textContent = '';
			campo.removeAttribute( 'aria-invalid' );
		} );

		// Al volver con el botón «atrás» la página puede venir de la caché con «Buscando…».
		window.addEventListener( 'pageshow', function () {
			boton.disabled = false;
			if ( etiquetaBoton ) {
				etiquetaBoton.textContent = boton.getAttribute( 'data-texto' ) || 'Buscar';
			}
		} );

		var ubicar = function () {
			var dialogo = document.querySelector( '.sic-nav__dialogo' );
			if ( movil.matches && dialogo ) {
				if ( form.parentNode !== dialogo ) {
					dialogo.insertBefore( form, dialogo.querySelector( '.sic-nav__lista' ) );
				}
			} else if ( form.parentNode !== fila ) {
				fila.appendChild( form );
			}
		};
		// cabecera.js depende de nav.js (inc/buscador.php): el diálogo ya existe cuando el DOM está listo.
		// Con JS diferido por un optimizador el script puede correr ya en «interactive»: se ubica de una vez.
		if ( document.readyState !== 'loading' ) {
			ubicar();
		} else {
			document.addEventListener( 'DOMContentLoaded', ubicar );
		}
		if ( movil.addEventListener ) {
			movil.addEventListener( 'change', ubicar );
		} else if ( movil.addListener ) {
			movil.addListener( ubicar );
		}
	}

	/* ---------- Banner de sic-consent: «Volver arriba» y la barra de compartir se apilan sobre él ---------- */

	var raiz = document.documentElement;
	var medirBanner = function () {
		var banner = document.getElementById( 'sic-consent' );
		var alto = banner && ! banner.hidden ? banner.offsetHeight : 0;
		raiz.style.setProperty( '--sic-banner-alto', alto + 'px' );
	};
	var vigilarBanner = function () {
		var banner = document.getElementById( 'sic-consent' );
		medirBanner();
		if ( banner && window.MutationObserver ) {
			new MutationObserver( medirBanner ).observe( banner, { attributes: true, attributeFilter: [ 'hidden', 'class', 'style' ] } );
		}
		window.addEventListener( 'resize', medirBanner, { passive: true } );
	};
	if ( document.readyState !== 'loading' ) {
		vigilarBanner();
	} else {
		document.addEventListener( 'DOMContentLoaded', vigilarBanner );
	}

	var arriba = document.querySelector( '.sic-arriba' );
	if ( arriba ) {
		arriba.setAttribute( 'data-js', '' );
		var reducido = window.matchMedia( '(prefers-reduced-motion: reduce)' );
		var pendiente = false;

		var actualizar = function () {
			pendiente = false;
			arriba.classList.toggle( 'is-visible', window.pageYOffset > 800 );
		};
		window.addEventListener( 'scroll', function () {
			if ( ! pendiente ) {
				pendiente = true;
				window.requestAnimationFrame( actualizar );
			}
		}, { passive: true } );
		actualizar();

		arriba.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			window.scrollTo( { top: 0, left: 0, behavior: reducido.matches ? 'auto' : 'smooth' } );
			var contenido = document.getElementById( 'contenido' );
			if ( contenido ) {
				contenido.focus( { preventScroll: true } );
			}
		} );
	}
}() );
