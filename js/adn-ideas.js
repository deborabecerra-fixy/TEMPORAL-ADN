/**
 * ADN Empresarial — «Ideas para mover tu negocio» (microsección de la portada).
 *
 * Única lista de artículos de profundidad: para sumar uno nuevo, se crea su
 * página en /ideas (copiando una existente) y se agrega su entrada acá.
 * La portada muestra los tres más recientes (por fecha). Sin JS, la sección
 * queda oculta.
 */
( function () {
	'use strict';

	var ARTICULOS = [
		{
			"url": "ideas/antes-de-invertir-valida-que-alguien-quiera-comprar.html",
			"categoria": "Emprendimientos",
			"tipo": "Guía",
			"titulo": "Antes de invertir, validá que alguien quiera comprar",
			"descripcion": "Cómo comprobar que existe una necesidad real y alguien dispuesto a pagar antes de comprometer dinero en stock, desarrollo o publicidad.",
			"imagen": "images/ideas/validar.svg",
			"alt": "Ilustración de varias señales que convergen en una sola, marcada como validada.",
			"minutos": 5,
			"fecha": "2026-11-17"
		},
		{
			"url": "ideas/vender-mas-no-siempre-es-crecer.html",
			"categoria": "Empresas",
			"tipo": "Análisis",
			"titulo": "Vender más no siempre es crecer: mirá el margen antes de acelerar",
			"descripcion": "Por qué el volumen de ventas y el margen cuentan historias distintas, y qué revisar antes de invertir para vender más.",
			"imagen": "images/ideas/margen.svg",
			"alt": "Ilustración de un gráfico con barras de ventas que suben y una línea de margen que se mantiene plana.",
			"minutos": 4,
			"fecha": "2026-11-17"
		},
		{
			"url": "ideas/automatizar-sin-complicarse.html",
			"categoria": "Tecnología",
			"tipo": "Guía",
			"titulo": "Automatizar sin complicarse: por dónde empezar en una pyme",
			"descripcion": "Cómo elegir el primer proceso para automatizar, probarlo en pequeño y cuidar los datos y a las personas en el camino.",
			"imagen": "images/ideas/automatizar.svg",
			"alt": "Ilustración de un proceso en pasos conectados, con un paso central automatizado.",
			"minutos": 4,
			"fecha": "2026-11-17"
		}
	];

	var seccion = document.getElementById( 'ideas' );
	var lista = seccion && seccion.querySelector( '.adn-ideas__lista' );
	if ( ! seccion || ! lista ) {
		return;
	}

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

	ARTICULOS.slice().sort( function ( a, b ) {
		return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0;
	} ).slice( 0, 3 ).forEach( function ( art ) {
		var li = crear( 'li', 'adn-ideas__item' );
		var tarjeta = crear( 'article', 'adn-ideas__tarjeta' );

		var fig = crear( 'a', 'adn-ideas__imagen' );
		fig.href = art.url;
		fig.tabIndex = -1;
		fig.setAttribute( 'aria-hidden', 'true' );
		var img = document.createElement( 'img' );
		img.src = art.imagen;
		img.alt = '';
		img.width = 1200;
		img.height = 675;
		img.loading = 'lazy';
		img.decoding = 'async';
		fig.appendChild( img );
		tarjeta.appendChild( fig );

		var cuerpo = crear( 'div', 'adn-ideas__cuerpo' );
		var rotulo = crear( 'p', 'adn-ideas__rotulo' );
		rotulo.appendChild( crear( 'span', 'adn-ideas__categoria', art.categoria ) );
		rotulo.appendChild( crear( 'span', 'adn-ideas__tipo', art.tipo ) );
		cuerpo.appendChild( rotulo );

		var h3 = crear( 'h3', 'adn-ideas__titulo' );
		var enlace = crear( 'a', '', art.titulo );
		enlace.href = art.url;
		h3.appendChild( enlace );
		cuerpo.appendChild( h3 );

		cuerpo.appendChild( crear( 'p', 'adn-ideas__descripcion', art.descripcion ) );
		cuerpo.appendChild( crear( 'p', 'adn-ideas__lectura', art.minutos + ' min de lectura' ) );

		tarjeta.appendChild( cuerpo );
		li.appendChild( tarjeta );
		lista.appendChild( li );
	} );

	seccion.hidden = false;
}() );
