import React from 'react';
import { Link } from 'react-router';

export default function NotFound() {
  return (
    <section>
      <h2>No encontramos esa pantalla</h2>
      <Link to="/dashboard">Volver al inicio de TecnoFix</Link>
    </section>
  );
}
