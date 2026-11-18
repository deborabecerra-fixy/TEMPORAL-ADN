/**
 * Ticker de Última hora (TEMA-019): un titular a la vez, escrito letra por
 * letra (efecto máquina de escribir). Sin jQuery.
 *
 * Ciclo (un único temporizador encadenado, nunca dos a la vez):
 *   escribir (35 ms por carácter) → mantener completo 4 s → fundido breve →
 *   siguiente titular.
 *
 * - Botón «Pausar titulares» (aria-pressed): congela todo donde está (a mitad
 *   de la escritura o de la espera) y al reanudar sigue desde ese punto.
 * - Puntero encima o foco dentro: el titular se completa al instante para
 *   poder leerlo o abrirlo, y el ciclo espera; al salir sigue con la espera.
 *   No reinicia la escritura.
 * - prefers-reduced-motion: titular completo, sin escritura ni rotación.
 * - Lectores de pantalla: cada enlace lleva el titular completo en un texto
 *   oculto a la vista; las letras que se van escribiendo son aria-hidden, así
 *   que nunca se anuncian una a una. Los enlaces originales no cambian.
 */
( function () {
	'use strict';

	var barra = document.querySelector( '.sic-barra' );
	if ( ! barra ) {
		return;
	}
	var items = barra.querySelectorAll( '.sic-ticker__item' );
	var boton = barra.querySelector( '.sic-ticker__pausa' );
	var ticker = barra.querySelector( '.sic-ticker' );
	var lista = barra.querySelector( '.sic-ticker__lista' );
	var textos = window.sicBarra || {};
	var reducido = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	var MS_POR_CARACTER = 35;
	var MS_COMPLETO = 4000;
	var MS_FUNDIDO = 220;

	var actual = 0;
	var temporizador = null;
	var fase = 'escribiendo';   // escribiendo | completo | saliendo
	var escritos = 0;           // caracteres visibles del titular actual
	var esperaRestante = MS_COMPLETO;
	var esperaDesde = 0;
	var pausadoPorBoton = false;
	var pausadoPorHover = false;
	var pausadoPorFoco = false;

	barra.setAttribute( 'data-js', '' );

	if ( ! items.length ) {
		return;
	}

	/* ---------- Preparar cada titular ---------- */

	var titulares = Array.prototype.map.call( items, function ( item ) {
		var enlace = item.querySelector( 'a' );
		var completo = enlace ? enlace.textContent.trim() : '';
		var visible = null;
		if ( enlace ) {
			enlace.textContent = '';
			var leido = document.createElement( 'span' );
			leido.className = 'sic-ticker__completo';
			leido.textContent = completo;
			visible = document.createElement( 'span' );
			visible.className = 'sic-ticker__escrito';
			visible.setAttribute( 'aria-hidden', 'true' );
			visible.textContent = completo;
			enlace.appendChild( leido );
			enlace.appendChild( visible );
		}
		return {
			visible: visible,
			// Array.from respeta tildes y símbolos compuestos (₲, ñ, etc.).
			caracteres: Array.from ? Array.from( completo ) : completo.split( '' )
		};
	} );

	function pintar( cantidad ) {
		var t = titulares[ actual ];
		if ( t.visible ) {
			t.visible.textContent = t.caracteres.slice( 0, cantidad ).join( '' );
		}
	}

	/* ---------- Temporizador único ---------- */

	function limpiar() {
		if ( temporizador ) {
			window.clearTimeout( temporizador );
			temporizador = null;
		}
	}

	function programar( ms, accion ) {
		limpiar();
		temporizador = window.setTimeout( function () {
			temporizador = null;
			accion();
		}, ms );
	}

	function pausado() {
		return pausadoPorBoton || pausadoPorHover || pausadoPorFoco;
	}

	function rota() {
		return items.length > 1 && ! reducido.matches;
	}

	/* ---------- Fases ---------- */

	function escribir() {
		fase = 'escribiendo';
		var total = titulares[ actual ].caracteres.length;
		if ( escritos >= total ) {
			completar();
			return;
		}
		escritos += 1;
		pintar( escritos );
		programar( MS_POR_CARACTER, escribir );
	}

	function completar() {
		fase = 'completo';
		escritos = titulares[ actual ].caracteres.length;
		pintar( escritos );
		esperaRestante = MS_COMPLETO;
		esperar();
	}

	function esperar() {
		fase = 'completo';
		if ( ! rota() ) {
			return;
		}
		esperaDesde = Date.now();
		programar( esperaRestante, salir );
	}

	function salir() {
		fase = 'saliendo';
		if ( lista ) {
			lista.classList.add( 'is-saliendo' );
		}
		programar( MS_FUNDIDO, siguiente );
	}

	// Cambia al titular siguiente (vacío, listo para escribirse).
	function cambiar() {
		items[ actual ].classList.remove( 'is-activo' );
		pintar( titulares[ actual ].caracteres.length ); // el que se va queda entero
		actual = ( actual + 1 ) % items.length;
		escritos = 0;
		pintar( 0 );
		items[ actual ].classList.add( 'is-activo' );
		if ( lista ) {
			lista.classList.remove( 'is-saliendo' );
		}
		fase = 'escribiendo';
	}

	function siguiente() {
		cambiar();
		escribir();
	}

	/* ---------- Pausa y reanudación ---------- */

	function congelar() {
		if ( fase === 'completo' && temporizador && esperaDesde ) {
			esperaRestante = Math.max( 0, esperaRestante - ( Date.now() - esperaDesde ) );
		}
		limpiar();
	}

	function continuar() {
		if ( pausado() ) {
			return;
		}
		if ( fase === 'escribiendo' ) {
			if ( reducido.matches ) {
				completar();
			} else {
				escribir();
			}
		} else if ( fase === 'completo' ) {
			esperar();
		} else {
			siguiente();
		}
	}

	function actualizar() {
		congelar();
		// Pausa durante el fundido: se completa el cambio de titular y se
		// espera ahí (sin quedar a medio fundir).
		if ( fase === 'saliendo' && pausado() ) {
			cambiar();
		}
		// Puntero o foco encima: mostrar el titular entero para poder leerlo.
		if ( ( pausadoPorHover || pausadoPorFoco ) && fase === 'escribiendo' ) {
			fase = 'completo';
			escritos = titulares[ actual ].caracteres.length;
			pintar( escritos );
			esperaRestante = MS_COMPLETO;
		}
		continuar();
	}

	// Puntero y foco sobre los titulares (no sobre el botón de pausa: así el
	// botón congela la escritura justo donde está).
	var zona = lista || ticker;
	if ( zona ) {
		zona.addEventListener( 'mouseenter', function () {
			pausadoPorHover = true;
			actualizar();
		} );
		zona.addEventListener( 'mouseleave', function () {
			pausadoPorHover = false;
			actualizar();
		} );
		zona.addEventListener( 'focusin', function () {
			pausadoPorFoco = true;
			actualizar();
		} );
		zona.addEventListener( 'focusout', function () {
			window.setTimeout( function () {
				pausadoPorFoco = zona.contains( document.activeElement );
				actualizar();
			}, 0 );
		} );
	}

	if ( boton ) {
		boton.addEventListener( 'click', function () {
			pausadoPorBoton = boton.getAttribute( 'aria-pressed' ) !== 'true';
			boton.setAttribute( 'aria-pressed', pausadoPorBoton ? 'true' : 'false' );
			boton.textContent = pausadoPorBoton ? ( textos.reanudar || boton.textContent ) : ( textos.pausar || boton.textContent );
			actualizar();
		} );
	}

	function alCambiarMovimiento() {
		congelar();
		if ( reducido.matches ) {
			completar();
		} else {
			continuar();
		}
	}
	if ( reducido.addEventListener ) {
		reducido.addEventListener( 'change', alCambiarMovimiento );
	} else if ( reducido.addListener ) {
		reducido.addListener( alCambiarMovimiento );
	}

	/* ---------- Arranque ---------- */

	Array.prototype.forEach.call( items, function ( item, i ) {
		if ( item.classList.contains( 'is-activo' ) ) {
			actual = i;
		}
	} );

	if ( reducido.matches ) {
		completar();
	} else {
		escritos = 0;
		pintar( 0 );
		escribir();
	}
}() );
