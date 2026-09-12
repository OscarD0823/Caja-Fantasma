# Auditoría del instalador de Caja Fantasma

Revisión actualizada para la versión 1.12.0 sobre el script NSIS generado por Tauri.

## Qué instala

- El ejecutable `Caja Fantasma · Once Human.exe` en la carpeta de aplicaciones del usuario actual.
- El desinstalador generado por NSIS.
- Accesos directos de Caja Fantasma en el menú Inicio y, cuando se selecciona, en el Escritorio.
- Las entradas estándar de Windows para mostrar la aplicación en “Aplicaciones instaladas” y permitir desinstalarla.

Las imágenes de Lunar, Abismo de Gravedad, Progenie Aberrante, la caja y el recurso WebP transparente del Riftwalker están compiladas dentro del ejecutable; no se instalan como programas independientes.

El catálogo de 1.825 módulos también forma parte del paquete y se carga únicamente al abrir “Mods Brillantes”; no instala una base de datos, un servicio ni un proceso separado.

## Dependencia de Windows

La interfaz de Tauri necesita Microsoft Edge WebView2. El instalador comprueba si ya existe y no hace nada si está disponible. Si falta, descarga y ejecuta silenciosamente el bootstrapper oficial desde `go.microsoft.com`. Esta es la única descarga ajena al propio instalador.

## Qué no instala

- Ningún programa adicional.
- Ningún servicio o controlador de Windows.
- Ninguna extensión del navegador.
- Ninguna tarea programada.
- Ningún componente de telemetría.
- Ninguna de las capturas antiguas de varios megabytes usadas para la Ballena.

El inicio con Windows es una opción de Caja Fantasma y se registra para el usuario actual mediante la función de autoarranque de la propia aplicación.

## Firmas

El actualizador de Caja Fantasma exige la firma Minisign de Tauri antes de aceptar una actualización. Esa firma protege el paquete dentro del flujo de actualización de la aplicación. El ejecutable NSIS no dispone actualmente de una firma Authenticode comercial de Windows, por lo que SmartScreen puede mostrar una advertencia de editor desconocido aunque la firma del actualizador sea válida.
