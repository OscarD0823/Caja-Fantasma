# Caja Fantasma · Once Human

Aplicación de escritorio para Windows creada por [OscarD0823](https://github.com/OscarD0823). Registra las recompensas reclamadas hasta obtener la Caja Fantasma, controla la Rueda Visional y aprende del historial personal de cajas.

Repositorio oficial: <https://github.com/OscarD0823/Caja-Fantasma>

## Funciones

- Recompensas Pro con valores configurables: jefes de monolito, silos y Desafío de Manibus de Endless Dream valen 1; Guerra Pro y Manibus de Manibus valen 2.
- Endless Dream incluye Invasión de Zona Onírica y Soñador de Luz, Soñador Profundo y Soñador Eterno; cada uno vale 1.
- División Visión con Lunar / Lunar Revelry, Abismo de Gravedad / Gravity Abyss y Progenie Aberrante / Aberrant Progeny, además de un editor para ruedas futuras. OscarD0823 selecciona la rueda pública desde el modo desarrollador; los demás usuarios reciben esa selección y no ven las ruedas desactivadas.
- Abismo de Gravedad incluye Ballena (1) y Plataformas (4).
- Progenie Aberrante permanece desactivada con Araña, Antena y Grandulón; sus opciones no suman mientras el evento esté desactivado.
- La caja puede marcarse en cualquier momento. Se guarda automáticamente fecha, hora, puntos, número de recompensas, origen y desglose.
- Menú principal Personajes para hasta 12 perfiles: cada uno conserva por separado su intento, porcentaje estimado e historial de cajas. Los datos existentes se mantienen en “Personaje principal” y la aplicación siempre abre en modo Solitario.
- Modo Equipo para seleccionar dos o más personajes. Su contador propio comienza en cero y cada recompensa registrada suma simultáneamente al intento individual de todos los integrantes; cambiar o reiniciar el conteo del equipo no borra esos puntos personales.
- Barra comparativa visible al tener más de un personaje, con los puntos, porcentaje estimado y progreso de cada uno.
- Cuando una caja llega por correo de Plataformas, las actividades hechas durante la última hora no se atribuyen a la caja anterior: permanecen contadas en el intento nuevo.
- Historial con una base inicial de 16 cajas tomada de la columna A: mínimo 320, máximo 1.447, promedio 955,5, mediana 997, zona baja 704,875 y zona alta 1.206,125.
- Carga manual de valores históricos aproximados. Se combinan con la base estadística, pero permanecen separados de las cajas confirmadas y no inventan fechas.
- El administrador configura la espera y la duración de la Rueda Visional; el valor inicial es 30 minutos de espera y 30 minutos activa. También puede establecer un retraso visual de 0 a 300.000 milisegundos entre el cierre del evento y la presentación del contador siguiente sin modificar el horario real.
- Ajuste directo del contador por fase, minutos y segundos. La sincronización inicial de Gravedad parte de su cierre a las 4:52:30 p. m. de Colombia del 10 de septiembre de 2026.
- Gravedad emite un aviso de voz anticipado configurable. Las notificaciones de escritorio están desactivadas. La app funciona minimizada en la bandeja e inicia con Windows.
- Contador flotante movible, siempre visible, escalable entre 20 % y 150 % y con posición recordada. El área transparente de la Ballena y futuros adicionales usa una escala independiente de 20 % a 100 %; al reducirla disminuyen tanto la animación como su espacio reservado y su máximo nunca supera el ancho de la ventana. La Ballena puede ocultarse sin desactivar el contador principal. Inicio incluye el botón “Configurar tamaños”, que despliega ambos controles sin abandonar la pantalla principal. Puede usar la forma automática propia de cada evento o un diseño rectangular, cuadrado, vertical o redondo. El reloj admite lectura digital, compacta o mediante anillo de progreso, y el nombre se puede mostrar en español, inglés o con un texto personalizado local. La X lo desactiva y los controles del inicio permiten recuperarlo y cambiar ambos tamaños. Funciona sobre juegos en ventana o pantalla completa sin bordes; Windows no permite garantizar superposición sobre pantalla completa exclusiva.
- Cuando la ventana principal está oculta o minimizada, el contador flotante entra en modo pasivo: oculta el agarre y la X, usa el cursor normal y deja pasar los clics al juego. Los controles regresan al volver a abrir Caja Fantasma.
- Historial de cambios incluido dentro del programa, visible únicamente para la cuenta propietaria verificada.
- Apartado Mods Brillantes con búsqueda bilingüe por nombre, variante, estilo, ranura o ID; contador individual de duplicados nivel 17 fallidos y colección de Brillantes conseguidos.
- Catálogo local completo de 1.825 registros exactos: 207 del sistema anterior, 809 normales 2.0 y 809 Brillantes 2.0. Todos se pueden añadir al seguimiento y localizar después dentro del historial personal.
- Filtros por estilo de arma o pieza de armadura y por sistema de origen. Todos los módulos progresan desde Nivel 0 hasta Nivel 17; la versión especial se muestra como Brillante. Hora punta con Estrella descendente está incluida como combinación exacta y siguen disponibles los nombres personalizados para incorporaciones futuras.
- Respaldo e importación JSON. Los datos personales solo se guardan en el equipo.
- Animación de apertura al iniciar: se conserva la imagen completa, el emblema de Once Human viaja hasta la ranura de una esquina y la caja reacciona con escaneo, órbitas, partículas, energía y chispas antes de revelar el programa.
- La imagen de la recompensa conserva la caja y muestra una cantidad de 17.
- Barra ambiental: Lunar activa usa la referencia de la luna roja con figuras de ojos rojos; Simbiosis activa usa la referencia de criaturas transformadas; Gravedad activa alterna sus dos escenas de ciudad y objetos suspendidos.
- Secuencia especial de la Ballena, exclusiva de la ventana flotante de Abismo de Gravedad: desde el minuto 15 llega nadando por la izquierda, cruza el contador y se coloca debajo sin un marco de fondo. El jefe usa un recorte transparente optimizado; cola, cuerpo, cabeza, núcleo y rayo se animan como elementos separados mientras entra y dispara. El rayo azul funciona como barra y reloj propio durante los 15 minutos restantes del evento más 5 minutos adicionales; al llegar a cero se apaga y la Ballena continúa nadando hasta salir por la derecha.
- Rendimiento adaptativo: el reloj, la lectura del estado y la sincronización reducen su frecuencia cuando la interfaz no está visible, y la nueva imagen transparente de la Ballena reemplaza dos capturas de varios megabytes.

## Catálogo compartido

El archivo [`catalog/visions.json`](catalog/visions.json) es la fuente pública de recompensas, ruedas y sincronización opcional del contador. La aplicación lo comprueba al abrir, al recuperar el foco, al volver Internet y cada minuto. Si `catalogVersion` es superior a la copia local, los demás equipos reciben las opciones nuevas. El botón «Sincronizar con todos», reservado al propietario, publica la fase y su hora absoluta: el ciclo continúa correctamente aunque el PC haya estado apagado.

Existe un único instalador para todos. En `Configuración > Editor de OscarD0823`, el modo desarrollador permanece bloqueado hasta que GitHub CLI confirma que la sesión activa pertenece exactamente a `OscarD0823`, propietario del repositorio. Otra cuenta no puede habilitar el editor y el servidor repite la verificación antes de cada publicación.

El botón de acceso abre el inicio de sesión web de GitHub CLI. La aplicación no recibe ni guarda la contraseña o el token. Una vez verificada la cuenta propietaria, el editor permite preparar como borrador la rueda pública, los tiempos, el objetivo y todas las recompensas. Nada se envía mientras se escribe: el botón “Guardar todo” valida y publica el conjunto completo mediante una sola operación. Las pruebas validan la estructura del catálogo sin bloquear valores que el propietario haya editado legítimamente.

El modo desarrollador incluye un laboratorio visual que reutiliza la misma interfaz del contador flotante. Permite simular espera, evento activo, retraso visual, disparo o salida de la Ballena y probar forma, reloj, idioma, nombre personalizado, tamaño de ventana y tamaño de adicionales sin publicar esos estados de prueba. Las herramientas y el apartado Cambios solo aparecen cuando se verifica la cuenta propietaria; la pantalla de acceso no expone el editor. El editor del catálogo también conserva el nombre en español e inglés de cada rueda futura.

## Actualizaciones

El actualizador sigue el patrón de [Fortuna Real](https://github.com/OscarD0823/Fortuna-Real): consulta `latest.json` en GitHub Releases al abrir, cada 15 minutos, al volver Internet y al recuperar el foco; descarga el instalador, verifica su firma antes de instalarlo y vuelve a abrir la aplicación. Sin Internet, el programa inicia normalmente con los datos locales.

La clave privada y su contraseña DPAPI permanecen fuera del repositorio, en el perfil local de Windows. El repositorio contiene únicamente la clave pública necesaria para verificar instalaciones.

## Auditoría del instalador

El paquete NSIS instala el ejecutable de Caja Fantasma y genera su desinstalador. No incorpora otros programas, servicios, controladores, extensiones ni telemetría. Las imágenes y el código de la interfaz están empacados dentro del ejecutable. Si Windows no dispone de Microsoft Edge WebView2, el instalador descarga únicamente el bootstrapper oficial de Microsoft, necesario para mostrar la aplicación. La revisión detallada está en [`AUDITORIA-INSTALADOR.md`](AUDITORIA-INSTALADOR.md).

## Desarrollo

Requisitos: Node.js 24, pnpm 11, Rust estable con destino MSVC, Visual Studio Build Tools y WebView2.

```powershell
pnpm install
pnpm run catalog:shiny
pnpm run lint
pnpm test
pnpm run desktop
```

Para crear el instalador firmado en el equipo autorizado:

```powershell
pnpm run installer
```

Los artefactos quedan en `Entrega/`. Para publicar una versión, incrementa la versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`, actualiza las notas y ejecuta:

```powershell
./scripts/build-installer.ps1 -Publish
```

## Privacidad

La aplicación no recopila telemetría, contraseñas ni información del juego. Solo consulta el nombre de la sesión local de GitHub para proteger el editor, y se conecta al repositorio oficial para sincronizar el catálogo y buscar actualizaciones. El historial personal no se publica.

## Licencia

MIT © 2026 OscarD0823.
