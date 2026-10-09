# Cofre y conexión directa · versión 1.21.8

La ilustración `src/assets/phantom-crate-reference.webp` procede del cofre de
[la página de proyectos de OscarD0823](https://oscard0823.github.io/Pagina-Principal/)
(`assets/phantom-crate.webp`). Se incluye en el programa; no se solicita a otro sitio
cada vez que abre la app. No es el logo oficial del juego.

La apertura no recorta esa ilustración: utiliza caras independientes de metal,
ocho placas que forman una tapa curva, bisagras, una llave, un fantasma original
y el módulo Brillante 17. Solo hay una secuencia CSS corta; no hay motor 3D ni
bucle de dibujo. Respeta movimiento reducido y pausa al ocultarse la superficie.

El emblema original de cofre + módulo es la fuente común de los iconos de Windows,
Android y PWA (`pnpm icons`). La interfaz ya no superpone el logo de Once Human.

### Apertura 1.21.8

El módulo Brillante es ahora la pieza que entra en la cerradura. Después se
liberan los cierres y gira la tapa; el fantasma emerge desde el interior, mueve
la cabeza y los brazos, parpadea y se retira. Sus telas y estelas tienen
movimiento independiente. El módulo permanece colocado y el cofre abierto
queda visible solo antes de mostrar la aplicación. La secuencia dura 7,6 s
y puede omitirse; con movimiento reducido se muestra una apertura estática.

El cofre junto a los puntos comparte las mismas caras y bisagras, en un ciclo
suave de 14 s que vuelve a cerrar la tapa antes de repetir. Su componente está
memorizado para no reconstruirse cada segundo al cambiar los cronómetros.
No añade temporizadores, canvas ni un motor 3D. Las decoraciones secundarias
se ocultan en la versión pequeña y se pausa la animación al ocultar la app.
Las comprobaciones visuales incluyen el cofre vacío al final, el módulo en su
cerradura y un conteo de cuatro dígitos a 320 px sin desbordar ni tapar números.

## Web ↔ celular sin PC

### Enlace actual: IP y código

Android incorpora un puente HTTP local nativo. Al pulsar **Compartir con la web**,
muestra IP, puerto y código de seis números. La página usa cuatro casillas para
la IP y un botón **Conectar con el celular**, igual que el enlace con PC. No se
publica ni activa automáticamente al importar un respaldo o abrir la app.

Se reutiliza el protocolo 2 del puente de Windows, con protección de cierres de
caja y eliminaciones intencionales. Android guarda cada cambio recibido en su
respaldo nativo antes de confirmarlo; si falla el disco, no cambia la revisión
visible ni confirma la operación. Las respuestas web tienen límites de tamaño y
validación antes de aplicar datos. Los comandos de abrir/cerrar están ordenados
para evitar que una apertura pendiente reactive un enlace ya desconectado.

Ambas aplicaciones deben estar abiertas en una red local de confianza. Este
enlace utiliza HTTP dentro de la LAN, **no está cifrado de extremo a extremo**:
el código no sustituye el cifrado. El navegador puede solicitar acceso a la red
local. Redes de invitados con aislamiento impiden la conexión. No requiere PC
ni un servicio externo. El servicio Android existente con PC se conserva.

### Enlace anterior 1.21.6: invitación y respuesta

En **Dispositivos → Conexión directa**, ambos dispositivos deben estar en la misma
red Wi-Fi y mantener las aplicaciones abiertas. Crear una invitación en uno,
pegarla en el otro y devolver la respuesta al primero. Los códigos caducan en diez
minutos. Es un canal de datos WebRTC cifrado; no usa cámara, micrófono, Firebase,
Cloudflare, STUN, TURN ni un servidor de señalización. Algunas redes de invitados
aíslan dispositivos y no permiten esta conexión.
Las invitaciones solo incluyen direcciones privadas, de enlace local o mDNS;
se descartan IP públicas y candidatos de retransmisión.

Los historiales se combinan utilizando las mismas protecciones contra pérdida y
resurrección de puntos eliminados. Una transferencia incompleta no se aplica:
se reciben partes de 16 KB con límite total de 8 MB y se verifica SHA-256.

La conexión directa se cierra cuando el navegador o Android suspenden la app.
No promete sincronización directa en segundo plano. El modo anterior con PC no
se reemplaza y conserva el servicio Android nativo en segundo plano.

## Notificación Android

La notificación del servicio de sincronización con PC ahora muestra dos
cronómetros nativos: evento y ballena. Se calculan desde la hora absoluta del
evento y el catálogo publicado por el administrador, incluso con la interfaz
en segundo plano. Ballena: aparece a los 15 minutos; termina cinco minutos
después de Gravedad. El servicio actualiza la notificación al cambiar una fase
o su configuración, no cada segundo. No se activan notificaciones de Windows.

## Comprobaciones

- `pnpm test`, `pnpm lint`, `pnpm build`.
- Android: `:tauri-plugin-android-updater:testReleaseUnitTest` (seis casos de fases).
- Laboratorios DEV: `?interface-visual-test&intro-preview=5450` y
  `?direct-peer-test` / `?direct-peer-test&peer-kind=mobile`; no acceden al progreso.
- Dos clientes de navegador con WebRTC real: emparejamiento, copia vacía,
  sumas y restas en ambos sentidos y envío manual comprobados. La identidad
  móvil es simulada en esa prueba; no sustituye una prueba en un teléfono real.
- Rust Windows: 18 pruebas de guardado, cierres de caja, eliminaciones y puente
  local, sin modificar el historial del usuario.
- `cargo check --target aarch64-linux-android`: compilación de los comandos
  nativos Android y del nuevo parámetro de cronómetros comprobada.

La versión 1.21.8 añade pruebas del puente móvil: HTTP real con CORS,
código incorrecto, copia vacía, propagación de restas, respuesta persistida y
fallo de disco sin confirmar. El historial y probabilidad se revisan a 320 y
390 píxeles usando componentes reales con datos ficticios.

La versión 1.21.8 conserva los datos personales. Los laboratorios de prueba no
se incluyen en la compilación de producción ni acceden a historiales reales.
