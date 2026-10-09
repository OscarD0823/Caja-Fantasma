# Caja Fantasma 1.16.2

## Conexión del celular más sencilla

- En Android, la dirección del PC ahora se introduce mediante cuatro bloques para la IP y un bloque independiente para el puerto.
- Los campos aceptan únicamente números, avanzan entre bloques y señalan cualquier valor incompleto o fuera de rango.
- También se puede pegar una dirección completa como `192.168.1.20:47183`; la aplicación la separa automáticamente.
- Windows presenta por separado la IP, el puerto y el código de seis números.

## Red local y tiempos públicos

- Se reforzaron las pruebas del intercambio directo PC–Android en ambas direcciones y el rechazo de códigos incorrectos.
- La conexión continúa limitada a direcciones privadas y no utiliza Firebase ni una nube para los datos personales.
- La sección Dispositivos muestra la espera, duración activa y transición que están aplicadas actualmente.
- Los cambios de tiempo, fase y rueda publicados por el administrador se comprueban al abrir, cada 30 segundos, al recuperar Internet y al regresar a la aplicación, tanto en Windows como en Android.
- El estado guardado también se reconcilia con la configuración pública más reciente para evitar que un contador anterior permanezca activo.
