# Caja Fantasma · Once Human

Aplicación de escritorio para Windows creada por [OscarD0823](https://github.com/OscarD0823). Registra las recompensas reclamadas hasta obtener la Caja Fantasma, controla la Rueda Visional y aprende del historial personal de cajas.

Repositorio oficial: <https://github.com/OscarD0823/Caja-Fantasma>

## Funciones

- Recompensas Pro con valores configurables: jefes de monolito y silos valen 1; Desafío de Manibus, Guerra Pro y Manibus de Manibus valen 2.
- División Visión con Lunar, Gravedad y Simbiosis, además de un editor para ruedas futuras.
- Gravedad incluye Ballena (1) y Plataformas (4).
- Simbiosis permanece desactivada con Araña, Antena y Grandulón sin puntos.
- La caja puede marcarse en cualquier momento. Se guarda automáticamente fecha, hora, puntos, número de recompensas y desglose.
- Historial con el intento más bajo, el más alto, promedio, porcentaje observado por punto y estimación acumulada del intento actual.
- Espera y duración de la Rueda Visional configurables en minutos.
- Aviso nativo cuando comienza la rueda, funcionamiento minimizado en la bandeja e inicio automático con Windows.
- Contador flotante movible y siempre visible. Funciona sobre juegos en ventana o pantalla completa sin bordes; Windows no permite garantizar superposición sobre pantalla completa exclusiva.
- Historial de cambios incluido dentro del programa.
- Respaldo e importación JSON. Los datos personales solo se guardan en el equipo.

## Catálogo compartido

El archivo [`catalog/visions.json`](catalog/visions.json) es la fuente pública de recompensas y ruedas. La aplicación lo comprueba al abrir y cada 30 minutos. Si `catalogVersion` es superior a la copia local, los demás equipos reciben las opciones nuevas sin perder su historial.

En el equipo de OscarD0823, `Configuración > Editor de OscarD0823` permite añadir ruedas u opciones y publicarlas. El botón usa GitHub CLI ya autenticado; no guarda tokens ni contraseñas dentro de la aplicación. GitHub aplica los permisos del repositorio.

## Actualizaciones

El actualizador sigue el patrón de [Fortuna Real](https://github.com/OscarD0823/Fortuna-Real): consulta `latest.json` en GitHub Releases, descarga el instalador, verifica su firma antes de instalarlo y vuelve a abrir la aplicación. Sin Internet, el programa inicia normalmente con los datos locales.

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

La aplicación no recopila telemetría, cuentas, contraseñas ni información del juego. Solo se conecta al repositorio oficial para sincronizar el catálogo y buscar actualizaciones. El historial personal no se publica.

## Licencia

MIT © 2026 OscarD0823.
