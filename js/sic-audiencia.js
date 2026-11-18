/**
 * Contador de audiencia propio.
 *
 * No identifica a nadie:
 *  - No pone cookies ni guarda nada permanente.
 *  - El identificador de pestaña es aleatorio, vive en `sessionStorage` y
 *    muere al cerrarla. No sirve para reconocer a nadie en otra visita.
 *  - No se manda la dirección IP (el servidor tampoco la guarda) ni ningún
 *    dato del lector: solo la ruta de la página y si es móvil o escritorio.
 *
 * Manda un primer aviso al cargar (eso es la página vista) y luego un latido
 * cada minuto MIENTRAS la pestaña esté a la vista, que es lo que alimenta el
 * «cuánta gente hay ahora». Si el lector se va a otra pestaña, el latido para:
 * una pestaña olvidada al fondo no es un lector.
 */
( function () {
	'use strict';

	var config = window.sicAudiencia || {};

	if ( ! config.endpoint ) {
		return;
	}

	var CLAVE_TOKEN = 'sic_aud_token';
	var CLAVE_SESION = 'sic_aud_sesion';
	var temporizador = null;

	/** Identificador aleatorio de esta pestaña. Nada que ver con la persona. */
	function token() {
		try {
			var guardado = window.sessionStorage.getItem( CLAVE_TOKEN );

			if ( guardado && /^[a-f0-9]{32}$/.test( guardado ) ) {
				return guardado;
			}

			var nuevo = aleatorio();
			window.sessionStorage.setItem( CLAVE_TOKEN, nuevo );
			return nuevo;
		} catch ( e ) {
			// Navegación privada o almacenamiento bloqueado: se usa uno de
			// usar y tirar. La visita se cuenta igual.
			return aleatorio();
		}
	}

	function aleatorio() {
		var bytes = new Uint8Array( 16 );

		if ( window.crypto && window.crypto.getRandomValues ) {
			window.crypto.getRandomValues( bytes );
		} else {
			for ( var i = 0; i < 16; i++ ) {
				bytes[ i ] = Math.floor( Math.random() * 256 );
			}
		}

		return Array.prototype.map
			.call( bytes, function ( b ) {
				return ( '0' + b.toString( 16 ) ).slice( -2 );
			} )
			.join( '' );
	}

	/** ¿Es la primera página de esta visita? */
	function esSesionNueva() {
		try {
			if ( window.sessionStorage.getItem( CLAVE_SESION ) ) {
				return false;
			}

			window.sessionStorage.setItem( CLAVE_SESION, '1' );
			return true;
		} catch ( e ) {
			return true;
		}
	}

	function enviar( datos ) {
		var cuerpo = JSON.stringify( datos );

		try {
			if ( navigator.sendBeacon ) {
				navigator.sendBeacon( config.endpoint, new Blob( [ cuerpo ], { type: 'application/json' } ) );
				return;
			}

			fetch( config.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: cuerpo,
				keepalive: true
			} );
		} catch ( e ) {
			// Si la medición falla, la página sigue funcionando. Nunca al revés.
		}
	}

	var identificador = token();

	function base( esVista ) {
		return {
			token: identificador,
			ruta: window.location.pathname,
			titulo: config.titulo || document.title,
			dispositivo: window.matchMedia( '(max-width: 991px)' ).matches ? 'movil' : 'escritorio',
			vista: !! esVista,
			sesion: false
		};
	}

	function arrancar() {
		var primera = base( true );
		primera.sesion = esSesionNueva();
		enviar( primera );

		latir();
	}

	/** Latido solo mientras la pestaña se ve. */
	function latir() {
		parar();

		if ( document.hidden ) {
			return;
		}

		temporizador = window.setInterval( function () {
			if ( document.hidden ) {
				return;
			}

			enviar( base( false ) );
		}, ( config.latido || 60 ) * 1000 );
	}

	function parar() {
		if ( temporizador ) {
			window.clearInterval( temporizador );
			temporizador = null;
		}
	}

	document.addEventListener( 'visibilitychange', function () {
		if ( document.hidden ) {
			parar();
		} else {
			latir();
		}
	} );

	window.addEventListener( 'pagehide', parar );

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', arrancar );
	} else {
		arrancar();
	}
}() );
