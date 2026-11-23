import React from 'react';
import { Link } from 'react-router';

export default function NotFound({ titulo = 'No encontramos esa pantalla' }) {
  return (
    <section>
      <h2>{titulo}</h2>
      <Link to="/dashboard">Volver al inicio de TecnoFix</Link>
    </section>
  );
}
