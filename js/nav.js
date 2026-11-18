/**
 * Menú principal por teclado (TEMA-006). Vanilla, sin dependencias.
 *
 * - Submenús y mega menú: patrón disclosure. El botón hermano del enlace alterna aria-expanded;
 *   Escape cierra y devuelve el foco al botón; salir del ítem con Tab lo cierra.
 * - Móvil (<= 900 px): el <nav> se convierte en diálogo modal al abrirse: role="dialog",
 *   aria-modal, resto de la página con inert, foco atrapado, Escape cierra y el foco vuelve al botón.
 *   Al cerrar, el diálogo lleva .is-cerrando durante el fundido de salida (250 ms) y recién
 *   después pierde .is-abierto: no desaparece de golpe. Con prefers-reduced-motion, cierre inmediato.
 */
( function () {
	'use strict';

	var nav = document.getElementById( 'sic-nav' );
	var lista = nav && nav.querySelector( '.sic-nav__lista' );
	if ( ! nav || ! lista ) {
		return;
	}

	var textos = window.sicNav || {};
	var movil = window.matchMedia( '(max-width: 900px)' );
	var enfocables = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	nav.setAttribute( 'data-js', '' );
	if ( ! lista.id ) {
		lista.id = 'sic-nav-lista';
	}

	/* ---------- Submenús ---------- */

	function fijar( boton, abrir ) {
		var item = boton.closest( 'li' );
		if ( item ) {
			item.classList.toggle( 'is-abierto', abrir );
		}
		boton.setAttribute( 'aria-expanded', abrir ? 'true' : 'false' );
		var etiqueta = abrir ? boton.getAttribute( 'data-cerrar' ) : boton.getAttribute( 'data-abrir' );
		if ( etiqueta ) {
			boton.setAttribute( 'aria-label', etiqueta );
		}
	}

	function botonesAbiertos() {
		return Array.prototype.slice.call( nav.querySelectorAll( '.sic-nav__subtoggle[aria-expanded="true"]' ) );
	}

	function cerrarSubmenus( salvo ) {
		botonesAbiertos().forEach( function ( b ) {
			if ( b !== salvo ) {
				fijar( b, false );
			}
		} );
	}

	nav.addEventListener( 'click', function ( e ) {
		var boton = e.target.closest ? e.target.closest( '.sic-nav__subtoggle' ) : null;
		if ( ! boton || ! nav.contains( boton ) ) {
			return;
		}
		var abrir = boton.getAttribute( 'aria-expanded' ) !== 'true';
		cerrarSubmenus( boton );
		fijar( boton, abrir );
	} );

	// menu_abre_panel: el clic en el nombre de una sección con panel lo abre en vez de navegar. Se deja
	// pasar el clic con Ctrl, Cmd, Shift o botón central (abrir en otra pestaña). El panel lleva su
	// enlace «Ver todo en…».
	nav.addEventListener( 'click', function ( e ) {
		if ( ! document.body.classList.contains( 'sic-menu-abre-panel' ) ) {
			return;
		}
		if ( e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ) {
			return;
		}
		var enlace = e.target.closest ? e.target.closest( 'a' ) : null;
		var item = enlace ? enlace.parentNode : null;
		if ( ! item || item.parentNode !== lista || ! item.classList.contains( 'sic-tiene-panel' ) ) {
			return;
		}
		var boton = item.querySelector( ':scope > .sic-nav__subtoggle' );
		if ( ! boton ) {
			return;
		}
		e.preventDefault();
		boton.click();
	} );

	// Tab que sale del ítem lo cierra.
	nav.addEventListener( 'focusout', function ( e ) {
		var item = e.target.closest ? e.target.closest( 'li.is-abierto' ) : null;
		if ( item && e.relatedTarget && ! item.contains( e.relatedTarget ) ) {
			var b = item.querySelector( ':scope > .sic-nav__subtoggle' );
			if ( b ) {
				fijar( b, false );
			}
		}
	} );

	// Un clic fuera cierra los submenús.
	document.addEventListener( 'click', function ( e ) {
		if ( ! nav.contains( e.target ) ) {
			cerrarSubmenus( null );
		}
	} );

	/* ---------- Menú móvil como diálogo ---------- */

	var toggle = document.createElement( 'button' );
	toggle.type = 'button';
	toggle.className = 'sic-nav__toggle';
	toggle.setAttribute( 'aria-expanded', 'false' );
	toggle.setAttribute( 'aria-controls', lista.id );
	toggle.setAttribute( 'aria-label', textos.abrir || 'Abrir el menú' );
	var barras = document.createElement( 'span' );
	barras.className = 'sic-nav__barras';
	barras.setAttribute( 'aria-hidden', 'true' );
	toggle.appendChild( barras );
	// El diálogo es un contenedor propio: role="dialog" no está permitido sobre <nav>.
	var dialogo = document.createElement( 'div' );
	dialogo.className = 'sic-nav__dialogo';
	nav.insertBefore( dialogo, lista );
	dialogo.appendChild( toggle );
	dialogo.appendChild( lista );

	var inertes = [];
	var menuAbierto = false;
	var DURACION_CIERRE = 250;
	var cierrePendiente = null;
	var movimientoReducido = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	function bloquearResto() {
		var nodo = dialogo;
		while ( nodo && nodo !== document.body ) {
			var padre = nodo.parentNode;
			if ( ! padre ) {
				break;
			}
			Array.prototype.forEach.call( padre.children, function ( hermano ) {
				if ( hermano !== nodo && ! hermano.inert && hermano.tagName !== 'SCRIPT' ) {
					hermano.inert = true;
					inertes.push( hermano );
				}
			} );
			nodo = padre;
		}
	}

	function liberarResto() {
		inertes.forEach( function ( n ) {
			n.inert = false;
		} );
		inertes = [];
	}

	function abrirMenu() {
		// Si se reabre durante el fundido de salida, se cancela el cierre.
		if ( cierrePendiente ) {
			window.clearTimeout( cierrePendiente );
			cierrePendiente = null;
		}
		dialogo.classList.remove( 'is-cerrando' );
		menuAbierto = true;
		dialogo.classList.add( 'is-abierto' );
		document.documentElement.classList.add( 'sic-menu-abierto' );
		dialogo.setAttribute( 'role', 'dialog' );
		dialogo.setAttribute( 'aria-modal', 'true' );
		dialogo.setAttribute( 'aria-label', textos.menu || 'Menú' );
		toggle.setAttribute( 'aria-expanded', 'true' );
		toggle.setAttribute( 'aria-label', textos.cerrar || 'Cerrar el menú' );
		bloquearResto();
		var primero = lista.querySelector( enfocables );
		( primero || toggle ).focus();
	}

	// Fin del cierre: se quita el estado visual (y se pliegan los acordeones)
	// cuando el panel ya no se ve, así no hay saltos de altura en el fundido.
	function terminarCierre() {
		cierrePendiente = null;
		cerrarSubmenus( null );
		dialogo.classList.remove( 'is-abierto', 'is-cerrando' );
		document.documentElement.classList.remove( 'sic-menu-abierto' );
	}

	function cerrarMenu( devolverFoco, inmediato ) {
		menuAbierto = false;
		if ( inmediato || movimientoReducido.matches || ! dialogo.classList.contains( 'is-abierto' ) ) {
			terminarCierre();
		} else if ( ! cierrePendiente ) {
			dialogo.classList.add( 'is-cerrando' );
			cierrePendiente = window.setTimeout( terminarCierre, DURACION_CIERRE );
		}
		dialogo.removeAttribute( 'role' );
		dialogo.removeAttribute( 'aria-modal' );
		dialogo.removeAttribute( 'aria-label' );
		toggle.setAttribute( 'aria-expanded', 'false' );
		toggle.setAttribute( 'aria-label', textos.abrir || 'Abrir el menú' );
		liberarResto();
		if ( devolverFoco ) {
			toggle.focus();
		}
	}

	toggle.addEventListener( 'click', function () {
		if ( menuAbierto ) {
			cerrarMenu( true );
		} else {
			abrirMenu();
		}
	} );

	var alCambiar = function () {
		if ( ! movil.matches && menuAbierto ) {
			cerrarMenu( false, true );
		}
	};
	if ( movil.addEventListener ) {
		movil.addEventListener( 'change', alCambiar );
	} else if ( movil.addListener ) {
		movil.addListener( alCambiar );
	}

	/* ---------- Teclado ---------- */

	// WCAG 1.4.13: Escape descarta también el panel abierto solo por hover; vuelve a abrirse al re-entrar.
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key !== 'Escape' ) {
			return;
		}
		Array.prototype.forEach.call( nav.querySelectorAll( 'li.sic-tiene-panel:hover' ), function ( item ) {
			item.classList.add( 'sic-descartado' );
		} );
	} );
	nav.addEventListener( 'mouseout', function ( e ) {
		var item = e.target.closest ? e.target.closest( 'li.sic-descartado' ) : null;
		if ( item && ! item.contains( e.relatedTarget ) ) {
			item.classList.remove( 'sic-descartado' );
		}
	} );

	function visibles() {
		return Array.prototype.filter.call( nav.querySelectorAll( enfocables ), function ( el ) {
			return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
		} );
	}

	nav.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' ) {
			// El submenú más profundo que contiene el foco (o el último abierto).
			var foco = document.activeElement;
			var abiertos = botonesAbiertos();
			var cierra = null;
			abiertos.forEach( function ( b ) {
				var item = b.closest( 'li' );
				if ( item && foco && item.contains( foco ) ) {
					cierra = b;
				}
			} );
			if ( cierra ) {
				fijar( cierra, false );
				cierra.focus();
				e.preventDefault();
				return;
			}
			if ( menuAbierto ) {
				cerrarMenu( true );
				e.preventDefault();
				return;
			}
			if ( abiertos.length ) {
				cerrarSubmenus( null );
			}
			return;
		}

		if ( e.key === 'Tab' && menuAbierto ) {
			var lista_ = visibles();
			if ( ! lista_.length ) {
				return;
			}
			var primero = lista_[ 0 ];
			var ultimo = lista_[ lista_.length - 1 ];
			if ( e.shiftKey && document.activeElement === primero ) {
				ultimo.focus();
				e.preventDefault();
			} else if ( ! e.shiftKey && document.activeElement === ultimo ) {
				primero.focus();
				e.preventDefault();
			}
		}
	} );
}() );
