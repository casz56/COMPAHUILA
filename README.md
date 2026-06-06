# COMPAH — Compras Públicas de Alimentos del Huila v2.1

Prototipo funcional institucional para seguimiento de compras públicas locales de alimentos, trazabilidad contractual, oferta agroalimentaria territorial y cumplimiento de la Ley 2046 de 2020.

## Versión 2.1

Mejoras principales:

- Integración de identidad visual Compra Local Huila con 4 aplicaciones de marca.
- Logo principal incorporado en login, home, sidebar y topbar.
- Nueva sección de identidad visual dentro de la pantalla de inicio.
- Dashboard gerencial rediseñado.
- KPIs ejecutivos con lectura dinámica.
- Gráficos de barra interactivos en HTML/CSS/JS.
- Panel de lectura gerencial que cambia según indicador, barra o alerta seleccionada.
- Mapa Leaflet mejorado con filtros por producto, región, municipio y tipo de actor.
- Nueva pestaña de municipios con ficha municipal y enfoque en mapa.
- Pestañas internas: Vista territorial, Municipios, Oferta y demanda, Brechas.
- Módulo de productos rediseñado con panel integrado no invasivo de lectura agroalimentaria.
- Alertas compactas tipo tarjetas ejecutivas.
- Botón flotante inferior derecho con accesos rápidos.
- Centro inteligente COMPAH con atajo Ctrl + K.
- Mejoras de autosize/autoscale, responsive, microinteracciones y limpieza visual.

## Archivos

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `assets/logo-infihuila.png`
- `assets/logo-gobernacion-huila.png`
- `assets/logo-compra-local-horizontal.png`
- `assets/logo-compra-local-isotipo.png`
- `assets/logo-compra-local-verde.png`
- `assets/logo-compra-local-stack.png`

## Uso

Abrir `index.html` en navegador o desde Visual Studio Code con Live Server.

Usuario demo: `admin.compah@huila.gov.co`  
Contraseña demo: `demo2026`

## Nota jurídica

COMPAH es un prototipo funcional. No reemplaza SECOP II ni los procedimientos de contratación pública. El registro en la plataforma no constituye adjudicación contractual ni obligación de compra.


## Ajustes v2.1
- Corrección robusta del mapa Leaflet: CSS local crítico, recreación segura, límite de zoom y ajuste a límites del Huila.
- Dashboard con tipografía auto size/auto scale, títulos sin remontarse y valores KPI sin desbordamiento.
- Login institucional con fondo tipo campo huilense en asset local SVG y overlay sobrio.
- Mejoras responsive y de armonía visual para paneles, botones y tarjetas.

## Ajustes v2.1 — Identidad visual
- Se trabajó sobre la base v2.0.1 solicitada.
- Se integraron las cuatro propuestas de logo como activos del aplicativo.
- Se mantuvo la estabilidad del mapa y el autoscale logrado en la versión base.
- Se añadió un bloque de identidad para presentar usos de marca: principal, icono, institucional y compacto.
