# Caja Fantasma 1.17.1

## Corrección de sincronización

- Corregido el error de Windows `10035` que podía aparecer cuando el servidor intentaba leer una conexión del celular antes de que llegara su primera línea de datos.
- Las conexiones aceptadas se cambian explícitamente a modo bloqueante y conservan un límite de cuatro segundos, evitando tanto la lectura prematura como un bloqueo indefinido.
- Se mantienen la sincronización en vivo y los controles manuales **PC → Celular** y **Celular → PC**.
- Se añadió una prueba automática que conecta el celular de prueba, retrasa deliberadamente su primer envío y comprueba que el PC espere y responda correctamente.

## Compatibilidad

- Los datos locales, historiales, personajes y configuraciones de la versión 1.17.0 se conservan al actualizar.
- Continúa funcionando directamente por la red local o el anclaje USB, sin Firebase ni nube personal.
