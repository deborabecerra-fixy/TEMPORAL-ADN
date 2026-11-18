/**
 * ADN Empresarial — «Visión empresarial» y «Pulso de los negocios».
 *
 * Visión empresarial: elige 3 notas reales de esta misma página (los bloques
 * .wp-block-post que genera WordPress), sin copiar contenido a mano:
 *   1. descarta las que ya están en el bloque principal (apertura y secundarias);
 *   2. se queda con las de categorías de negocios (Empresas, Expansión,
 *      Emprendimientos, Tecnología), en ese orden de prioridad;
 *   3. ordena por fecha (más recientes primero) y procura que no se repita la
 *      categoría hasta completar 3.
 *
 * Pulso de los negocios: los valores del dólar se leen de la barra «Mercados»
 * (.adn-divisas), que ya trae WordPress. Los indicadores sin fuente conectada
 * quedan en «—»: no se inventan cifras.
 */
( function () {
	'use strict';

	var seccion = document.querySelector( '.adn-vision' );
	var lista = seccion && seccion.querySelector( '.adn-vision__notas' );
	var pulso = document.querySelector( '.adn-pulso' );

	// El Pulso vive en la columna lateral y no depende de las tarjetas.
	llenarPulso();

	if ( ! seccion || ! lista ) {
		return;
	}

	var PRIORIDAD = [ 'empresas', 'expansion', 'emprendimientos', 'tecnologia' ];
	var CANTIDAD = 3;

	function slugCategoria( href ) {
		var m = /\/category\/([^/]+)/.exec( href || '' );
		return m ? m[ 1 ] : '';
	}

	/* ---------- 1. Notas candidatas ---------- */

	var destacadas = {};
	Array.prototype.forEach.call(
		document.querySelectorAll( '#contenido :is(.pia-apertura, .pia-secundarias) .wp-block-post-title a' ),
		function ( a ) {
			destacadas[ a.href ] = true;
		}
	);

	var vistas = {};
	var candidatas = [];
	Array.prototype.forEach.call( document.querySelectorAll( '#contenido .wp-block-post' ), function ( post ) {
		var titulo = post.querySelector( '.wp-block-post-title a' );
		if ( ! titulo || destacadas[ titulo.href ] || vistas[ titulo.href ] ) {
			return;
		}
		var cat = post.querySelector( '.wp-block-post-terms a' );
		var slug = cat ? slugCategoria( cat.href ) : '';
		var rango = PRIORIDAD.indexOf( slug );
		if ( rango < 0 ) {
			return;
		}
		vistas[ titulo.href ] = true;
		var img = post.querySelector( '.wp-block-post-featured-image img' );
		var tiempo = post.querySelector( '.wp-block-post-date time' );
		candidatas.push( {
			url: titulo.href,
			titulo: titulo.textContent.trim(),
			categoria: cat.textContent.trim(),
			categoriaUrl: cat.href,
			slug: slug,
			rango: rango,
			img: img,
			fecha: tiempo ? tiempo.textContent.trim() : '',
			iso: tiempo ? tiempo.getAttribute( 'datetime' ) || '' : ''
		} );
	} );

	candidatas.sort( function ( a, b ) {
		if ( a.iso !== b.iso ) {
			return a.iso < b.iso ? 1 : -1;
		}
		return a.rango - b.rango;
	} );

	// Primero una por categoría; si faltan, se completa por fecha.
	var elegidas = [];
	var usadas = {};
	candidatas.forEach( function ( n ) {
		if ( elegidas.length < CANTIDAD && ! usadas[ n.slug ] ) {
			usadas[ n.slug ] = true;
			elegidas.push( n );
		}
	} );
	candidatas.forEach( function ( n ) {
		if ( elegidas.length < CANTIDAD && elegidas.indexOf( n ) < 0 ) {
			elegidas.push( n );
		}
	} );

	if ( ! elegidas.length ) {
		return;
	}

	/* ---------- 2. Tarjetas ---------- */

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

	elegidas.forEach( function ( n ) {
		var li = crear( 'li', 'adn-vision__nota' );
		var art = crear( 'article', 'adn-vision__tarjeta' );

		if ( n.img ) {
			var fig = crear( 'a', 'adn-vision__imagen' );
			fig.href = n.url;
			fig.tabIndex = -1;
			fig.setAttribute( 'aria-hidden', 'true' );
			var im = document.createElement( 'img' );
			im.src = n.img.getAttribute( 'src' );
			if ( n.img.getAttribute( 'srcset' ) ) {
				im.srcset = n.img.getAttribute( 'srcset' );
				im.sizes = '(max-width: 700px) 100vw, (max-width: 1100px) 33vw, 280px';
			}
			im.alt = '';
			im.loading = 'lazy';
			im.decoding = 'async';
			im.width = 640;
			im.height = 360;
			fig.appendChild( im );
			art.appendChild( fig );
		}

		var cuerpo = crear( 'div', 'adn-vision__cuerpo' );
		var cat = crear( 'a', 'adn-vision__categoria', n.categoria );
		cat.href = n.categoriaUrl;
		cuerpo.appendChild( cat );

		var h3 = crear( 'h3', 'adn-vision__titular' );
		var a = crear( 'a', '', n.titulo );
		a.href = n.url;
		h3.appendChild( a );
		cuerpo.appendChild( h3 );

		if ( n.fecha ) {
			var t = crear( 'time', 'adn-vision__fecha', n.fecha );
			if ( n.iso ) {
				t.setAttribute( 'datetime', n.iso );
			}
			cuerpo.appendChild( t );
		}

		art.appendChild( cuerpo );
		li.appendChild( art );
		lista.appendChild( li );
	} );

	seccion.hidden = false;

	/* ---------- 3. Pulso: dólar desde la barra «Mercados» ---------- */

	function llenarPulso() {
		if ( ! pulso ) {
			return;
		}

		var divisas = {};
		Array.prototype.forEach.call( document.querySelectorAll( '.adn-divisas__item' ), function ( item ) {
			var nombre = item.querySelector( '.adn-divisas__nombre' );
			var valor = item.querySelector( '.adn-divisas__valor' );
			if ( nombre && valor ) {
				divisas[ nombre.textContent.trim() ] = valor.textContent.trim();
			}
		} );
		var hora = document.querySelector( '.adn-divisas__hora time' );
		var fechaDivisas = '';
		if ( hora ) {
			var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec( hora.getAttribute( 'datetime' ) || '' );
			fechaDivisas = iso ? iso[ 3 ] + '/' + iso[ 2 ] + '/' + iso[ 1 ] : hora.textContent.trim();
		}

		Array.prototype.forEach.call( pulso.querySelectorAll( '.adn-pulso__item[data-divisa]' ), function ( item ) {
			var valor = divisas[ item.getAttribute( 'data-divisa' ) ];
			if ( ! valor ) {
				// Sin dato en la barra: se marca pendiente en lugar de mostrar un número.
				item.classList.add( 'is-pendiente' );
				return;
			}
			item.querySelector( '.adn-pulso__valor' ).textContent = valor;
			if ( fechaDivisas ) {
				var periodo = item.querySelector( '.adn-pulso__periodo' );
				periodo.textContent = 'Venta · ' + fechaDivisas;
			}
		} );

		pulso.hidden = false;
	}
}() );
