/*
 * ADN Empresarial — fondo «mercado vivo», versión editorial (sobria).
 *
 * Tres líneas de cotización muy tenues avanzan despacio sobre una retícula
 * fija casi invisible. Sin relleno, sin punto que late, sin velas ni paralaje:
 * es un fondo, no un protagonista.
 *
 * Dónde se ve: solo en los márgenes laterales, fuera del contenedor editorial.
 * adn-marca.css enmascara el canvas en toda la franja del contenido, así que
 * ninguna línea pasa detrás de titulares, tarjetas ni anuncios. Por eso el
 * canvas solo se crea en pantallas con margen real (≥ 1280 px); en tablet y
 * celular el fondo es el verde plano del manual y no se gasta CPU.
 *
 * Contrato con el CSS: pone html.pix-fondo-activo (capas sobre el lienzo) y
 * crea canvas.pix-fondo solo en pantallas anchas. Sin JS o con
 * html.pix-liviano, el sitio queda con el fondo plano.
 *
 * Rendimiento: DPR máx. 1.5, ~24 fps, se pausa con la pestaña oculta o
 * cuando la pantalla se angosta.
 * prefers-reduced-motion: dibuja una sola vez y no anima.
 * Colores: copia de pia-brand-tokens.css (un canvas no lee CSS).
 */
(function () {
	'use strict';

	var LIMA = [204, 235, 83];   // --pia-cian (lima del manual)
	var FPS = 24;

	if (document.documentElement.classList.contains('pix-liviano')) return;
	if (document.querySelector('canvas.pix-fondo')) return;
	if (!window.matchMedia) return;

	var ancho = window.matchMedia('(min-width: 1280px)');
	var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var canvas = null, ctx = null;
	var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
	var W = 0, H = 0, t = 0, ultimo = 0, rafId = 0;

	function rgba(c, a) {
		return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
	}

	// Ruido 1D suave (suma de senos con fases fijas): curva de precio continua.
	function precio(x, semilla) {
		return (
			Math.sin(x * 0.0021 + semilla) * 0.45 +
			Math.sin(x * 0.0057 + semilla * 1.7) * 0.25 +
			Math.sin(x * 0.0133 + semilla * 2.3) * 0.10
		);
	}

	// Lejos → cerca: finas, tenues y lentas (px por segundo).
	var CAPAS = [
		{ semilla: 4.1, base: 0.34, amp: 0.08, vel: 2.0, ancho: 1, alfa: 0.07 },
		{ semilla: 9.7, base: 0.55, amp: 0.10, vel: 3.0, ancho: 1, alfa: 0.10 },
		{ semilla: 1.3, base: 0.74, amp: 0.09, vel: 4.5, ancho: 1.2, alfa: 0.14 }
	];

	function medir() {
		W = window.innerWidth;
		H = window.innerHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		canvas.style.width = W + 'px';
		canvas.style.height = H + 'px';
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function reticula() {
		var paso = 64;
		ctx.lineWidth = 1;
		ctx.strokeStyle = rgba(LIMA, 0.025);
		ctx.beginPath();
		for (var y = paso; y < H; y += paso) {
			ctx.moveTo(0, y + 0.5);
			ctx.lineTo(W, y + 0.5);
		}
		ctx.stroke();
	}

	function linea(capa) {
		var desplaza = t * capa.vel;
		var paso = 8;
		var y0 = H * capa.base;
		ctx.lineWidth = capa.ancho;
		ctx.lineJoin = 'round';
		ctx.strokeStyle = rgba(LIMA, capa.alfa);
		ctx.beginPath();
		for (var x = -paso; x <= W + paso; x += paso) {
			var y = y0 - precio(x + desplaza, capa.semilla) * H * capa.amp;
			if (x === -paso) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}

	function dibujar() {
		ctx.clearRect(0, 0, W, H);
		reticula();
		for (var i = 0; i < CAPAS.length; i++) linea(CAPAS[i]);
	}

	function cuadro(ahora) {
		rafId = requestAnimationFrame(cuadro);
		if (ahora - ultimo < 1000 / FPS) return;
		var dt = ultimo ? Math.min((ahora - ultimo) / 1000, 0.1) : 0;
		ultimo = ahora;
		t += dt;
		dibujar();
	}

	function animar() {
		if (quieto || rafId || document.hidden) return;
		ultimo = 0;
		rafId = requestAnimationFrame(cuadro);
	}

	function pausar() {
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
	}

	function iniciar() {
		if (!canvas) {
			canvas = document.createElement('canvas');
			ctx = canvas.getContext && canvas.getContext('2d');
			if (!ctx) {
				canvas = null;
				return;
			}
			canvas.className = 'pix-fondo';
			canvas.setAttribute('aria-hidden', 'true');
			document.body.insertBefore(canvas, document.body.firstChild);
		}
		document.documentElement.classList.add('pix-fondo-activo');
		medir();
		dibujar();
		animar();
	}

	function detener() {
		pausar();
		if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
		canvas = null;
		ctx = null;
	}

	// La clase se mantiene en todos los anchos: los estilos de capas y
	// transparencias que dependen de ella no cambian; solo falta el canvas.
	document.documentElement.classList.add('pix-fondo-activo');

	function segunAncho() {
		if (ancho.matches) iniciar();
		else detener();
	}

	segunAncho();
	if (ancho.addEventListener) ancho.addEventListener('change', segunAncho);
	else if (ancho.addListener) ancho.addListener(segunAncho);

	var reMedir = 0;
	window.addEventListener('resize', function () {
		clearTimeout(reMedir);
		reMedir = setTimeout(function () {
			if (!canvas) return;
			medir();
			dibujar();
		}, 150);
	}, { passive: true });

	document.addEventListener('visibilitychange', function () {
		if (!canvas) return;
		if (document.hidden) pausar();
		else animar();
	});
})();
