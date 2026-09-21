# Android y sincronización directa PC–celular

## Decisión

Caja Fantasma puede reutilizar su interfaz React y su núcleo Tauri para generar una APK. No conviene copiar el paquete Android de Lankdea: aquel proyecto usa Python, Kivy y Buildozer, mientras Caja Fantasma usa React, TypeScript, Rust y Tauri 2.

La sincronización de Caja Fantasma no usa Firebase, servicios en la nube, cuentas ni servidores externos. El programa de Windows debe permanecer en ejecución y debe existir una conexión local entre ambos dispositivos; en Android, el modo Datos en vivo puede continuar mediante un servicio nativo aunque la interfaz de la aplicación ya no esté visible. Los datos personales nunca se envían a GitHub.

## Conexión local implementada

El PC actúa como anfitrión temporal. Al pulsar **Compartir con el celular**, abre un servicio TCP local y muestra por separado su IP, el puerto y un código de seis números. En la APK la IP se introduce en cuatro bloques, el puerto en su propio campo y el código en otro; también se puede pegar una dirección completa en cualquiera de los bloques. Después se pulsa **Conectar con el PC**. Al desactivar la función o cerrar el programa, el servicio deja de aceptar conexiones.

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
5. El teléfono decide la dirección: **PC → Celular** descarga y reemplaza la copia personal del teléfono; **Celular → PC** carga y reemplaza la copia personal del PC. La hora del dispositivo no decide cuál gana.
6. Si **Sincronización en vivo** está apagada, la APK comprueba la conexión cada cinco segundos sin transferir ni reemplazar datos personales. Los botones manuales siguen disponibles.
7. Si se activa en ambos dispositivos, un servicio nativo Android intercambia cambios aproximadamente cada segundo y medio, incluso al usar otra aplicación. Una revisión monotónica del PC impide que una copia atrasada lo sobrescriba; si ambos lados cambiaron, los registros con identificador se combinan antes de confirmar una nueva revisión.
8. La respuesta del PC incluye su catálogo público vigente para que espera, duración activa, fase y transición también lleguen al teléfono por la conexión local.
9. Android declara el servicio como `connectedDevice`, muestra una notificación silenciosa obligatoria mientras está activo y vuelve a intentar la conexión cada cuatro segundos cuando el PC no está disponible.

El canal no se publica en Internet ni utiliza Firebase. En esta versión el contenido viaja dentro de la red local sin cifrado adicional, por lo que debe usarse únicamente en una red Wi-Fi de confianza o mediante USB tethering. El código evita accesos accidentales de otros dispositivos, pero no sustituye el cifrado de una red segura.

## Qué se sincroniza

Cada equipo mantiene su copia local. En modo manual, los datos solo se reemplazan cuando la persona pulsa una de las dos direcciones. En modo en vivo, se reflejan mientras Windows siga ejecutándose, el servicio Android esté habilitado y ambos dispositivos conserven la conexión local; la pantalla de la APK no necesita permanecer abierta:

- recompensas, puntos, resumen diario y ranking histórico;
- personajes y equipos;
- cajas e historial manual;
- mods y estado Brillante;
- límites de ronda y sesión de equipo necesarios para continuar el conteo.

El acceso de administrador, GitHub CLI, claves de publicación, bandeja de Windows, autoinicio y posición de la ventana flotante nunca se envían al teléfono.

Mientras no haya conexión, cada dispositivo conserva su copia local. Al reconectar en modo manual no se reemplaza nada automáticamente. En modo en vivo, las colecciones personales con identificador se unen y nunca se permite que una copia sin historial borre automáticamente otra que sí contiene registros. Los reemplazos completos e intencionales permanecen reservados para **PC → Celular** y **Celular → PC**, ambos con confirmación.

## Ejecución en segundo plano de Android

Al activar **Sincronización en vivo**, la APK inicia un servicio de primer plano de tipo dispositivo conectado. Android exige que este tipo de trabajo continuo muestre una notificación: el canal usa prioridad baja, no produce sonido ni vibración y desaparece al desactivar Datos en vivo. La notificación cambia entre **PC conectado** y **Buscando el PC** sin generar avisos repetidos.

El servicio guarda de forma privada la IP, el código, la revisión confirmada y la última copia sincronizada. Si la interfaz queda suspendida, sigue comunicándose directamente con el anfitrión TCP; cuando la persona vuelve a la app, la interfaz recoge esa copia, aplica solo datos válidos y actualiza el respaldo nativo. Android puede recrear el servicio después de finalizar su proceso, pero no se inicia por sí solo después de reiniciar el teléfono: se activa al abrir la app con Datos en vivo habilitado.

## Configuración pública

`catalog/visions.json` continúa en GitHub como fuente pública de recompensas y horario tanto para PC como para Android. El administrador publica de una vez la rueda general, los minutos de espera, los minutos de actividad, el retraso de transición, la fase vigente y su hora de inicio. Además, un PC conectado retransmite su copia pública vigente al teléfono; el teléfono nunca publica ni modifica ese catálogo.

PC y Android consultan GitHub Raw sin caché al abrir, al recuperar el foco, al volver la conexión y cada 30 segundos; usan la API pública de contenido como respaldo controlado. Las respuestas con una versión anterior nunca reemplazan una configuración más nueva. Una versión pública superior siempre aplica todos sus tiempos aunque el reloj local tenga una fecha posterior; dentro de la misma versión, la fecha de publicación permite aplicar una sincronización de tiempo posterior.

