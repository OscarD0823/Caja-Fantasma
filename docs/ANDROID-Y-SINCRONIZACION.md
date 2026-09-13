# Android y sincronización directa PC–celular

## Decisión

Caja Fantasma puede reutilizar su interfaz React y su núcleo Tauri para generar una APK. No conviene copiar el paquete Android de Lankdea: aquel proyecto usa Python, Kivy y Buildozer, mientras Caja Fantasma usa React, TypeScript, Rust y Tauri 2.

La sincronización de Caja Fantasma no usará Firebase, servicios en la nube, cuentas ni servidores externos. Solo funcionará cuando la aplicación esté abierta simultáneamente en el PC y en el celular y exista una conexión local entre ambos. Los datos personales nunca se enviarán a GitHub.

## Conexión local elegida

El PC actuará como anfitrión temporal. Al pulsar **Conectar celular**, abrirá un servicio local y mostrará un código QR de vinculación. La APK escaneará ese código y establecerá una sesión cifrada directamente con el PC. Al cerrar cualquiera de las dos aplicaciones, la sesión termina.

La ruta principal será una red local, sin necesitar Internet:

- ambos equipos conectados al mismo Wi-Fi;
- el celular conectado al punto de acceso de Windows; o
- USB tethering, que crea una red local por el cable USB sin activar depuración de Android.

Un cable USB en modo normal de carga o transferencia de archivos no crea por sí solo un canal entre aplicaciones. Hacer comunicación USB directa exigiría un complemento nativo basado en Android Open Accessory, permiso del usuario y compatibilidad del hardware. No se usará ADB ni se obligará a activar opciones de desarrollador. La primera versión empleará red local o USB tethering, que son más compatibles y siguen siendo completamente locales.

## Protocolo de vinculación

1. El PC abre un puerto aleatorio únicamente mientras está visible la pantalla de conexión.
2. Genera un identificador de sesión y un secreto aleatorio de 256 bits que caduca a los dos minutos.
3. El QR contiene dirección local, puerto, sesión y secreto. No contiene historiales ni contraseñas.
4. El teléfono demuestra que leyó el secreto y ambos derivan una clave de sesión.
5. Cada mensaje se cifra con AES-GCM, usa un nonce único y lleva número de secuencia para impedir repeticiones.
6. El PC acepta un solo teléfono por sesión y cierra el puerto al desconectar o cerrar la aplicación.

El descubrimiento automático mediante NSD/mDNS puede añadirse después del primer emparejamiento. El QR será el mecanismo inicial porque permite elegir el PC correcto sin explorar todos los dispositivos de la red.

## Qué se sincroniza

El PC conserva la copia autoritativa durante la sesión y transmite los cambios confirmados al teléfono:

- recompensas y puntos;
- personajes y equipos;
- cajas e historial manual;
- mods y estado Brillante;
- preferencias personales compatibles con móvil;
- catálogo, rueda seleccionada y horario que el PC ya tenga descargados.

El acceso de administrador, GitHub CLI, claves de publicación, bandeja de Windows, autoinicio y posición de la ventana flotante nunca se envían al teléfono.

Cada operación tendrá `operationId`, `deviceId`, `createdAt` y un tipo explícito. PC y celular intercambiarán primero las operaciones que les falten y luego comprobarán un resumen del estado. Este registro evita perder sumas simultáneas y permite sincronizar borrados mediante operaciones de reversión en lugar de comparar dos archivos completos.

Mientras no haya conexión, cada dispositivo conserva su copia local. La sincronización pendiente solo se ejecuta la próxima vez que ambas aplicaciones estén abiertas y vinculadas; no existe ningún proceso ni servidor funcionando en Internet.

## Configuración pública

`catalog/visions.json` continúa en GitHub como fuente pública de recompensas y horario para las aplicaciones de PC. El administrador sigue publicando allí la rueda general. Cuando el teléfono se conecta, recibe directamente del PC la última copia disponible, por lo que la APK puede funcionar sin acceso a GitHub.

La app de PC consulta GitHub Raw sin caché y usa la API pública de contenido como respaldo controlado. Las respuestas con una versión anterior nunca reemplazan una configuración más nueva.

## Estado comprobado del equipo

La primera APK se generó y verificó para la versión 1.15.0:

- Android SDK 35/36, Build Tools 35/36 y NDK 29 están instalados y las licencias fueron aceptadas.
- El destino Rust `aarch64-linux-android` compila la biblioteca nativa optimizada.
- La bandeja, el inicio automático, el actualizador de Windows, la ventana flotante y el acceso del administrador mediante GitHub CLI quedan aislados bajo `cfg(desktop)`.
- Android usa una sola ventana, navegación inferior adaptable y guarda los datos personales localmente.
- La APK ARM64 de distribución está alineada, firmada con un certificado propio de OscarD0823 y verificada con `apksigner`.
- El teléfono no estaba conectado por ADB durante la compilación, por lo que todavía corresponde realizar una prueba física de instalación, navegación y persistencia.
- La sincronización directa y cifrada PC–celular descrita arriba sigue siendo la próxima etapa; la versión 1.15.0 solo comparte la configuración pública mediante GitHub.

## Trabajo por etapas

1. Completado: interfaz adaptable a pantallas verticales y separación de opciones exclusivas de Windows.
2. Completado: entrada móvil de Tauri, proyecto Android generado y compilación Rust ARM64.
3. Completado: SDK, Platform Tools, Build Tools, NDK y firma privada de distribución.
4. Pendiente: validar la APK en un teléfono físico compatible.
5. Pendiente: implementar en Rust el anfitrión local del PC y el cliente móvil, además del QR y el registro de operaciones pendientes.
6. Pendiente: probar Wi-Fi, punto de acceso de Windows y USB tethering sin Internet.
7. Futuro: generar un AAB firmado si se decide distribuir mediante Google Play.

## Pruebas obligatorias

- Ningún dato se transmite cuando una de las dos aplicaciones está cerrada.
- El PC no deja ningún puerto abierto después de desconectar.
- Un teléfono sin el secreto vigente no puede leer ni modificar datos.
- Una recompensa registrada en el teléfono aparece una sola vez en el PC, incluso después de reconectar.
- Dos operaciones distintas creadas sin conexión sobreviven a la fusión.
- Editar, revertir o borrar en un dispositivo se refleja en el otro sin resucitar versiones antiguas.
- Las configuraciones exclusivas del PC y el modo administrador nunca llegan al teléfono.
- La rueda, la fase y todos sus tiempos se transfieren como una sola instantánea.
- La conexión funciona sin Internet usando el punto de acceso local o USB tethering.

## Referencias oficiales

- [Requisitos de Tauri para Android](https://v2.tauri.app/start/prerequisites/)
- [Compilar APK y AAB con Tauri](https://v2.tauri.app/distribute/google-play/)
- [Firma de Android en Tauri](https://v2.tauri.app/distribute/sign/android/)
- [Descubrimiento de servicios en la red local de Android](https://developer.android.com/develop/connectivity/wifi/use-nsd)
- [Permiso de red local de Android](https://developer.android.com/privacy-and-security/local-network-permission)
- [Modos USB compatibles con Android](https://developer.android.com/develop/connectivity/usb)
