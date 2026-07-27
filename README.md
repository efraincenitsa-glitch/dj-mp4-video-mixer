# DJ MP4 Video Mixer Pro

App web estática para mezclar videos MP4 desde el navegador con 3 monitores:

- **PROGRAM**: salida principal para proyectar en pantalla completa.
- **DECK A** y **DECK B**: monitores de mezcla/cue.
- Carga de videos locales MP4/WebM/OGG y audio.
- Crossfader de video y audio.
- Efectos visuales por deck: B/N, sepia, neón, cálido, frío, blur, contraste, brillo, invertir, espejo, rotar, zoom, shake, pixel, glitch y trail.
- Efectos master: flash, strobe, invert y viñeta.
- Controles de volumen, velocidad, filtro LP/HP, pan, loop, cue, stop/play.
- Lista de reproducción y modo Auto Mix.
- Grabación de la salida principal en formato WEBM si el navegador lo soporta.
- PWA instalable cuando se publica en HTTPS, por ejemplo GitHub Pages.

## Cómo subirlo a GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube todos estos archivos en la raíz del repositorio.
3. Ve a **Settings > Pages**.
4. En **Branch**, selecciona `main` y carpeta `/root`.
5. Abre la URL que GitHub Pages genere.

## Nota importante

La app mezcla archivos locales en el navegador. No sube tus videos a ningún servidor. La compatibilidad de MP4 depende de los codecs soportados por cada navegador.
