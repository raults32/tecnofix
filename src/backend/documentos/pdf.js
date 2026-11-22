const PAGINA = [595, 842];

/** Arma el archivo PDF a partir del contenido de sus páginas. */
export function crearDocumentoPdf(contenidos) {
  const objetos = ['', ''];
  const paginas = [];
  for (const flujo of contenidos) {
    const idPagina = objetos.length + 1;
    paginas.push(`${idPagina} 0 R`);
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.join(' ')}]
      /Resources << /Font <<
        /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>
        /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>
        /F3 << /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>
      >> >> /Contents ${idPagina + 1} 0 R >>`);
    objetos.push(`<< /Length ${Buffer.byteLength(flujo)} >>\nstream\n${flujo}\nendstream`);
  }
  objetos[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[1] = `<< /Type /Pages /Kids [${paginas.join(' ')}] /Count ${paginas.length} >>`;
  let archivo = '%PDF-1.4\n';
  const posiciones = [];
  objetos.forEach((objeto, indice) => {
    posiciones.push(Buffer.byteLength(archivo));
    archivo += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const inicioTabla = Buffer.byteLength(archivo);
  archivo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  archivo += posiciones
    .map((posicion) => `${String(posicion).padStart(10, '0')} 00000 n \n`)
    .join('');
  archivo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>
startxref\n${inicioTabla}\n%%EOF`;
  return Buffer.from(archivo);
}

const AZUL = '0.13 0.19 0.37';
const AZUL_MEDIO = '0.15 0.32 0.57';
const ACENTO = '0.93 0.56 0.19';
const FONDO = '0.94 0.96 0.99';
const BORDE = '0.84 0.88 0.94';
const GRIS = '0.31 0.39 0.51';
const BLANCO = '1 1 1';
const IZQUIERDA = 42;
const DERECHA = 553;
const ANCHO = DERECHA - IZQUIERDA;
const LIMITE = 780;
const LETRA = 10;
const INTERLINEADO = 14;

