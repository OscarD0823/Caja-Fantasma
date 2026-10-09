# Caja Fantasma 1.21.5 · Guardado e indicativos

- **Intento correcto al volver a abrir:** cuando la caché y el respaldo tienen el mismo historial, la recuperación utiliza el intento del respaldo guardado. Guardar y salir conserva también la respuesta final del guardado nativo.
- **Recompensas de cajas cerradas:** cada caja nueva guarda qué recompensas consumió y a qué personaje pertenecen. Las copias atrasadas no pueden volver a sumarlas al intento; sí se conserva el historial y el total del equipo.
- **Ventana flotante:** al cerrarla solo solicita desactivarse; ya no sobrescribe el progreso desde una copia desactualizada. El arranque espera a recuperar los datos antes de escribir el estado local.
- **PC · Web · Móvil:** Android conserva la lista completa de dispositivos conectados recibida por su servicio en segundo plano. El indicativo Web anima su señal cuando la conexión es reciente y se apaga cuando deja de serlo.
- Pruebas de regresión del intento tras una caja, cierre, respaldos en disco, intercambio con copias atrasadas, personajes/equipos y transporte del indicativo Android.

No cambia el criterio de una hora del correo de Plataformas ni los puntos históricos de las cajas. Una instalación nueva no incluye historiales personales.

Windows y Android se actualizan sobre la versión anterior, sin desinstalar. Android requiere aceptar la instalación del paquete firmado. La página obtiene la nueva versión al recargar; actualizar los tres dispositivos es recomendable.

Herramienta comunitaria gratuita de OscarD0823, no oficial de Once Human. Los historiales permanecen locales y no se publican en GitHub.
