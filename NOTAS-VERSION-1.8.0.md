# Caja Fantasma 1.8.0

## Ventana flotante por evento

- Lunar, Gravedad y Simbiosis muestran su imagen directamente en el contador flotante.
- Cada rueda tiene una forma visual diferente para poder reconocerla aun mientras se juega.
- La posición elegida por el usuario continúa guardándose.

## Ballena de Gravedad

- La Ballena aparece únicamente como una extensión inferior de la ventana flotante.
- Entra desde la izquierda al cumplirse 15 minutos del evento de Gravedad y se acomoda debajo del contador.
- El rayo azul muestra su propio reloj y se reduce durante 20 minutos: 15 minutos restantes de Gravedad y 5 minutos posteriores.
- Al llegar a cero, el rayo se apaga y la Ballena sale por la derecha antes de que la ventana vuelva a su tamaño normal.

## Instalador revisado

- Incluye Caja Fantasma, su desinstalador y los accesos directos correspondientes.
- No incorpora programas, servicios, controladores, extensiones ni telemetría ajenos.
- Solo instala Microsoft Edge WebView2 desde el sitio oficial cuando ese componente requerido no está presente en Windows.
