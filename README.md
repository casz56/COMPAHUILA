# COMPAH — Compras Públicas de Alimentos del Huila v1.7

Prototipo funcional institucional para conectar productores locales, organizaciones ACFC, operadores, supervisores y entidades compradoras en el marco de la Ley 2046 de 2020.

## Revisión integral realizada

Se tomó como base la versión 1.5 y se realizó una revisión funcional, visual y de experiencia de usuario para consolidar una versión más estable, limpia y premium.

## Mejoras v1.7

- Validación básica del desarrollo web: estructura, vistas principales, mapa, dashboard, catálogo, reportes y componentes críticos.
- Nuevo botón flotante interactivo en la parte inferior derecha con accesos rápidos a registro, mapa, compras, dashboard y reporte Ley 2046.
- Layout más limpio y ejecutivo, con predominio de blanco y reducción de carga visual.
- Corrección adicional de autosize/autoscale en KPIs para evitar desbordamientos en cifras largas.
- KPI cards con jerarquía más gerencial, menos negrilla pesada y lectura más elegante.
- Catálogo de productos más interactivo con filtros por categoría, tarjetas mejor estructuradas y navegación directa al mapa.
- Mejora responsive para escritorio, tablet y móvil.
- Conservación del mapa estilo Día E Huila con enfoque territorial, marcadores y lectura dinámica.
- Botón flotante oculto antes del login y disponible dentro del aplicativo.

## Estructura

- `index.html`: estructura de la aplicación.
- `styles.css`: estilos institucionales, responsive y componentes v1.7.
- `app.js`: lógica de navegación, indicadores, mapa, reportes, validación y botón flotante.
- `data.js`: datos simulados de municipios, productores, productos, contratos y compras.
- `assets/`: logos institucionales.

## Uso

Abre `index.html` en el navegador o ejecuta con Live Server desde Visual Studio Code.

Datos de ingreso demo:

- Usuario: `admin.compah@huila.gov.co`
- Contraseña: `demo2026`
- Rol: cualquiera de los disponibles.

## Nota jurídica

El registro en COMPAH no constituye adjudicación, habilitación contractual ni obligación de compra. La plataforma es un instrumento de información, articulación, trazabilidad y seguimiento de compras públicas locales de alimentos. No reemplaza SECOP II ni los procedimientos de contratación pública.
