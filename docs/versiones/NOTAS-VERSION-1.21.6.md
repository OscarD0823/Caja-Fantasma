# Caja Fantasma 1.21.6 · Cofre espectral y conexión local

- Cofre inspirado en la página de proyectos de OscarD0823: tapa curva articulada, llave que entra en la cerradura, herrajes metálicos, fantasma y módulo Brillante 17. La apertura usa geometría CSS y vectores originales, no recortes de una fotografía ni un motor 3D.
- Iconos propios de cofre y módulo para Windows, Android y la web. Se retira el logo oficial del juego de la interfaz.
- La notificación de sincronización Android con PC muestra dos cronómetros nativos: evento y Ballena. Ballena empieza a los 15 minutos y termina cinco minutos después del evento de Gravedad. Respeta los horarios del administrador y su retraso en milisegundos.
- Nueva opción **Dispositivos → Conexión directa** para web y celular en la misma Wi-Fi, mediante invitación y respuesta. Ambas apps deben permanecer abiertas; si Android o el navegador las suspende, vuelve a emparejarlas. El puente existente con PC y su sincronización nativa en segundo plano se conserva.
- Los datos se combinan, no se reemplazan por una copia vacía. Transferencias por partes, con tamaño limitado y verificación SHA-256 antes de aplicar; las restas intencionales no reaparecen desde una copia atrasada.
- Solo red local: sin Cloudflare, Firebase, STUN/TURN ni servicios de pago. Algunas redes de invitados aíslan dispositivos y no permiten el enlace.
- Se conserva el progreso, los personajes, módulos, historial y cálculo del correo de Plataformas. No incluye datos personales precargados.

Instala sobre la versión anterior, **sin desinstalar**. Android conserva el certificado habitual de actualización. La web obtiene esta versión al recargar y actualiza únicamente su caché de recursos, no el historial personal.

Herramienta comunitaria gratuita y no oficial de Once Human, creada por OscarD0823. Los datos personales permanecen en tus dispositivos y no se publican en GitHub.
