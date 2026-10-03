# Simulador DMSA

Simulador educativo para procesar un cintigrama renal estático con Tc-99m DMSA, con interfaz inspirada en Windows 95. El estudiante carga las estáticas DICOM de su caso, revisa las seis proyecciones y la lateralidad, dibuja regiones de interés renales y de fondo en la posterior y en la anterior, y obtiene la función renal relativa por media geométrica, como lo hace el equipo. Al terminar compara su resultado con el del informe.

Sitio: <https://lucianotejadac.github.io/simulador-dmsa/>

## Tutorial

El panel **Tutorial** pregunta al inicio qué caso te asignaron (1 a 11) y guía los pasos: cargar los tres archivos, reconocer la adquisición, marcar la lateralidad, dibujar las regiones en la posterior y en la anterior, confirmar la tabla y exportar. Comprueba contra los archivos cargados que sean los del caso, señala los tropiezos donde ocurren y, al completar el caso, muestra la función relativa y la impresión del informe para comparar. `?caso=N` en la URL abre el simulador directamente en ese caso.

Enlaces por caso: [1](https://lucianotejadac.github.io/simulador-dmsa/?caso=1) · [2](https://lucianotejadac.github.io/simulador-dmsa/?caso=2) · [3](https://lucianotejadac.github.io/simulador-dmsa/?caso=3) · [4](https://lucianotejadac.github.io/simulador-dmsa/?caso=4) · [5](https://lucianotejadac.github.io/simulador-dmsa/?caso=5) · [6](https://lucianotejadac.github.io/simulador-dmsa/?caso=6) · [7](https://lucianotejadac.github.io/simulador-dmsa/?caso=7) · [8](https://lucianotejadac.github.io/simulador-dmsa/?caso=8) · [9](https://lucianotejadac.github.io/simulador-dmsa/?caso=9) · [10](https://lucianotejadac.github.io/simulador-dmsa/?caso=10).

Cada estudiante necesita además la carpeta de sus casos, con los tres archivos DICOM de cada uno. Los archivos se reconocen por el contenido, no por el nombre.

## Productos

Dos PNG por caso, la página de vistas y la página de cuantificación, más un archivo `.renalproject` que guarda los DICOM y las regiones para retomar el trabajo con **Abrir proyecto…**.

## Archivos

- `index.html`, `dmsa-app.js`, `renal.css`: la aplicación.
- `renal-core.js`, `renal-tutorial.js`: núcleo compartido con el simulador de renograma (lectura NM, dibujo, regiones, exportación, panel de tutorial). Idénticos en ambos repositorios.
- `dmsa-casos.js`: los casos. Clínica desidentificada, hashes de los archivos, particularidades, preguntas y valores del informe.
- `vendor/dicomParser.min.js`: dicom-parser (MIT).
- `BITACORA.md`: registro de decisiones.

## Privacidad y alcance

La aplicación funciona íntegramente en el navegador. Los DICOM no se incluyen en este repositorio ni se envían a ningún servidor. Uso docente: no es un programa validado para diagnóstico ni para decisiones clínicas.

## Licencia

© 2026 Luciano Tejada Castro. Distribuido bajo licencia [MIT](LICENSE).
Los componentes y datos de terceros conservan sus propias licencias, indicadas en este documento o junto a ellos.
