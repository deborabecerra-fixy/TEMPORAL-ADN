/**
 * Rotación y medición de los huecos publicitarios.
 *
 * Cuatro reglas, en este orden:
 *
 *  1. El orden es aleatorio en cada visita. El servidor manda las piezas
 *     siempre iguales (la página está en caché); el sorteo se hace aquí.
 *  2. La misma marca no abre en dos huecos a la vez. Se reparten las marcas
 *     entre los huecos de la pantalla antes de encender nada; solo se
 *     repite si hay menos marcas que huecos.
 *  3. Cada pieza dura sus segundos en pantalla y pasa a la siguiente.
 *  4. El reloj solo corre cuando el hueco se ve. Si el lector no ha bajado
 *     hasta ahí, o se fue a otra pestaña, no se le quema la pauta al
 *     anunciante.
 *
 * La impresión se cuenta cuando la pieza estuvo 1 segundo con más de la
 * mitad en pantalla — el estándar del mercado. Todo se acumula en memoria
 * y se manda de una sola vez al salir de la página.
 */
( function () {
	'use strict';

	var config = window.sicAds || {};
	var MOVIL = window.matchMedia( '(max-width: 991px)' );
	var VISIBLE_MINIMO = 0.5;   // Mitad de la superficie en pantalla.
	var SEGUNDO_UTIL = 1000;    // Tiempo continuo para contar la impresión.

	var acumulado = {};   // clave -> métricas pendientes de enviar.
	var carruseles = [];

	/**
	 * Barajado con cuota: una pieza de cuota 10 entra al sorteo diez veces.
	 * No es "las de más cuota primero" sino "las de más cuota más a menudo":
	 * si fuera un orden fijo, el anunciante de cuota 1 nunca abriría.
	 */
	function barajarConCuota( piezas ) {
		var bolsa = [];

		piezas.forEach( function ( pieza ) {
			var peso = parseInt( pieza.dataset.peso, 10 ) || 5;
			var i;

			for ( i = 0; i < peso; i++ ) {
				bolsa.push( pieza );
			}
		} );

		var orden = [];

		while ( bolsa.length && orden.length < piezas.length ) {
			var elegida = bolsa[ Math.floor( Math.random() * bolsa.length ) ];

			if ( orden.indexOf( elegida ) === -1 ) {
				orden.push( elegida );
			}

			bolsa = bolsa.filter( function ( p ) {
				return p !== elegida;
			} );
		}

		return orden;
	}

	/**
	 * Reparte las marcas entre los huecos: rota el orden de cada carrusel
	 * hasta que su primera pieza sea de una marca que no haya abierto ya en
	 * otro hueco. Si todas las marcas están tomadas, se deja como está: es
	 * preferible repetir marca a dejar un hueco en blanco.
	 */
	function repartirMarcas( lista ) {
		var tomadas = [];

		lista.forEach( function ( carrusel ) {
			var intentos = 0;

			while ( intentos < carrusel.orden.length ) {
				var marca = carrusel.orden[ 0 ].dataset.anunciante;

				if ( marca === '0' || tomadas.indexOf( marca ) === -1 ) {
					break;
				}

				carrusel.orden.push( carrusel.orden.shift() );
				intentos++;
			}

			var abre = carrusel.orden[ 0 ].dataset.anunciante;

			if ( abre !== '0' ) {
				tomadas.push( abre );
			}
		} );
	}

	/**
	 * Clave de acumulación: una fila por creativo, hueco y dispositivo.
	 */
	function clave( pieza ) {
		return pieza.dataset.creativo + '|' + pieza.dataset.posicion + '|' + ( MOVIL.matches ? 'movil' : 'escritorio' );
	}

	function registro( pieza ) {
		var k = clave( pieza );

		if ( ! acumulado[ k ] ) {
			acumulado[ k ] = {
				creativo: parseInt( pieza.dataset.creativo, 10 ),
				posicion: pieza.dataset.posicion,
				dispositivo: MOVIL.matches ? 'movil' : 'escritorio',
				servidas: 0,
				visibles: 0,
				clics: 0,
				segundos: 0,
				// Se acumula en milisegundos y se convierte a segundos una
				// sola vez, al enviar. Redondear en cada vuelta del reloj
				// (250 ms) daba siempre 0 y el tiempo en pantalla nunca
				// llegaba al informe.
				ms: 0,
				primera_vez: primeraVezHoy( pieza.dataset.creativo )
			};
		}

		return acumulado[ k ];
	}

	/**
	 * ¿Es la primera vez que este navegador ve este creativo hoy? Es la
	 * aproximación a "personas alcanzadas". No identifica a nadie: guarda
	 * una fecha por creativo y se borra sola.
	 */
	function primeraVezHoy( creativoId ) {
		var hoy = new Date().toISOString().slice( 0, 10 );
		var k = 'sic_ads_visto_' + creativoId;

		try {
			if ( window.localStorage.getItem( k ) === hoy ) {
				return false;
			}

			window.localStorage.setItem( k, hoy );
		} catch ( e ) {
			// Navegación privada o almacenamiento bloqueado: se cuenta como
			// nueva. Sobrestima el alcance, y eso es preferible a caerse.
			return true;
		}

		return true;
	}

	/**
	 * Carga la imagen que corresponde al ancho actual. Solo se descarga la
	 * de la pieza que se va a mostrar.
	 */
	function cargarImagen( pieza ) {
		var img = pieza.querySelector( '.sic-ads__img' );

		if ( ! img ) {
			return;
		}

		var deseada = MOVIL.matches ? ( img.dataset.srcMovil || img.dataset.src ) : img.dataset.src;

		if ( deseada && img.getAttribute( 'src' ) !== deseada ) {
			img.setAttribute( 'src', deseada );
		}
	}

	function Carrusel( nodo ) {
		this.nodo = nodo;
		this.piezas = Array.prototype.slice.call( nodo.querySelectorAll( '.sic-ads__pieza' ) );
		this.orden = barajarConCuota( this.piezas );
		this.indice = 0;
		this.enPantalla = false;
		this.desde = 0;          // Momento en que la pieza actual se hizo visible.
		this.acumuladoMs = 0;    // Tiempo visible de la pieza actual.
		this.contada = false;    // Si ya se contó su impresión visible.
		this.temporizador = null;
	}

	Carrusel.prototype.actual = function () {
		return this.orden[ this.indice ];
	};

	Carrusel.prototype.mostrar = function ( indice ) {
		var pieza = this.orden[ indice ];

		if ( ! pieza ) {
			return;
		}

		this.orden.forEach( function ( p ) {
			p.hidden = p !== pieza;
		} );

		this.indice = indice;
		this.acumuladoMs = 0;
		this.contada = false;
		this.desde = this.enPantalla ? Date.now() : 0;

		cargarImagen( pieza );
		registro( pieza ).servidas += 1;

		// Precarga la siguiente para que el cambio no parpadee.
		var siguiente = this.orden[ ( indice + 1 ) % this.orden.length ];

		if ( siguiente && siguiente !== pieza ) {
			var img = siguiente.querySelector( '.sic-ads__img' );

			if ( img && ! img.getAttribute( 'src' ) ) {
				var pre = new Image();
				pre.src = MOVIL.matches ? ( img.dataset.srcMovil || img.dataset.src ) : img.dataset.src;
			}
		}
	};

	/**
	 * Suma el tiempo que la pieza lleva visible y cuenta la impresión en
	 * cuanto pasa del segundo.
	 */
	Carrusel.prototype.acumular = function () {
		if ( ! this.desde ) {
			return;
		}

		var transcurrido = Date.now() - this.desde;
		this.acumuladoMs += transcurrido;
		this.desde = Date.now();

		var pieza = this.actual();

		if ( ! pieza ) {
			return;
		}

		var reg = registro( pieza );
		reg.ms += transcurrido;

		if ( ! this.contada && this.acumuladoMs >= SEGUNDO_UTIL ) {
			reg.visibles += 1;
			this.contada = true;
		}
	};

	Carrusel.prototype.arrancar = function () {
		if ( this.temporizador || this.orden.length < 2 ) {
			return;
		}

		var self = this;

		this.temporizador = window.setInterval( function () {
			self.acumular();

			var pieza = self.actual();
			var duracion = ( parseInt( pieza.dataset.duracion, 10 ) || 5 ) * 1000;

			// El paso solo cuenta el tiempo que la pieza estuvo VISIBLE.
			if ( self.acumuladoMs >= duracion ) {
				self.mostrar( ( self.indice + 1 ) % self.orden.length );
			}
		}, 250 );
	};

	Carrusel.prototype.parar = function () {
		if ( this.temporizador ) {
			window.clearInterval( this.temporizador );
			this.temporizador = null;
		}
	};

	Carrusel.prototype.entra = function () {
		if ( this.enPantalla ) {
			return;
		}

		this.enPantalla = true;
		this.desde = Date.now();
		this.arrancar();
	};

	Carrusel.prototype.sale = function () {
		if ( ! this.enPantalla ) {
			return;
		}

		this.acumular();
		this.enPantalla = false;
		this.desde = 0;
		this.parar();
	};

	function iniciar() {
		var huecos = document.querySelectorAll( '.sic-ads:not(.sic-ads--casa)' );

		if ( ! huecos.length ) {
			return;
		}

		Array.prototype.forEach.call( huecos, function ( nodo ) {
			var carrusel = new Carrusel( nodo );

			if ( carrusel.orden.length ) {
				carruseles.push( carrusel );
			}
		} );

		repartirMarcas( carruseles );

		carruseles.forEach( function ( carrusel ) {
			carrusel.mostrar( 0 );
			carrusel.nodo.dataset.listo = '1';
		} );

		observarVisibilidad();
		observarClics();
		observarSalida();
	}

	function observarVisibilidad() {
		if ( ! ( 'IntersectionObserver' in window ) ) {
			// Sin IntersectionObserver se rota igual, pero no se cuentan
			// impresiones visibles: mejor un informe corto que uno inflado.
			carruseles.forEach( function ( c ) {
				c.enPantalla = true;
				c.arrancar();
			} );
			return;
		}

		var observador = new IntersectionObserver(
			function ( entradas ) {
				entradas.forEach( function ( entrada ) {
					var carrusel = carruseles.filter( function ( c ) {
						return c.nodo === entrada.target;
					} )[ 0 ];

					if ( ! carrusel ) {
						return;
					}

					if ( entrada.isIntersecting && entrada.intersectionRatio >= VISIBLE_MINIMO ) {
						carrusel.entra();
					} else {
						carrusel.sale();
					}
				} );
			},
			{ threshold: [ 0, VISIBLE_MINIMO, 1 ] }
		);

		carruseles.forEach( function ( c ) {
			observador.observe( c.nodo );
		} );

		document.addEventListener( 'visibilitychange', function () {
			if ( document.hidden ) {
				carruseles.forEach( function ( c ) {
					c.sale();
				} );
			}
		} );
	}

	function observarClics() {
		document.addEventListener(
			'click',
			function ( evento ) {
				var pieza = evento.target.closest ? evento.target.closest( '.sic-ads__pieza' ) : null;

				if ( ! pieza ) {
					return;
				}

				registro( pieza ).clics += 1;

				// Se manda ya: el lector se va a otra pestaña y puede cerrar
				// esta antes de que salte el envío de salida.
				enviar();
			},
			true
		);
	}

	function observarSalida() {
		var despedida = function () {
			carruseles.forEach( function ( c ) {
				c.acumular();
			} );
			enviar();
		};

		window.addEventListener( 'pagehide', despedida );
		document.addEventListener( 'visibilitychange', function () {
			if ( document.hidden ) {
				despedida();
			}
		} );
	}

	function enviar() {
		if ( config.medir === false || ! config.endpoint ) {
			return;
		}

		var eventos = [];

		Object.keys( acumulado ).forEach( function ( k ) {
			var reg = acumulado[ k ];

			if ( reg.servidas || reg.visibles || reg.clics ) {
				reg.segundos = Math.round( reg.ms / 1000 );
				delete reg.ms;
				eventos.push( reg );
			}
		} );

		if ( ! eventos.length ) {
			return;
		}

		acumulado = {};

		var cuerpo = JSON.stringify( { eventos: eventos } );

		if ( navigator.sendBeacon ) {
			navigator.sendBeacon( config.endpoint, new Blob( [ cuerpo ], { type: 'application/json' } ) );
			return;
		}

		try {
			fetch( config.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: cuerpo,
				keepalive: true
			} );
		} catch ( e ) {
			// Si la medición falla, el anuncio sigue viéndose. Nunca al revés.
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', iniciar );
	} else {
		iniciar();
	}
}() );