function anchoTexto(texto) {
  let ancho = 0;
  for (const letra of texto.normalize('NFD').replace(/\p{M}/gu, '')) {
    if (/[ilIjtfr .,:'!|]/.test(letra)) ancho += 0.38;
    else if (/[MWmw@%&]/.test(letra)) ancho += 1;
    else if (/[A-Z]/.test(letra)) ancho += 0.82;
    else ancho += 0.68;
  }
  return ancho * LETRA;
}

function envolver(texto, ancho) {
  const lineas = [];
  for (const parrafo of String(texto || '')
    .normalize('NFC')
    .trim()
    .split(/\r?\n/)) {
    let linea = '';
    for (let palabra of parrafo.trim().split(/\s+/)) {
      if (linea && anchoTexto(`${linea} ${palabra}`) > ancho) {
        lineas.push(linea);
        linea = '';
      }
      while (anchoTexto(palabra) > ancho) {
        const letras = [...palabra];
        let corte = 1;
        while (anchoTexto(letras.slice(0, corte + 1).join('')) <= ancho) corte += 1;
        lineas.push(letras.slice(0, corte).join(''));
        palabra = letras.slice(corte).join('');
      }
      linea = linea ? `${linea} ${palabra}` : palabra;
    }
    if (linea) lineas.push(linea);
  }
  return lineas.length ? lineas : ['-'];
}

function importe(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}

export function crearCotizacionPdf(orden, cliente, equipo) {
  const paginas = [];
  let comandos = [];
  let y;
  let encabezado;
  let altoEncabezado;
  let seccionPendiente;

  function texto(valor, x, arriba, tamano = LETRA, fuente = 'F1', color = AZUL) {
    const legible = String(valor)
      .normalize('NFC')
      .replace(/[^\x20-\x7e\xa0-\xff]/gu, '?');
    const hex = Buffer.from(legible, 'latin1').toString('hex');
    comandos.push(
      `BT /${fuente} ${tamano} Tf ${color} rg 1 0 0 1 ${x} ${PAGINA[1] - arriba} Tm <${hex}> Tj ET`,
    );
  }

  function rectangulo(x, arriba, ancho, alto, color) {
    comandos.push(`${color} rg ${x} ${PAGINA[1] - arriba - alto} ${ancho} ${alto} re f`);
  }

  function numero(valor, derecha, arriba, ancho, tamano = LETRA, color = AZUL) {
    const tamanoAjustado = Math.min(tamano, Math.floor(ancho / (String(valor).length * 0.6)));
    const x = derecha - String(valor).length * tamanoAjustado * 0.6;
    texto(valor, x, arriba, tamanoAjustado, 'F3', color);
  }

  function abrirPagina() {
    comandos = [];
    paginas.push(comandos);
    rectangulo(IZQUIERDA, 39, ANCHO, 86, AZUL);
    texto('TecnoFix', 61, 80, 27, 'F2', BLANCO);
    rectangulo(62, 88, 64, 3, ACENTO);
    texto('Servicio técnico de computadoras', 62, 108, 9, 'F1', BLANCO);
    texto('Cotización', 372, 89, 29, 'F2', BLANCO);
    rectangulo(IZQUIERDA, 798, ANCHO, 1, BORDE);
    texto(`TecnoFix  |  ${orden.folio}`, IZQUIERDA, 815, 9, 'F1', GRIS);
    numero(`Página ${paginas.length}`, DERECHA, 815, 90, 9, GRIS);
    y = 148;
  }

  function reservar(alto) {
    if (y + alto <= LIMITE) return;
    abrirPagina();
    seccionPendiente = Boolean(encabezado);
  }

  function seccion(titulo, dibujarColumnas) {
    altoEncabezado = dibujarColumnas ? 49 : 20;
    seccionPendiente = true;
    encabezado = () => {
      texto(titulo, IZQUIERDA, y + 10, 12, 'F2');
      y += 20;
      dibujarColumnas?.();
    };
  }

  function fila(lineas, dibujar, alterna) {
    let inicio = 0;
    while (inicio < lineas.length) {
      const minimo = Math.min(lineas.length - inicio, 3) * INTERLINEADO + 13;
      reservar(minimo + (seccionPendiente ? altoEncabezado : 0));
      if (seccionPendiente) {
        encabezado();
        seccionPendiente = false;
      }
      const espacio = Math.floor((LIMITE - y - 13) / INTERLINEADO);
      const parte = lineas.slice(inicio, inicio + espacio);
      const alto = parte.length * INTERLINEADO + 13;
      reservar(alto);
      rectangulo(IZQUIERDA, y, ANCHO, alto, alterna ? FONDO : BLANCO);
      rectangulo(IZQUIERDA, y + alto - 1, ANCHO, 1, BORDE);
      dibujar(parte, inicio === 0);
      y += alto;
      inicio += parte.length;
    }
  }

  abrirPagina();
  const fecha = orden.fechaCotizacion?.slice(0, 10).split('-').reverse().join('/');
  texto(`Folio  ${orden.folio}`, IZQUIERDA, y, 11, 'F2');
  texto(`Emisión  ${fecha || 'Sin fecha registrada'}`, 363, y, 10, 'F1', GRIS);
  y += 20;

  seccion('Datos del servicio');
  const datos = [
    ['Cliente', cliente?.nombre],
    ['Equipo', [equipo?.marca, equipo?.modelo].filter(Boolean).join(' ')],
    ['Número de serie', equipo?.serie],
  ];
  datos.forEach(([etiqueta, valor], indice) => {
    fila(
      envolver(valor, ANCHO - 152),
      (lineas) => {
        texto(etiqueta, IZQUIERDA + 12, y + 16, LETRA, 'F2');
        lineas.forEach((linea, i) => texto(linea, 180, y + 16 + i * INTERLINEADO));
      },
      indice % 2 === 0,
    );
  });

  y += 17;
  seccion('Diagnóstico');
  fila(
    envolver(orden.diagnostico, ANCHO - 24),
    (lineas) => {
      lineas.forEach((linea, i) => texto(linea, IZQUIERDA + 12, y + 16 + i * INTERLINEADO));
    },
    true,
  );

  y += 17;
  const concepto = 250;
  const cantidad = 52;
  const unitario = 102;
  const finCantidad = IZQUIERDA + concepto + cantidad;
  const finUnitario = finCantidad + unitario;
  seccion('Conceptos cotizados', () => {
    rectangulo(IZQUIERDA, y, ANCHO, 29, AZUL_MEDIO);
    texto('Concepto', IZQUIERDA + 12, y + 18, LETRA, 'F2', BLANCO);
    texto('Cant.', finCantidad - 35, y + 18, LETRA, 'F2', BLANCO);
    texto('Precio unitario', finUnitario - 81, y + 18, LETRA, 'F2', BLANCO);
    texto('Importe', DERECHA - 50, y + 18, LETRA, 'F2', BLANCO);
    y += 29;
  });
  const piezas = orden.piezas || [];
  const partidas = piezas.map((pieza) => {
    const precio = Math.round(pieza.costo * 100);
    return [pieza.nombre, pieza.cantidad, precio / 100, (precio * pieza.cantidad) / 100];
  });
  if (!piezas.length && (orden.refacciones || orden.costoRefacciones)) {
    partidas.push([
      orden.refacciones || 'Refacciones',
      1,
      orden.costoRefacciones,
      orden.costoRefacciones,
    ]);
  }
  partidas.push(['Mano de obra', 1, orden.manoObra, orden.manoObra]);
  partidas.forEach(([nombre, unidades, precio, total], indice) => {
    fila(
      envolver(nombre, concepto - 24),
      (lineas, primera) => {
        lineas.forEach((linea, i) => texto(linea, IZQUIERDA + 12, y + 16 + i * INTERLINEADO));
        if (primera) {
          numero(unidades, finCantidad - 12, y + 16, cantidad - 20);
          numero(importe(precio), finUnitario - 12, y + 16, unitario - 20);
          numero(importe(total), DERECHA - 12, y + 16, 87);
        }
      },
      indice % 2 === 0,
    );
  });

  encabezado = undefined;
  y += 17;
  reservar(135);
  const inicioResumen = 305;
  const anchoResumen = DERECHA - inicioResumen;
  rectangulo(inicioResumen, y, anchoResumen, 54, FONDO);
  rectangulo(inicioResumen, y + 54, anchoResumen, 38, AZUL);
  texto('Mano de obra', inicioResumen + 13, y + 17);
  texto('Refacciones', inicioResumen + 13, y + 42);
  texto('Total estimado (MXN)', inicioResumen + 13, y + 78, 11, 'F2', BLANCO);
  numero(importe(orden.manoObra), DERECHA - 13, y + 17, 100);
  numero(importe(orden.costoRefacciones), DERECHA - 13, y + 42, 100);
  numero(importe(orden.total), DERECHA - 13, y + 78, 100, 14, BLANCO);
  texto(
    'Vigencia: 7 días. Garantía de demostración: 30 días en mano de obra.',
    IZQUIERDA,
    y + 119,
    9,
    'F1',
    GRIS,
  );

  return crearDocumentoPdf(paginas.map((pagina) => pagina.join('\n')));
}
