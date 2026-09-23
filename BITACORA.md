# Bitácora de decisiones

Registro de lo que se pidió, lo que se decidió y por qué, para los dos simuladores renales: DMSA (este repositorio) y renograma (`lucianotejadac/simulador-renograma`). Esquema de un registro de decisiones (ADR): contexto, decisión, alternativas descartadas, consecuencias. Los detalles de implementación están en los mensajes de commit.

Sin datos de pacientes.

---

## 2026-09-22 y 23 · De la carpeta de casos a los dos simuladores

Participantes: Luciano Tejada (docente) y Claude (Claude Code).

### 1. Revisión de la carpeta antes de construir

**Contexto.** Veinte casos reales exportados del equipo, diez DMSA y diez renogramas MAG3, cada uno con crudos NM, pantallas procesadas e informe en PDF. Se pidió revisar todo antes de proponer nada, sin inventar.

**Hallazgos que cambiaron el plan.**
- El caso 10 de DMSA era copia byte a byte del caso 9 con el informe de otra persona. Se reemplazó por un caso nuevo con informe (2R) y se guardó otro sin informe como reserva (caso 11).
- Las dinámicas repetidas dentro de cada renograma eran copias exactas; solo el caso 7 tiene dos detectores.
- Las pantallas procesadas y los PDF llevan nombre y RUT quemados; tres informes DICOM conservaban la identidad en la cabecera; y `RetrieveAETitle` decía el nombre de la institución en todos los archivos. Nada de eso va a los alumnos.

**Decisión.** Una carpeta de entrega por estudiante, con solo los crudos, desidentificados: sin tags privados, UID regenerados, nombre de paciente reemplazado por «DMSA CASO n», copias repetidas y adquisiciones abortadas fuera. Los archivos se reconocen en el simulador por el hash FNV-1a de sus píxeles, que no cambia con la limpieza y no publica identificadores.

### 2. Dos simuladores, con la lógica del óseo

**Decisión.** Dos repositorios, `simulador-dmsa` y `simulador-renograma`, que comparten `renal-core.js`, `renal-tutorial.js` y `renal.css` como copias idénticas, igual que el manifiesto de paratiroides. Del simulador óseo se toma la lógica, no el código: carga local, tutorial por pasos con «haz esto / qué debería aparecer / si no ocurre», comprobaciones contra el archivo cargado, cinco preguntas orales en 10 minutos, PNG y proyecto. Lo nuevo es el procesamiento: regiones de interés y cálculo.

**Descartado.** Un solo repositorio con dos modos; construir sobre el `index.html` del óseo, que es un compositor de páginas de 500 KB pensado para otra tarea.

**Otras decisiones del docente.** El simulador pregunta solo el número de caso; los valores del informe se revelan al terminar para comparar, con tolerancia de 5 puntos; solo PNG como producto; estilo Windows 95.

### 3. Cómo se calcula la función relativa y cómo se validó

**Decisión.** Cuentas netas por región con fondo perirrenal restado por píxel; porcentaje por vista; media geométrica de anterior y posterior. El fondo se genera automáticamente como una media luna lateral entre 4 y 8 píxeles del riñón, editable. El isocontorno se traza sobre la imagen suavizada (sigma 1 píxel) para seguir el órgano y no el ruido, pero las cuentas se miden en la imagen original. El umbral por omisión es 40 % del máximo local y el crecimiento queda limitado a una ventana de 110 mm alrededor del pico: sin ese límite, un umbral bajo en un paciente con fondo alto se derramaba por todo el campo.

**Validación.** Prueba sin interfaz en Chrome, con los DICOM de la entrega, que recorre los 11 casos como un estudiante: carga, adquisición, marcas de lateralidad mal y bien puestas, regiones, confirmación, exportación, y el archivo de otro caso como error deliberado. Las regiones de prueba son la envolvente convexa del isocontorno, que emula un ROI dibujado a mano e incluye el centro hipocaptante de un riñón hidronefrótico; en tres casos con riñones irregulares (6, 8 y 9) se usan polígonos fijos. Los diez casos con informe quedaron dentro de la tolerancia; la mayor diferencia fue de 4,3 puntos en el caso 8. 176 comprobaciones, 0 fallas.

**Lo que enseñó.** El isocontorno solo no reproduce al equipo en riñones irregulares: excluye el centro vacío y da porcentajes muy bajos. Por eso el tutorial manda a polígono en esos casos y la diferencia con el informe se lleva a la discusión, no se corrige para que calce.

### Pendientes

- Renograma: en construcción en su propio repositorio, con la misma estructura.
- Versionar las URL de los scripts al publicar cambios, para el caché del navegador.