## Actualización de la APK

Desde la versión 1.16.1, la APK consulta el mismo manifiesto de GitHub Releases que Windows. Cuando existe una versión superior, la aplicación descarga el paquete oficial en su caché privada, limita su tamaño y verifica la suma SHA-256 publicada antes de abrir el instalador de Android. El sistema vuelve a validar que la firma del paquete coincida con la firma de la app instalada.

Android no permite que una aplicación distribuida fuera de Google Play se reemplace silenciosamente: la persona debe confirmar la pantalla de instalación y, la primera vez, permitir que Caja Fantasma instale su propia actualización. Después no es necesario buscar, descargar ni abrir manualmente el archivo. El manifiesto común solo se publica cuando existen juntos el instalador Windows y la APK de la misma versión.

## Estado comprobado del equipo

La APK con sincronización local, modo en vivo protegido, servicio Android en segundo plano y actualización integrada se genera y verifica para la versión 1.18.0:

- Android SDK 35/36, Build Tools 35/36 y NDK 29 están instalados y las licencias fueron aceptadas.
- El destino Rust `aarch64-linux-android` compila la biblioteca nativa optimizada.
- La bandeja, el inicio automático, el actualizador de Windows, la ventana flotante y el acceso del administrador mediante GitHub CLI quedan aislados bajo `cfg(desktop)`.
- Android usa una sola ventana, navegación inferior adaptable y guarda los datos personales localmente.
- La APK ARM64 de distribución está alineada, firmada con un certificado propio de OscarD0823 y verificada con `apksigner`.
- El módulo Android compila el servicio Kotlin, fusiona sus permisos y manifiesto y supera `lintVital`; todavía corresponde validar en el teléfono físico la permanencia de la conexión al cambiar de aplicación.
- El anfitrión local, el cliente Android, el código de emparejamiento, la restricción a IP privadas y el intercambio bidireccional cuentan con pruebas automáticas por bucle local. Las pruebas cubren PC→celular, celular→PC, el inicio seguro del modo en vivo, cambios desde ambos lados, rechazo de revisiones atrasadas y del código incorrecto, el puerto predeterminado y los rangos privados 10.x, 172.16–31.x y 192.168.x.

## Trabajo por etapas

1. Completado: interfaz adaptable a pantallas verticales y separación de opciones exclusivas de Windows.
2. Completado: entrada móvil de Tauri, proyecto Android generado y compilación Rust ARM64.
3. Completado: SDK, Platform Tools, Build Tools, NDK y firma privada de distribución.
4. Completado: anfitrión TCP local en Rust, cliente móvil, código de conexión, sincronización manual por dirección y modo en vivo por revisiones.
5. Completado: pruebas de intercambio manual y en vivo por bucle local, rechazo de IP pública y compilación ARM64.
6. Completado: servicio Android `connectedDevice`, notificación silenciosa, reconexión automática y entrega de cambios al reabrir la interfaz.
7. Pendiente: validar la APK 1.18.0 en un teléfono físico al cambiar de aplicación, apagar la pantalla y reconectar Wi-Fi o USB tethering.
8. Futuro: cifrado de aplicación punto a punto y descubrimiento automático.
9. Futuro: generar un AAB firmado si se decide distribuir mediante Google Play.

## Pruebas obligatorias

- Ningún dato se transmite cuando Windows está cerrado o la conexión local está desactivada; ocultar la interfaz Android no detiene el servicio de Datos en vivo.
- Al desconectar, el PC rechaza de inmediato cualquier intercambio aunque el proceso conserve su listener local hasta cerrarse.
- Un teléfono sin el código vigente no puede leer ni modificar datos.
- **Celular → PC** reemplaza los datos personales del PC aunque el reloj del teléfono sea anterior.
- **PC → Celular** reemplaza los datos personales del teléfono sin cargar primero su copia al PC.
- La comprobación automática de conexión nunca reemplaza datos personales.
- El modo en vivo solo acepta cambios del teléfono después de reconocer la última revisión del PC.
- Desactivar el modo en vivo en el PC rechaza intercambios automáticos sin deshabilitar los botones manuales.
- Las configuraciones exclusivas del PC y el modo administrador nunca llegan al teléfono.
- La conexión funciona sin Internet usando el punto de acceso local o USB tethering.
- El servicio Android permanece activo al enviar la app al fondo, muestra una única notificación silenciosa y entrega a la interfaz los cambios recibidos cuando vuelve a abrirse.

## Referencias oficiales

- [Requisitos de Tauri para Android](https://v2.tauri.app/start/prerequisites/)
- [Compilar APK y AAB con Tauri](https://v2.tauri.app/distribute/google-play/)
- [Firma de Android en Tauri](https://v2.tauri.app/distribute/sign/android/)
- [Descubrimiento de servicios en la red local de Android](https://developer.android.com/develop/connectivity/wifi/use-nsd)
- [Permiso de red local de Android](https://developer.android.com/privacy-and-security/local-network-permission)
- [Modos USB compatibles con Android](https://developer.android.com/develop/connectivity/usb)
- [Tipos de servicios de primer plano en Android](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Declarar un servicio de primer plano](https://developer.android.com/develop/background-work/services/fgs/declare)
