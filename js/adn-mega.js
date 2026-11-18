/**
 * ADN Empresarial — Mega menú editorial por categoría.
 *
 * Fuente de datos: las notas que la propia página ya publica (los bloques
 * .wp-block-post que genera WordPress). Para cada categoría del menú se buscan
 * las notas cuyo enlace de categoría coincide con el del ítem, se ordenan por
 * fecha y se toman las 3 más recientes. Nada se copia a mano: si una nota
 * cambia en WordPress, cambia su previsualización.
 *
 * El comportamiento (teclado, Escape, clic fuera, diálogo móvil) lo resuelve
 * nav.js con su patrón disclosure: aquí solo se arma el marcado que espera
 * (li.sic-tiene-panel > a + button.sic-nav__subtoggle + .sic-mega).
 *
 * Sin JS no pasa nada: el menú sigue enlazando a cada categoría y las
 * secciones de la portada siguen visibles.
 */
( function () {
	'use strict';

	var nav = document.getElementById( 'sic-nav' );
	var lista = nav && nav.querySelector( '.sic-nav__lista' );
	if ( ! nav || ! lista ) {
		return;
	}

	var MAX_NOTAS = 3;
	var ancho = window.matchMedia( '(min-width: 901px)' );

	function normalizar( url ) {
		try {
			var u = new URL( url, document.baseURI );
			return u.origin + u.pathname.replace( /\/+$/, '' );
		} catch ( e ) {
			return String( url || '' ).replace( /\/+$/, '' );
		}
	}

	// Elige la variante más chica del srcset que siga siendo nítida para una miniatura.
	function miniatura( img ) {
		var mejor = null;
		( img.getAttribute( 'srcset' ) || '' ).split( ',' ).forEach( function ( parte ) {
			var p = parte.trim().split( /\s+/ );
			var w = parseInt( p[ 1 ], 10 );
			if ( p[ 0 ] && w >= 280 && ( ! mejor || w < mejor.w ) ) {
				mejor = { url: p[ 0 ], w: w };
			}
		} );
		return mejor ? mejor.url : img.getAttribute( 'src' );
	}

	/* ---------- 1. Leer las notas de la página ---------- */

	var porCategoria = {};
	var vistas = {};

	Array.prototype.forEach.call( document.querySelectorAll( '#contenido .wp-block-post' ), function ( post ) {
		var titulo = post.querySelector( '.wp-block-post-title a' );
		if ( ! titulo ) {
			return;
		}
		var url = normalizar( titulo.href );
		var img = post.querySelector( '.wp-block-post-featured-image img' );
		var tiempo = post.querySelector( '.wp-block-post-date time' );
		var nota = {
			url: titulo.href,
			titulo: titulo.textContent.trim(),
			img: img ? miniatura( img ) : '',
			fecha: tiempo ? tiempo.textContent.trim() : '',
			iso: tiempo ? tiempo.getAttribute( 'datetime' ) || '' : ''
		};
		Array.prototype.forEach.call( post.querySelectorAll( '.wp-block-post-terms a' ), function ( cat ) {
			var clave = normalizar( cat.href );
			vistas[ clave ] = vistas[ clave ] || {};
			if ( vistas[ clave ][ url ] ) {
				return;
			}
			vistas[ clave ][ url ] = true;
			( porCategoria[ clave ] = porCategoria[ clave ] || [] ).push( nota );
		} );
	} );

	/* ---------- 2. Armar un panel por ítem del menú ---------- */

	function crear( tag, clase, texto ) {
		var el = document.createElement( tag );
		if ( clase ) {
			el.className = clase;
		}
		if ( texto ) {
			el.textContent = texto;
		}
		return el;
	}

	var armados = 0;

	Array.prototype.forEach.call( lista.children, function ( item, i ) {
		var enlace = item.querySelector( ':scope > a' );
		if ( ! enlace || item.querySelector( ':scope > .sic-mega' ) ) {
			return;
		}
		var notas = ( porCategoria[ normalizar( enlace.href ) ] || [] ).slice();
		if ( ! notas.length ) {
			return;
		}
		notas.sort( function ( a, b ) {
			return a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0;
		} );
		notas = notas.slice( 0, MAX_NOTAS );

		var nombre = enlace.textContent.trim();
		var id = 'adn-mega-' + ( item.id || i );

		var panel = crear( 'div', 'sic-mega adn-mega' );
		panel.id = id;
		panel.setAttribute( 'data-columnas', String( notas.length ) );

		var cabeza = crear( 'div', 'adn-mega__cabeza' );
		cabeza.appendChild( crear( 'p', 'adn-mega__categoria', nombre ) );
		var todo = crear( 'a', 'adn-mega__todo', 'Ver todas las noticias' );
		todo.href = enlace.href;
		todo.setAttribute( 'aria-label', 'Ver todas las noticias de ' + nombre );
		cabeza.appendChild( todo );
		panel.appendChild( cabeza );

		var ul = crear( 'ul', 'adn-mega__notas' );
		ul.setAttribute( 'aria-label', 'Últimas noticias de ' + nombre );
		notas.forEach( function ( n ) {
			var li = crear( 'li', 'adn-mega__nota' );
			var a = crear( 'a', 'adn-mega__enlace' );
			a.href = n.url;
			if ( n.img ) {
				var fig = crear( 'span', 'adn-mega__imagen' );
				var im = document.createElement( 'img' );
				im.src = n.img;
				im.alt = '';
				im.loading = 'lazy';
				im.decoding = 'async';
				im.width = 300;
				im.height = 169;
				fig.appendChild( im );
				a.appendChild( fig );
			}
			var txt = crear( 'span', 'adn-mega__texto' );
			txt.appendChild( crear( 'span', 'adn-mega__titulo', n.titulo ) );
			if ( n.fecha ) {
				var t = crear( 'time', 'adn-mega__fecha', n.fecha );
				if ( n.iso ) {
					t.setAttribute( 'datetime', n.iso );
				}
				txt.appendChild( t );
			}
			a.appendChild( txt );
			li.appendChild( a );
			ul.appendChild( li );
		} );
		panel.appendChild( ul );

		// Botón disclosure que nav.js ya sabe manejar (acordeón en móvil).
		var boton = crear( 'button', 'sic-nav__subtoggle' );
		boton.type = 'button';
		boton.setAttribute( 'aria-expanded', 'false' );
		boton.setAttribute( 'aria-controls', id );
		boton.setAttribute( 'data-abrir', 'Mostrar noticias de ' + nombre );
		boton.setAttribute( 'data-cerrar', 'Ocultar noticias de ' + nombre );
		boton.setAttribute( 'aria-label', 'Mostrar noticias de ' + nombre );
		boton.appendChild( crear( 'span', 'sic-nav__chevron' ) ).setAttribute( 'aria-hidden', 'true' );

		item.classList.add( 'sic-tiene-panel' );
		enlace.setAttribute( 'aria-controls', id );
		enlace.setAttribute( 'aria-expanded', 'false' );
		item.insertBefore( boton, enlace.nextSibling );
		item.appendChild( panel );

		// El enlace refleja el estado del botón (en escritorio el botón no se ve
		// y es el propio enlace el que abre el panel).
		new MutationObserver( function () {
			enlace.setAttribute( 'aria-expanded', boton.getAttribute( 'aria-expanded' ) );
		} ).observe( boton, { attributes: true, attributeFilter: [ 'aria-expanded' ] } );

		armados++;
	} );

	if ( ! armados ) {
		return;
	}

	// nav.js: con esta clase, el clic en el nombre de la categoría abre su panel
	// (Ctrl/Cmd/clic central siguen abriendo la categoría en otra pestaña).
	document.body.classList.add( 'sic-menu-abre-panel' );
	// Habilita los estilos del mega menú y oculta las secciones repetidas de la portada.
	document.documentElement.classList.add( 'adn-mega-activo' );

	/* ---------- 3. Detalles de interacción ---------- */

	function abiertos() {
		return lista.querySelectorAll( ':scope > li.is-abierto > .sic-nav__subtoggle' );
	}

	// Escape en escritorio: el botón está oculto, así que el foco vuelve al enlace.
	nav.addEventListener( 'keydown', function ( e ) {
		if ( e.key !== 'Escape' || ! ancho.matches ) {
			return;
		}
		var item = document.activeElement && document.activeElement.closest( '.sic-tiene-panel' );
		window.setTimeout( function () {
			if ( item && ! item.classList.contains( 'is-abierto' ) ) {
				var a = item.querySelector( ':scope > a' );
				if ( a ) {
					a.focus();
				}
			}
		}, 0 );
	} );

	// Al pasar el mouse a otra categoría, el panel abierto por clic cede su lugar.
	lista.addEventListener( 'mouseover', function ( e ) {
		if ( ! ancho.matches ) {
			return;
		}
		var item = e.target.closest && e.target.closest( '.sic-nav__lista > li' );
		Array.prototype.forEach.call( abiertos(), function ( b ) {
			if ( item && b.parentNode !== item ) {
				b.click();
			}
		} );
	} );

	// Menú móvil: tocar fuera del panel lo cierra (no durante el fundido de
	// cierre, que lo volvería a abrir).
	document.addEventListener( 'click', function ( e ) {
		var dialogo = nav.querySelector( '.sic-nav__dialogo' );
		var toggle = dialogo && dialogo.querySelector( '.sic-nav__toggle' );
		if ( ! dialogo || ! toggle || toggle.getAttribute( 'aria-expanded' ) !== 'true' ) {
			return;
		}
		if ( ! dialogo.contains( e.target ) ) {
			toggle.click();
		}
	} );
}() );
