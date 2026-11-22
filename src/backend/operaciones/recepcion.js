import { randomUUID } from 'node:crypto';
import { exigir, requerir } from '../validaciones.js';

export function registrarCliente(base, datos, esRecepcion) {
  exigir(esRecepcion, 'Solo Recepción o Administración registra clientes.');
  requerir(datos, ['nombre', 'telefono', 'correo']);
  exigir(/^\d{10}$/.test(datos.telefono), 'El teléfono debe tener 10 dígitos.');
  exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo), 'Correo inválido.');
  exigir(
    !base.clientes.some(
      (cliente) =>
        cliente.telefono === datos.telefono ||
        cliente.correo.toLowerCase() === datos.correo.toLowerCase(),
    ),
    'Cliente duplicado.',
  );
  base.clientes.push({
    id: randomUUID(),
    nombre: datos.nombre,
    telefono: datos.telefono,
    correo: datos.correo,
  });
}

export function registrarEquipo(base, datos, esRecepcion) {
  exigir(esRecepcion, 'Solo Recepción o Administración registra equipos.');
  requerir(datos, ['idCliente', 'marca', 'modelo', 'serie', 'especificaciones']);
  exigir(
    base.clientes.some((cliente) => cliente.id === datos.idCliente),
    'Cliente inexistente.',
  );
  exigir(
    !base.equipos.some((equipo) => equipo.serie.toLowerCase() === datos.serie.toLowerCase()),
    'Número de serie duplicado.',
  );
  const { idCliente, marca, modelo, serie, especificaciones } = datos;
  base.equipos.push({ id: randomUUID(), idCliente, marca, modelo, serie, especificaciones });
}
