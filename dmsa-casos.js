/* Casos del simulador DMSA. Los datos tecnicos salieron de los DICOM entregados a los
   estudiantes; cada archivo se reconoce por el hash FNV-1a de sus pixeles, no por su nombre.
   La clinica esta desidentificada: sin nombres, RUT, fechas ni firmas. Los valores del informe
   se muestran solo al terminar el caso, para comparar con lo que calculo el alumno. */
'use strict';
const DMSA_TOLERANCIA=5; // puntos porcentuales de diferencia aceptable frente al informe
const DMSA_VISTAS={ap:['Anterior','Posterior'],oad:['OAD','OPI'],oai:['OAI','OPD']};
const DMSA_ROLES={ap:'AP/PA (anterior y posterior)',oad:'oblicuas OAD y OPI',oai:'oblicuas OAI y OPD'};
// Preguntas orales comunes: cinco para los dos casos del estudiante, 10 minutos en total.
const DMSA_PREGUNTAS_ORALES=[
 {titulo:'Indicación y radiofármaco',segundos:90,
  pregunta:'¿Qué pregunta clínica traen tus dos casos y qué responde un DMSA que no responde un renograma? Explica por qué el DMSA se fija en la corteza y por qué se adquiere a las 3 horas.',
  preparar:'Usa el antecedente de cada caso y revisa el radiofármaco y la ventana energética en «Información de la adquisición». Distingue lo que consta en el DICOM de lo que dice el antecedente.'},
 {titulo:'Adquisición y formación de imagen',segundos:120,
  pregunta:'Compara la anterior de un caso con la del otro: matriz, zoom, píxel, cuentas y duración. ¿Por qué duraron distinto si el criterio de paro fue el mismo? ¿Qué le pasa al ruido cuando el riñón capta poco?',
  preparar:'Lee la duración y las cuentas de cada archivo en el paso 1. El paro fue por cuentas en el detector posterior; la duración es la consecuencia.'},
 {titulo:'Cuantificación',segundos:120,
  pregunta:'¿Por qué la función relativa se calcula con la media geométrica de anterior y posterior y no solo con la posterior? Muestra en tus casos cuánto difieren los porcentajes por vista y explica la diferencia por la profundidad de cada riñón.',
  preparar:'Compara en tu tabla el porcentaje posterior, el anterior y la media geométrica. Explica qué hace el fondo perirrenal y qué pasaría sin restarlo.'},
 {titulo:'Anatomía y lectura de las imágenes',segundos:180,
  pregunta:'Señala en tus imágenes: lateralidad en anterior y posterior, tamaño y forma de cada riñón, defectos corticales o retracciones, y qué aportan las oblicuas. Describe sin asumir la causa por el antecedente.',
  preparar:'Prepara un minuto y medio por caso sobre tus PNG. Usa las oblicuas para separar polos y defectos. Reconoce lo que no puedes afirmar sin imagen morfológica.'},
 {titulo:'Decisiones y control de calidad',segundos:90,
  pregunta:'Justifica una decisión propia de cada caso: ventana, umbral del isocontorno, forma del ROI o del fondo. ¿Qué habría cambiado en el porcentaje si hubieras decidido distinto, y cuánto te alejas del informe?',
  preparar:'Anota el umbral y la ventana que usaste. Al terminar el caso el simulador muestra el valor del informe: explica la diferencia, no la escondas.'}
];
const DMSA_CASOS={
 1:{
  titulo:'Riñón izquierdo pequeño, corteza sana',
  resumen:'El caso más limpio: dos riñones bien definidos, fondo bajo, asimetría por tamaño.',
  clinica:{antecedentes:'Estenosis de la unión ureteropiélica izquierda. Pieloplastia izquierda.',
   procedimiento:'Tc-99m DMSA, 4,6 mCi por vía endovenosa. Imágenes posterior, anterior y oblicuas, con cálculo de la función renal por separado.'},
  particularidades:['Cada archivo tiene dos frames: el detector 1 a 180° es la anterior y el detector 2 a 0° la posterior. La lateralidad se invierte entre ambas.',
   'El riñón izquierdo es más chico pero su corteza es homogénea: no confundas menor tamaño con daño cortical.'],
  preguntas:['¿Por qué un riñón más pequeño aporta menos función aunque su corteza esté sana? ¿Qué separa este caso de uno con daño cortical?',
   'La pieloplastia corrigió la obstrucción. ¿Qué esperarías que cambie y qué no en un DMSA años después?',
   'El posterior y el anterior dan porcentajes distintos para el mismo riñón. ¿Cuál está más cerca de la media geométrica y por qué?',
   '¿Qué le agregan las oblicuas a este caso, donde anterior y posterior ya se ven bien?'],
  referencia:{izq:27,der:73,metodo:'media geométrica',impresion:'Función renal relativa asimétrica, secundaria a la diferencia de tamaño. Sin evidencias de daño cortical.'},
  archivos:{ap:'35757fd6',oad:'1c5e6afb',oai:'0751b3e5'}
 },
 2:{
  titulo:'Fondo alto: insuficiencia renal global',
  resumen:'Mucho radiofármaco circulante. El fondo pesa en el cálculo y las siluetas se ven lavadas.',
  clinica:{antecedentes:'Insuficiencia renal postobstructiva. Cáncer cervicouterino etapa IV con hidroureteronefrosis bilateral por compresión de ambos uréteres, manejada con catéter doble J bilateral y recambios recientes. Pielonefritis aguda izquierda complicada. Se dispone de pieloTAC previo.',
   procedimiento:'Tc-99m DMSA, 5,4 mCi por vía endovenosa. Imágenes planares del abdomen a las 3 horas, anterior, posterior y oblicuas. Función renal diferencial.'},
  particularidades:['La actividad de fondo es alta porque los riñones depuran mal: el DMSA que no se fijó sigue circulando. Eso baja el contraste y hace que el ROI de fondo importe más que en los otros casos.',
   'Los dos riñones tienen tamaño normal y simétrico; la asimetría es de intensidad, no de tamaño.'],
  preguntas:['¿Por qué la insuficiencia renal global se traduce en fondo alto en un DMSA? ¿Qué fracción de la dosis se fija en la corteza en un riñón sano?',
   'Si no restaras el fondo, ¿hacia dónde se movería el porcentaje del riñón menos captante? Razónalo con tus cuentas.',
   'Catéteres doble J bilaterales: ¿se ven en la imagen? ¿Qué buscarías en el sistema colector de cada riñón?',
   'La captación izquierda es menor de forma difusa y homogénea. ¿Qué diferencia eso de una retracción focal, y qué implica clínicamente?'],
  referencia:{izq:39,der:61,metodo:'media geométrica',impresion:'Asimetría de intensidad de captación por menor captación izquierda difusa y homogénea, con leve compromiso de la función diferencial, sin asimetría de tamaño. Signos indirectos de insuficiencia renal global.'},
  archivos:{ap:'4daf93bb',oad:'c29af2f6',oai:'2f106288'}
 },
 3:{
  titulo:'Riñón izquierdo casi ausente',
  resumen:'El riñón izquierdo apenas supera el fondo. Cuantificar algo que casi no se ve.',
  clinica:{antecedentes:'Hidronefrosis con estrechez ureteral.',
   procedimiento:'Tc-99m DMSA, 7,64 mCi por vía endovenosa. Imágenes planares a las 3 horas, anterior, posterior y oblicuas. Función renal relativa.'},
  particularidades:['El riñón izquierdo es una silueta tenue, apenas sobre el fondo. El isocontorno puede quedar en nada o derramarse por el fondo: usa polígono, o ajusta el umbral y revisa.',
   'Los ángulos registrados para las oblicuas son 180° y 0°, iguales a los de la anterior y posterior. Fíjate si la imagen es realmente oblicua.'],
  preguntas:['Un riñón que aporta 1 % ¿existe funcionalmente? ¿Qué decisión clínica depende de ese número y con qué incertidumbre lo darías?',
   'Dibujar un ROI sobre algo que casi no se ve: ¿qué criterio usaste para el borde y cuánto cambia el resultado si lo agrandas?',
   'Hidronefrosis con estrechez ureteral y un riñón que no capta: ¿qué secuencia fisiopatológica une el antecedente con la imagen?',
   'Los ángulos de las oblicuas en la cabecera no cambiaron. ¿Cómo distingues una oblicua real de un rótulo mal puesto, mirando la imagen?'],
  referencia:{izq:1,der:99,metodo:'media geométrica',impresion:'Riñón izquierdo con acentuada disminución difusa de captación parenquimatosa, sin contribuir de forma significativa a la función renal global. Riñón derecho de aspecto normal.'},
  archivos:{ap:'7a55df16',oad:'e5615a92',oai:'93672b46'}
 },
 4:{
  titulo:'Defecto sutil a derecha',
  resumen:'Riñones simétricos de tamaño; el derecho capta un poco menos y tiene una retracción inferolateral fina.',
  clinica:{antecedentes:'46 años. Hidronefrosis derecha. UroTAC previo con estenosis de un corto segmento del uréter pelviano derecho, manejada con catéter de nefrostomía.',
   procedimiento:'Tc-99m DMSA, 5,5 mCi por vía endovenosa. Estáticas AP-PA y oblicuas posteriores. Función renal relativa.'},
  particularidades:['La diferencia es sutil: 60/40 con riñones del mismo tamaño. El resultado depende de que los ROI sean comparables entre ambos lados.',
   'La retracción inferolateral derecha es tenue; búscala en la oblicua que separa mejor el polo inferior.'],
  preguntas:['¿Qué distingue una retracción cortical de un simple contorno irregular por ruido? ¿Con qué ventana la buscaste?',
   'Con riñones del mismo tamaño, ¿a qué atribuyes una diferencia de 20 puntos en la función relativa?',
   'Nefrostomía derecha: ¿qué cambia en la fisiología del riñón derecho respecto de un riñón obstruido sin drenaje?',
   'Si tu porcentaje da 55/45 en vez de 60/40, ¿es un error tuyo, del método o está dentro de lo esperable? ¿Cómo lo decidirías?'],
  referencia:{izq:60,der:40,metodo:'media geométrica',impresion:'Función renal relativa asimétrica, leve a moderadamente disminuida a derecha, con leve disminución global de la captación derecha y retracción cortical inferolateral, sugerente de leve daño parenquimatoso secundario.'},
  archivos:{ap:'ebd57bcd',oad:'edcaae27',oai:'12398a2d'}
 },
 5:{
  titulo:'Enfermedad renal crónica bilateral',
  resumen:'Riñón derecho pequeño y tenue; izquierdo heterogéneo y horizontalizado. Adquisiciones largas por la baja tasa de cuentas.',
  clinica:{antecedentes:'66 años. Enfermedad renal crónica. Se cuenta con un cintigrama renal dinámico reciente para comparar.',
   procedimiento:'Tc-99m DMSA, 4,7 mCi por vía endovenosa. Imágenes AP-PA y oblicuas.'},
  particularidades:['Las estáticas duraron entre 395 y 461 segundos para llegar a las cuentas programadas: el doble que en otros casos. Es la señal de que ambos riñones captan poco.',
   'Se retiró de la carpeta una oblicua abortada a los 22 segundos; si la ves mencionada en la discusión, era una adquisición interrumpida y repetida.',
   'El riñón izquierdo está horizontalizado y con áreas fotopénicas en los polos: no lo confundas con un riñón sano y grande.'],
  preguntas:['¿Qué te dice la duración de las adquisiciones sobre la función renal global antes de mirar la imagen?',
   'El riñón izquierdo aporta 74 % pero tiene retracciones. ¿Es un riñón sano? ¿Qué significa «compensatorio» en este contexto?',
   'Hay un renograma previo. ¿Qué información aporta un dinámico que el DMSA no da, y viceversa?',
   'Áreas fotopénicas polares y retracciones: ¿cómo separas en la imagen el daño cortical de un sistema colector dilatado?'],
  referencia:{izq:74.4,der:25.6,metodo:'media geométrica',impresion:'Función renal relativa asimétrica, moderada a severamente disminuida a derecha, compatible con daño parenquimatoso secundario difuso. Riñón izquierdo de aspecto compensatorio, con signos de daño parenquimatoso secundario leve.'},
  archivos:{ap:'46615c36',oad:'4cf464ad',oai:'e73d87b8'}
 },
 6:{
  titulo:'Hidronefrosis izquierda grande con daño cortical',
  resumen:'Riñón izquierdo aumentado con una gran área hipocaptante central; derecho con fijación irregular en el tercio inferior.',
  clinica:{antecedentes:'58 años. Litiasis ureteral izquierda. Antecedente reciente de pielonefritis.',
   procedimiento:'Tc-99m DMSA, 6,9 mCi por vía endovenosa. Imágenes anterior, posterior, oblicuas anteriores y posteriores. Función renal relativa.'},
  particularidades:['El riñón izquierdo es más grande pero capta menos: tamaño y función van en direcciones opuestas. El área central hipocaptante es el sistema colector dilatado.',
   'Este caso tiene oblicuas anteriores y posteriores; el informe midió los riñones en centímetros sobre la imagen.'],
  preguntas:['Un riñón grande con captación baja y centro vacío: ¿qué estructura ocupa el centro y por qué no capta DMSA?',
   'El informe da medidas en centímetros sobre la imagen cintigráfica. ¿Con qué píxel las calcularías y qué error tienen?',
   'Pielonefritis reciente y litiasis: ¿qué hallazgo esperarías de cada una y cuál domina aquí?',
   'El riñón derecho también tiene un defecto inferior. ¿Cómo describes un defecto sin sobreinterpretarlo cuando el otro riñón concentra la atención?'],
  referencia:{izq:32,der:68,metodo:'media geométrica',impresion:'Hipofunción renal relativa izquierda moderada, con signos de importante hidronefrosis y daño parenquimatoso cortical. Riñón derecho con evidencias de daño cortical inferior, probablemente asociado a leve hidronefrosis.'},
  archivos:{ap:'acd0f2ba',oad:'31ba7efb',oai:'e30dafa8'}
 },
 7:{
  titulo:'Un solo riñón funcionante',
  resumen:'Donde debería estar el riñón derecho hay un foco tenue de 26 × 27 mm. El izquierdo lo hace todo.',
  clinica:{antecedentes:'Sospecha de riñón poliquístico.',
   procedimiento:'Tc-99m DMSA, 8,0 mCi por vía endovenosa. Imágenes estáticas de la región lumbar con cuantificación de la función renal diferencial.'},
  particularidades:['La anterior y la posterior se detuvieron por tiempo a los 180 segundos, con 1,2 y 2,1 millones de cuentas: la tasa era alta porque un solo riñón concentra toda la dosis. Las oblicuas duraron 52 y 63 segundos.',
   'El foco derecho es tenue y pequeño. Decide si lo incluyes como riñón y cómo dibujas un ROI de 26 mm.'],
  preguntas:['¿Por qué las adquisiciones fueron tan cortas aquí y tan largas en el caso 5? Relaciona el criterio de paro con la función renal.',
   'El riñón izquierdo mide 13 cm y aporta 99 %. ¿Qué significa hipertrofia compensatoria y qué límite tiene?',
   'Un foco de 26 × 27 mm que capta poco: ¿riñón atrófico, quiste con corteza residual, o artefacto? ¿Qué estudio lo resolvería?',
   'Con un riñón de 1 %, ¿tiene sentido la media geométrica? ¿Qué pasa con el cálculo cuando las cuentas netas se acercan a cero o son negativas?'],
  referencia:{izq:99,der:1,metodo:'media geométrica',impresion:'Foco de tenue actividad donde debería visualizarse el riñón derecho, que no aporta de forma significativa a la función diferencial. Riñón izquierdo dentro de límites normales, con leve aumento de tamaño probablemente compensatorio.'},
  archivos:{ap:'bc933b80',oad:'e1d21c7b',oai:'4da7d58b'}
 },
 8:{
  titulo:'Defectos en cuña y sistema excretor dilatado',
  resumen:'Riñón izquierdo aumentado, contornos irregulares, defectos basales y en cuña, dilatación central. Derecho conservado.',
  clinica:{antecedentes:'74 años. Ureterolitiasis proximal izquierda sintomática. Bolsa hidronefrótica izquierda.',
   procedimiento:'Tc-99m DMSA, 4,9 mCi por vía endovenosa. Imágenes anterior, posterior, oblicuas anteriores y posteriores. Función renal relativa.'},
  particularidades:['Los ángulos de las oblicuas están invertidos respecto de los demás casos: OAD quedó registrada a 138° y OPI a −42°. Compara con el caso 1 y piensa qué pasó con el detector o con el paciente.',
   'Los porcentajes del informe suman 103: un error de tipeo del original. Tu cálculo debe sumar 100; compara con el lado derecho.'],
  preguntas:['Defecto «en cuña» posterolateral: ¿qué patrón vascular o infeccioso produce esa forma y por qué la oblicua lo muestra mejor?',
   'Los ángulos de detector de las oblicuas están invertidos respecto de los otros casos. ¿Qué implica para la lateralidad de los rótulos y cómo lo verificarías con la imagen?',
   'Los porcentajes del informe suman 103. ¿Cómo pudo pasar y qué control de calidad lo habría evitado?',
   'Bolsa hidronefrótica con corteza conservada en parte: ¿qué le dice al urólogo la función relativa de 27 % antes de decidir entre conservar o extirpar?'],
  referencia:{izq:26.8,der:76.2,metodo:'media geométrica',impresion:'Hipofunción renal relativa izquierda moderada a severa, en contexto de importante daño parenquimatoso y dilatación del sistema excretor. Función renal derecha conservada.'},
  archivos:{ap:'5ec14402',oad:'195d4890',oai:'86212a76'}
 },
 9:{
  titulo:'Hidronefrosis con corteza adelgazada',
  resumen:'Riñón izquierdo de 17,5 cm apenas visible: una fina cáscara de corteza alrededor de un sistema dilatado.',
  clinica:{antecedentes:'Compromiso renal izquierdo. Estenosis de la unión ureteropiélica izquierda.',
   procedimiento:'Tc-99m DMSA, 3,9 mCi por vía endovenosa. Imágenes estáticas de la región lumbar con cuantificación de la función renal diferencial.'},
  particularidades:['La corteza izquierda es una lámina fina y periférica; el isocontorno la partirá en pedazos. Aquí conviene el polígono siguiendo el borde externo.',
   'Es la dosis más baja de la serie, 3,9 mCi, con adquisiciones de 315 a 466 segundos.'],
  preguntas:['¿Por qué un riñón hidronefrótico se ve grande en el cintigrama pero funciona poco? Relaciona tamaño, corteza y presión.',
   'Al dibujar un ROI que incluye el centro vacío, ¿cambia el resultado respecto de uno que sigue solo la corteza? Razónalo con el fondo.',
   'El informe mide 17,5 cm y advierte «no anatómica». ¿Qué significa medir sobre una imagen funcional?',
   'Un 11,5 % con esta morfología: ¿qué le importa al cirujano, el porcentaje o la forma? ¿Qué aportaría un renograma con diurético?'],
  referencia:{izq:11.5,der:88.5,metodo:'media geométrica',impresion:'Marcado compromiso funcional del riñón izquierdo con signos cintigráficos de hidronefrosis, significativo adelgazamiento cortical y dilatación del sistema pielocalicial. Riñón derecho dentro de límites normales.'},
  archivos:{ap:'5b9ae77e',oad:'9daf0a1d',oai:'ac26b98e'}
 },
 10:{
  titulo:'Atrofia izquierda de causa vascular',
  resumen:'Riñón izquierdo pequeño, tenue, con retracción en el tercio medio. Un antecedente distinto a la obstrucción.',
  clinica:{antecedentes:'Aneurisma abdominal con compromiso renal.',
   procedimiento:'Tc-99m DMSA, 6 mCi por vía endovenosa. Imágenes de siluetas renales en proyecciones anterior, posterior y oblicuas. Función renal diferencial con media geométrica.'},
  particularidades:['El antecedente es vascular, no obstructivo: piensa en isquemia y no en presión.',
   'El riñón izquierdo es chico y tenue pero sí se ve; el isocontorno funciona si la semilla cae dentro y el umbral no es tan bajo que tome el fondo.'],
  preguntas:['¿Cómo llega un aneurisma abdominal a comprometer un riñón? ¿Qué patrón esperarías en un DMSA por isquemia frente a uno por obstrucción?',
   'Retracción cortical en el tercio medio y disminución difusa: ¿qué mecanismo explica cada hallazgo?',
   'La diferenciación corticomedular «adecuada» del riñón derecho: ¿qué es lo que se ve y por qué se pierde en un riñón dañado?',
   '¿Qué estudio complementario pedirías para decidir si el riñón izquierdo es recuperable?'],
  referencia:{izq:19,der:81,metodo:'media geométrica',impresion:'Moderada a severa disminución de la función renal izquierda, asociada a atrofia parenquimatosa y signos de daño secundario. Función renal derecha conservada.'},
  archivos:{ap:'d890137e',oad:'c7b5a40b',oai:'f22e0d03'}
 },
 11:{
  titulo:'Riñón derecho en anillo (reserva)',
  resumen:'Hidroureteronefrosis derecha: el riñón derecho es un anillo de corteza con centro vacío. Sin informe disponible.',
  clinica:{antecedentes:'77 años. Hidroureteronefrosis derecha con sospecha de atrofia renal. Se dispone de informe de uroTC previo.',
   procedimiento:'Tc-99m DMSA por vía endovenosa. Imágenes anterior, posterior y oblicuas.'},
  particularidades:['Caso de reserva: no hay informe, así que al final no habrá valor de referencia. El fondo es muy alto y las adquisiciones duraron de 483 a 591 segundos.',
   'El riñón derecho es un anillo: decide si el ROI incluye el centro vacío y qué pasa con el fondo.'],
  preguntas:['Un riñón en anillo: ¿qué hay en el centro y qué le pasó a la corteza?',
   'Sin informe, ¿cómo defenderías tu porcentaje? ¿Qué controles internos tiene tu propio cálculo?',
   'Fondo alto y adquisiciones largas: ¿qué dicen sobre la función global?',
   '¿Qué aportaría el uroTC que ya existe y qué no?'],
  referencia:null,
  archivos:{ap:'e0e7efa6',oad:'4aec54f8',oai:'16a044a7'}
 }
};
/* Devuelve {caso, rol} del archivo cuyo hash de pixeles coincide, o null. */
function dmsaReconocer(hash){for(const [n,c] of Object.entries(DMSA_CASOS))for(const [rol,h] of Object.entries(c.archivos))if(h===hash)return {caso:Number(n),rol};return null;}
function dmsaNormalizaVista(v){const s=String(v||'').trim().toUpperCase();if(s.startsWith('ANT'))return 'Anterior';if(s.startsWith('POST'))return 'Posterior';return s;}
