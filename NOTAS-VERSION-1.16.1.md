# Caja Fantasma 1.16.1

## Dispositivos y versión visibles

- La versión instalada aparece junto al nombre del programa y dentro de una ficha accesible para todas las personas.
- Sincronización PC–Android y descarga de la APK se movieron desde Configuración a la nueva sección lateral **Dispositivos**.
- La nueva sección muestra la versión del catálogo, la Rueda Visional publicada, quién realizó el cambio y la fecha de la última publicación.
- Se añadió un botón para comprobar inmediatamente las publicaciones del administrador.
- Windows y Android reciben la rueda, sus recompensas, puntos, tiempos y transiciones desde el mismo catálogo público. Ambos lo comprueban al abrir, cada 30 segundos, al recuperar Internet y al volver a la aplicación.
- La sincronización de datos personales por red local continúa separada del catálogo público y no usa Firebase ni nube.

## Actualizaciones en Windows y Android

- Un único manifiesto de GitHub Releases anuncia los paquetes de Windows y Android de la misma versión.
- Windows conserva la actualización firmada y el reinicio automático.
- Android comprueba versiones al abrir, cada 15 minutos y al volver a la aplicación; descarga la APK oficial, valida su SHA-256 y abre la confirmación de instalación del sistema.
- La firma propia de Android debe coincidir con la aplicación instalada. Android exige una confirmación final y, la primera vez, puede pedir habilitar «Instalar apps desconocidas» para Caja Fantasma.
