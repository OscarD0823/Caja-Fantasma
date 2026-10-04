# Versión web gratuita

## Opción preparada: GitHub Pages

La interfaz se publica como un sitio estático en `https://oscard0823.github.io/Caja-Fantasma/`. El flujo `.github/workflows/web-pages.yml` ejecuta las mismas validaciones del programa, compila con la ruta correcta del repositorio y publica el resultado después de cada cambio en `main` o cuando se ejecuta manualmente.

GitHub Pages está disponible sin costo para este repositorio público. No se configura dominio de pago, base de datos, Worker, Firebase ni otro servicio facturable.

La versión web escribe el estado principal en `localStorage` y mantiene una segunda copia recuperable en IndexedDB. Un Service Worker conserva en caché la interfaz para que pueda abrir sin conexión. El botón **Proteger almacenamiento** solicita al navegador que no elimine esos datos bajo presión de espacio. El respaldo JSON continúa siendo importante ante un borrado manual de los datos del sitio.

## Sincronización sin nube

Windows funciona como concentrador local entre las tres aplicaciones:

1. GitHub Pages sirve únicamente los archivos públicos de la aplicación.
2. La aplicación de Windows abre un puente HTTP restringido a `127.0.0.1` para la página y conserva el servidor local usado por Android.
3. Los tres clientes utilizan el mismo código de seis números y la misma revisión compartida.
4. El historial se combina en el PC; una copia vacía o atrasada no reemplaza una más completa.
5. Al cerrar el PC deja de existir el puente. La web y el celular siguen conservando sus copias locales y se ponen al día al reconectar.

La página abierta en el propio PC usa `127.0.0.1`. La APK usa la IP privada mostrada por Windows. Este diseño evita cuentas externas, cuotas y costos, y no expone el historial personal a Internet.

## Estado actual

- Windows y Android: guardado local duradero y sincronización directa en red local.
- Web: doble guardado local, caché sin conexión y publicación automática en GitHub Pages.
- PC–Web–Android: sincronización local mediante el PC, sin Firebase ni almacenamiento en nube.
