# Caja Fantasma 1.18.2

## Protección reforzada de los datos

- La sincronización en vivo ahora combina los historiales por sus identificadores y evita que una copia atrasada, aunque no esté vacía, sustituya una copia más completa.
- Si el PC y el celular contienen actividades distintas, conserva la unión de ambos historiales sin duplicar los registros compartidos.
- El cierre de una caja sigue poniendo en cero el intento activo sin resucitar los puntos del intento anterior.
- El servicio en segundo plano de Android aplica la misma protección antes de guardar una respuesta recibida del PC.
- Las copias de seguridad se comparan usando el historial duradero —actividades, rondas y cajas— para distinguir una pérdida real del reinicio normal del intento activo.
- Al iniciar, una copia nativa más completa puede recuperar automáticamente el historial local dañado o atrasado.

Los botones manuales **PC → Celular** y **Celular → PC** continúan siendo reemplazos intencionales con confirmación. Los datos personales permanecen únicamente en los dispositivos del usuario y nunca forman parte de la publicación.
