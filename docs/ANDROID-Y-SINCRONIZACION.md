# Android y sincronización directa PC–celular

## Decisión

Caja Fantasma puede reutilizar su interfaz React y su núcleo Tauri para generar una APK. No conviene copiar el paquete Android de Lankdea: aquel proyecto usa Python, Kivy y Buildozer, mientras Caja Fantasma usa React, TypeScript, Rust y Tauri 2.

La sincronización de Caja Fantasma no usará Firebase, servicios en la nube, cuentas ni servidores externos. Solo funcionará cuando la aplicación esté abierta simultáneamente en el PC y en el celular y exista una conexión local entre ambos. Los datos personales nunca se enviarán a GitHub.

## Conexión local implementada

El PC actúa como anfitrión temporal. Al pulsar **Compartir con el celular**, abre un servicio TCP local y muestra su dirección y un código de seis números. En la APK se escriben ambos valores y se pulsa **Conectar con el PC**. Al desactivar la función o cerrar el programa, el servicio deja de aceptar conexiones.

La ruta principal será una red local, sin necesitar Internet:

- ambos equipos conectados al mismo Wi-Fi;
- el celular conectado al punto de acceso de Windows; o
- USB tethering, que crea una red local por el cable USB sin activar depuración de Android.

Un cable USB en modo normal de carga o transferencia de archivos no crea por sí solo un canal entre aplicaciones. Hacer comunicación USB directa exigiría un complemento nativo basado en Android Open Accessory, permiso del usuario y compatibilidad del hardware. No se usará ADB ni se obligará a activar opciones de desarrollador. La primera versión empleará red local o USB tethering, que son más compatibles y siguen siendo completamente locales.

## Protocolo de vinculación actual

1. El PC intenta abrir el puerto `47183` y, si está ocupado, prueba los diez siguientes.
2. La aplicación genera un código aleatorio de seis números que puede cambiarse desde Windows.
3. El cliente solo acepta direcciones privadas, de enlace local o de bucle local; no permite enviar el historial a una IP pública.
4. Cada intercambio valida código, versión del protocolo, fecha, JSON y un límite máximo de 8 MB.
5. La instantánea con fecha más reciente se devuelve a ambos dispositivos. Los ajustes exclusivos de pantalla, el catálogo y las credenciales del administrador no forman parte de ella.
6. La APK comprueba cambios cada tres segundos y el PC cada segundo y medio mientras la opción siga activa.

El canal no se publica en Internet ni utiliza Firebase. En esta versión el contenido viaja dentro de la red local sin cifrado adicional, por lo que debe usarse únicamente en una red Wi-Fi de confianza o mediante USB tethering. El código evita accesos accidentales de otros dispositivos, pero no sustituye el cifrado de una red segura.

## Qué se sincroniza

Cada equipo mantiene su copia local y, durante la conexión, comparte la instantánea personal con fecha más reciente:

- recompensas y puntos;
- personajes y equipos;
- cajas e historial manual;
- mods y estado Brillante;
- límites de ronda y sesión de equipo necesarios para continuar el conteo.

El acceso de administrador, GitHub CLI, claves de publicación, bandeja de Windows, autoinicio y posición de la ventana flotante nunca se envían al teléfono.

Mientras no haya conexión, cada dispositivo conserva su copia local. Al reconectar, la última modificación personal reemplaza la copia anterior. Para evitar conflictos, conviene terminar de registrar en un dispositivo antes de continuar en el otro; esta primera implementación no fusiona dos ediciones simultáneas independientes.

## Configuración pública

`catalog/visions.json` continúa en GitHub como fuente pública de recompensas y horario tanto para PC como para Android. El administrador sigue publicando allí la rueda general. La conexión local no sustituye ni modifica ese catálogo.

La app de PC consulta GitHub Raw sin caché y usa la API pública de contenido como respaldo controlado. Las respuestas con una versión anterior nunca reemplazan una configuración más nueva.

## Estado comprobado del equipo

La APK con sincronización local se genera y verifica para la versión 1.16.0:

- Android SDK 35/36, Build Tools 35/36 y NDK 29 están instalados y las licencias fueron aceptadas.
- El destino Rust `aarch64-linux-android` compila la biblioteca nativa optimizada.
- La bandeja, el inicio automático, el actualizador de Windows, la ventana flotante y el acceso del administrador mediante GitHub CLI quedan aislados bajo `cfg(desktop)`.
- Android usa una sola ventana, navegación inferior adaptable y guarda los datos personales localmente.
- La APK ARM64 de distribución está alineada, firmada con un certificado propio de OscarD0823 y verificada con `apksigner`.
- El teléfono no estaba conectado por ADB durante la compilación, por lo que todavía corresponde realizar una prueba física de instalación, navegación y persistencia.
- El anfitrión local, el cliente Android, el código de emparejamiento, la restricción a IP privadas y el intercambio bidireccional cuentan con pruebas automáticas por bucle local.

## Trabajo por etapas

1. Completado: interfaz adaptable a pantallas verticales y separación de opciones exclusivas de Windows.
2. Completado: entrada móvil de Tauri, proyecto Android generado y compilación Rust ARM64.
3. Completado: SDK, Platform Tools, Build Tools, NDK y firma privada de distribución.
4. Completado: anfitrión TCP local en Rust, cliente móvil, código de conexión, validación y sincronización automática bidireccional.
5. Completado: pruebas de intercambio por bucle local, rechazo de IP pública y compilación ARM64.
6. Pendiente: validar la APK en un teléfono físico mediante Wi-Fi y USB tethering.
7. Futuro: cifrado de aplicación punto a punto, descubrimiento automático y fusión de operaciones simultáneas.
8. Futuro: generar un AAB firmado si se decide distribuir mediante Google Play.

## Pruebas obligatorias

- Ningún dato se transmite cuando una de las dos aplicaciones está cerrada.
- El PC no deja ningún puerto abierto después de desconectar.
- Un teléfono sin el código vigente no puede leer ni modificar datos.
- Una recompensa registrada en el teléfono aparece en el PC y no se duplica al volver a intercambiar la misma instantánea.
- Editar, revertir o borrar en un dispositivo actualiza el otro cuando esa copia es la más reciente.
- Las configuraciones exclusivas del PC y el modo administrador nunca llegan al teléfono.
- La conexión funciona sin Internet usando el punto de acceso local o USB tethering.

## Referencias oficiales

- [Requisitos de Tauri para Android](https://v2.tauri.app/start/prerequisites/)
- [Compilar APK y AAB con Tauri](https://v2.tauri.app/distribute/google-play/)
- [Firma de Android en Tauri](https://v2.tauri.app/distribute/sign/android/)
- [Descubrimiento de servicios en la red local de Android](https://developer.android.com/develop/connectivity/wifi/use-nsd)
- [Permiso de red local de Android](https://developer.android.com/privacy-and-security/local-network-permission)
- [Modos USB compatibles con Android](https://developer.android.com/develop/connectivity/usb)
