# Caja Fantasma 1.22.0

## Conexiones y acceso

- Corregido: la web en un navegador Android o una PWA muestra **Conectar con el celular**. Ya no se identifica como la APK ni intenta presentar el puente nativo.
- **Dispositivos** reúne Windows, web y Android y sus descargas en un mismo bloque.
- Las conexiones con PC y con celular están juntas bajo **Conecta tus dispositivos**. Web–celular utiliza la IP del teléfono, el puerto y un código de seis números, en la misma red.
- No se modifica el protocolo de sincronización, ni se reinicia el progreso ni el historial.

## Interfaz

- Barra de progreso con conducto de energía, segmentos y una transición más suave al sumar o restar.
- El aro del cofre refleja la carga del intento sin duplicar ni cubrir el número de puntos. No representa una probabilidad oficial.
- Indicadores de dispositivos con circuitos animados en ambos sentidos, solo cuando hay una conexión real. Los dispositivos sin conexión no simulan actividad.
- Botones inspirados en los bordes metálicos y la cerradura del cofre.
- Apertura con movimiento de cámara, llegada del módulo y bisagra más fluidos.
- Emblema con módulo más legible y margen adicional en los iconos de Windows, Android y web.
- Vista de actualización con etapas, cambios y las acciones que Android requiere. Una descarga sin progreso conocido no muestra un porcentaje inventado.

## Ayuda e idioma

- Tutorial de seis pasos accesible desde la cabecera; puede abrirse de nuevo cuando quieras.
- Idioma automático en instalaciones nuevas, usando las preferencias del dispositivo entre los 12 idiomas disponibles.
- Se conservan los idiomas elegidos en versiones anteriores. Puedes elegir **Auto** o fijar un idioma manualmente. Los textos aún no traducidos usan inglés.
- Los idiomas y el estado del tutorial son preferencias de cada dispositivo; no sustituyen los datos sincronizados.

## Distribución

- Notas antiguas organizadas en `docs/versiones`, sin eliminar versiones ni lanzamientos.
- Windows: instalador x64 con firma para el actualizador del proyecto.
- Android: APK ARM64 para Android 8+, con el mismo certificado; actualiza sin desinstalar.
- Web gratuita en GitHub Pages; caché de interfaz renovada sin borrar el almacenamiento personal.

Herramienta comunitaria no oficial. Las imágenes de referencia del juego pertenecen a sus titulares. El registro es manual; no lee ni modifica el juego ni automatiza partidas.
