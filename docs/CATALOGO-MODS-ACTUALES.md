# Catálogo de módulos actuales

Revisión: 3 de octubre de 2026.

## Resultado

La aplicación distribuye exclusivamente 1.618 registros del sistema moderno:

- 809 módulos normales, que progresan del nivel 1 al 17.
- 809 equivalentes Brillantes.
- 0 registros del sistema anterior.

El generador descarta expresamente cualquier entrada cuyo campo `system` sea `legacy`. Esta operación solo cambia el catálogo disponible para nuevas búsquedas; no elimina objetivos ni historiales que una persona ya tenga guardados.

## Fuentes contrastadas

- Anuncio oficial del nuevo sistema de módulos de Once Human, publicado para la actualización del 21 de enero de 2026: <https://www.oncehuman.game/m/news/devBlog/20260123/40781_1283429.html>
- Catálogo estructurado de Wikily usado por el generador: <https://wikily.gg/es-la/once-human/mods/>
- Índice independiente de OnceHumanDB usado como segunda comprobación: <https://www.oncehumandb.com/mods>

La segunda comprobación encontró algunas diferencias de escritura y espacios, pero no una combinación moderna real ausente. No se agregaron duplicados con nombres mal escritos. Cada combinación correcta detectada está cubierta en normal y Brillante.

## Regeneración y validación

```powershell
pnpm run catalog:shiny
pnpm test
```

El generador se detiene si la fuente deja de producir 809 registros normales y 809 Brillantes, si aparecen identificadores repetidos o si cambian inesperadamente los totales.
