# Caja Fantasma · Once Human

Aplicación de escritorio para Windows creada por [OscarD0823](https://github.com/OscarD0823). Registra las recompensas reclamadas hasta obtener la Caja Fantasma, controla la Rueda Visional y aprende del historial personal de cajas.

Repositorio oficial: <https://github.com/OscarD0823/Caja-Fantasma>

## Funciones

- Recompensas Pro con valores configurables: jefes de monolito y silos valen 1; Desafío de Manibus, Guerra Pro y Manibus de Manibus valen 2.
- Endless Dream incluye Invasión de Zona Onírica y Soñador de Luz, Soñador Profundo y Soñador Eterno; cada uno vale 1.
- División Visión con Lunar, Gravedad y Simbiosis, además de un editor para ruedas futuras.
- Gravedad incluye Ballena (1) y Plataformas (4).
- Simbiosis permanece desactivada con Araña, Antena y Grandulón sin puntos.
- La caja puede marcarse en cualquier momento. Se guarda automáticamente fecha, hora, puntos, número de recompensas, origen y desglose.
- Cuando una caja llega por correo de Plataformas, las actividades hechas durante la última hora no se atribuyen a la caja anterior: permanecen contadas en el intento nuevo.
- Historial con una base inicial de 16 cajas tomada de la columna A: mínimo 320, máximo 1.447, promedio 955,5, mediana 997, zona baja 704,875 y zona alta 1.206,125.
- Carga manual de valores históricos aproximados. Se combinan con la base estadística, pero permanecen separados de las cajas confirmadas y no inventan fechas.
- Espera y duración de la Rueda Visional configurables; el valor inicial es 30 minutos de espera y 30 minutos activa.
- Ajuste directo del contador por fase, minutos y segundos. La sincronización inicial de Gravedad parte de su cierre a las 4:52:30 p. m. de Colombia del 10 de septiembre de 2026.
- Gravedad emite un aviso de voz anticipado configurable y un aviso nativo al comenzar. La app funciona minimizada en la bandeja e inicia con Windows.
- Contador flotante movible y siempre visible. Funciona sobre juegos en ventana o pantalla completa sin bordes; Windows no permite garantizar superposición sobre pantalla completa exclusiva.
- Historial de cambios incluido dentro del programa.
- Respaldo e importación JSON. Los datos personales solo se guardan en el equipo.
- Animación de apertura al iniciar: el emblema de Once Human funciona como cerradura de la caja.
- La imagen de la recompensa conserva la caja y muestra una cantidad de 17.

## Catálogo compartido

El archivo [`catalog/visions.json`](catalog/visions.json) es la fuente pública de recompensas y ruedas. La aplicación lo comprueba al abrir, al recuperar el foco, al volver Internet y cada minuto. Si `catalogVersion` es superior a la copia local, los demás equipos reciben las opciones nuevas sin perder su historial.

Existe un único instalador para todos. En `Configuración > Editor de OscarD0823`, el modo desarrollador permanece bloqueado hasta que GitHub CLI confirma que la sesión activa pertenece exactamente a `OscarD0823`, propietario del repositorio. Otra cuenta no puede habilitar el editor y el servidor repite la verificación antes de cada publicación.

El botón de acceso abre el inicio de sesión web de GitHub CLI. La aplicación no recibe ni guarda la contraseña o el token. Una vez verificada la cuenta propietaria, el editor permite añadir ruedas u opciones y publica cada cambio automáticamente después de 1,8 segundos sin escribir; también existe un botón para publicar de inmediato.

## Actualizaciones

El actualizador sigue el patrón de [Fortuna Real](https://github.com/OscarD0823/Fortuna-Real): consulta `latest.json` en GitHub Releases al abrir, cada 15 minutos, al volver Internet y al recuperar el foco; descarga el instalador, verifica su firma antes de instalarlo y vuelve a abrir la aplicación. Sin Internet, el programa inicia normalmente con los datos locales.

La clave privada y su contraseña DPAPI permanecen fuera del repositorio, en el perfil local de Windows. El repositorio contiene únicamente la clave pública necesaria para verificar instalaciones.

## Desarrollo

Requisitos: Node.js 24, pnpm 11, Rust estable con destino MSVC, Visual Studio Build Tools y WebView2.

```powershell
pnpm install
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
