# Caja Fantasma v1.20.2

Esta actualización corrige el arranque de la aplicación de Windows y mantiene operativo el enlace con la página web.

- Windows deja de registrar dentro de la app el caché sin conexión que pertenece únicamente a GitHub Pages.
- Al actualizar, se eliminan solamente los cachés web antiguos de Caja Fantasma; los puntos, cajas, personajes, módulos e historiales no se modifican.
- La animación de apertura incluye una salida automática de seguridad para que nunca pueda ocultar permanentemente la interfaz.
- El botón **Abrir página web** abre el navegador al frente y la página puede comunicarse con el puente local del PC cuando recibe permiso de red local.
- La página distingue si Edge bloqueó el permiso o si **Compartir con el celular** está apagado, y añade **Volver a conectar** para repetir la prueba sin desconectarse.
- La sincronización continúa sin Firebase ni nube: **Celular ↔ PC ↔ Página** dentro de la red local.

Los datos existentes se conservan durante la actualización.
