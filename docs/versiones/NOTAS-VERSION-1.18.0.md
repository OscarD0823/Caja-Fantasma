# Caja Fantasma 1.18.0

## Sincronización Android en segundo plano

- **Datos en vivo continúa sin dejar la app abierta:** Android mantiene la conexión local con el PC cuando cambias a un juego o usas otra aplicación.
- **Servicio nativo de dispositivo conectado:** el intercambio se ejecuta fuera de la interfaz y se reactiva automáticamente si Android necesita recrear el proceso.
- **Estado visible y silencioso:** una notificación permanente, exigida por Android mientras trabaja en segundo plano, muestra si el PC está conectado o si se está intentando reconectar. Se elimina al desactivar Datos en vivo.
- **Sin Firebase ni nube:** los puntos, cajas, rondas, personajes y módulos continúan viajando únicamente entre el teléfono y la dirección privada del PC.
- **Protección del historial:** el servicio no acepta que una respuesta vacía reemplace una copia con registros y conserva las revisiones pendientes mientras la interfaz está cerrada.
- **Regreso seguro a la app:** al abrir de nuevo Caja Fantasma, los cambios recibidos en segundo plano se aplican a la interfaz y al respaldo nativo.

Para usarlo, activa **Conectar con el PC** y **Sincronización en vivo** en Android, y mantén habilitadas las mismas opciones en Windows. Android puede solicitar permiso para mostrar la notificación del servicio la primera vez.
