/* =========================================================
   PISTA — Asistente Virtual (modo 100% local, sin backend)
   - Árbol conversacional de 5 etapas
   - Persistencia en localStorage
   - Registro en consola de cada interacción
   - Reconocimiento de palabras clave en texto libre
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. CONSTANTES Y REFERENCIAS DEL DOM
  --------------------------------------------------------- */

  const STORAGE_KEY = 'pista_chat_history';
  const STATE_KEY = 'pista_chat_state';

  const MSG_ENVIO_LOCAL =
    '¡Gracias! Tus datos han sido registrados en la vista previa local. ' +
    'Cuando activemos el servidor, se guardarán automáticamente.';

  const fab = document.getElementById('pista-fab');
  const chatWindow = document.getElementById('pista-chat');
  const closeBtn = document.getElementById('pista-close');
  const resetBtn = document.getElementById('pista-reset');
  const messagesEl = document.getElementById('pista-messages');
  const quickRepliesEl = document.getElementById('pista-quick-replies');
  const inputForm = document.getElementById('pista-input-form');
  const inputEl = document.getElementById('pista-input');

  /* ---------------------------------------------------------
     1. ESTADO DE LA CONVERSACIÓN
  --------------------------------------------------------- */

  // "context" guarda en qué punto del árbol estamos y los datos
  // capturados durante el flujo de contacto (Fase 5).
  let context = {
    step: 'inicio',
    contacto: { nombre: '', empresa: '', correo: '', necesidad: '' }
  };

  /* ---------------------------------------------------------
     2. PERSISTENCIA (localStorage + consola)
  --------------------------------------------------------- */

  function guardarHistorialLocal(entrada) {
    try {
      const historialPrevio = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      historialPrevio.push(entrada);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historialPrevio));
    } catch (error) {
      console.error('[PISTA] Error al guardar en localStorage:', error);
    }
  }

  function guardarEstado() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(context));
    } catch (error) {
      console.error('[PISTA] Error al guardar estado:', error);
    }
  }

  function registrarEnConsola(rol, texto) {
    const marcaTiempo = new Date().toLocaleTimeString('es-CO');
    console.log(`[PISTA] (${marcaTiempo}) ${rol.toUpperCase()}: ${texto}`);
  }

  function cargarHistorialGuardado() {
    try {
      const historial = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      historial.forEach((entrada) => {
        pintarBurbuja(entrada.rol, entrada.texto, false);
      });
      return historial.length > 0;
    } catch (error) {
      console.error('[PISTA] Error al leer historial:', error);
      return false;
    }
  }

  function cargarEstadoGuardado() {
    try {
      const estadoGuardado = JSON.parse(localStorage.getItem(STATE_KEY));
      if (estadoGuardado) context = estadoGuardado;
    } catch (error) {
      console.error('[PISTA] Error al leer estado:', error);
    }
  }

  function reiniciarConversacion() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATE_KEY);
    context = { step: 'inicio', contacto: { nombre: '', empresa: '', correo: '', necesidad: '' } };
    messagesEl.innerHTML = '';
    quickRepliesEl.innerHTML = '';
    iniciarConversacion();
  }

  /* ---------------------------------------------------------
     3. RENDERIZADO EN PANTALLA
  --------------------------------------------------------- */

  function pintarBurbuja(rol, texto, hacerScroll = true) {
    const fila = document.createElement('div');
    fila.className = `pista-msg-row ${rol}`;

    const burbuja = document.createElement('div');
    burbuja.className = 'pista-bubble';
    burbuja.textContent = texto;

    fila.appendChild(burbuja);
    messagesEl.appendChild(fila);

    if (hacerScroll) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function mostrarIndicadorEscribiendo() {
    const fila = document.createElement('div');
    fila.className = 'pista-msg-row bot';
    fila.id = 'pista-typing-indicator';

    const typing = document.createElement('div');
    typing.className = 'pista-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';

    fila.appendChild(typing);
    messagesEl.appendChild(fila);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function ocultarIndicadorEscribiendo() {
    const indicador = document.getElementById('pista-typing-indicator');
    if (indicador) indicador.remove();
  }

  function limpiarChips() {
    quickRepliesEl.innerHTML = '';
  }

  function mostrarChips(opciones) {
    limpiarChips();
    opciones.forEach((opcion) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pista-chip';
      chip.textContent = opcion.etiqueta;
      chip.addEventListener('click', () => manejarSeleccionUsuario(opcion));
      quickRepliesEl.appendChild(chip);
    });
  }

  /* ---------------------------------------------------------
     4. MENSAJES DEL BOT Y DEL USUARIO (registro completo)
  --------------------------------------------------------- */

  function botDice(texto, opciones = [], retardoMs = 500) {
    mostrarIndicadorEscribiendo();
    return new Promise((resolve) => {
      setTimeout(() => {
        ocultarIndicadorEscribiendo();
        pintarBurbuja('bot', texto);
        registrarEnConsola('bot', texto);
        guardarHistorialLocal({ rol: 'bot', texto, ts: Date.now() });
        if (opciones.length) mostrarChips(opciones);
        else limpiarChips();
        resolve();
      }, retardoMs);
    });
  }

  function usuarioDice(texto) {
    pintarBurbuja('user', texto);
    registrarEnConsola('usuario', texto);
    guardarHistorialLocal({ rol: 'user', texto, ts: Date.now() });
    limpiarChips();
  }

  /* ---------------------------------------------------------
     5. MENÚ PRINCIPAL (5 ETAPAS)
  --------------------------------------------------------- */

  const OPCIONES_MENU = [
    { etiqueta: '1. Diagnóstico y Necesidades', valor: 'fase1' },
    { etiqueta: '2. Cotización y Soluciones', valor: 'fase2' },
    { etiqueta: '3. Custodia del Dinero (Escrow)', valor: 'fase3' },
    { etiqueta: '4. Pruebas y Desarrollo', valor: 'fase4' },
    { etiqueta: '5. Entrega y Hablar con Asesor', valor: 'fase5' }
  ];

  async function mostrarMenuPrincipal(conSaludo = false) {
    context.step = 'menu';
    guardarEstado();
    if (conSaludo) {
      await botDice(
        '¿En qué etapa te puedo ayudar hoy? Elige una opción o escríbeme tu duda directamente.'
      );
    }
    await botDice('Menú principal:', OPCIONES_MENU, 350);
  }

  /* ---------------------------------------------------------
     6. FASE 1 — DIAGNÓSTICO Y NECESIDADES
  --------------------------------------------------------- */

  const OPCIONES_DIAGNOSTICO = [
    { etiqueta: 'Automatización de Datos', valor: 'diag_data' },
    { etiqueta: 'RPA (Procesos)', valor: 'diag_rpa' },
    { etiqueta: 'Inteligencia Artificial', valor: 'diag_ia' },
    { etiqueta: 'Compatibilidad Legacy', valor: 'diag_legacy' }
  ];

  async function iniciarFase1() {
    context.step = 'fase1';
    guardarEstado();
    await botDice(
      'Fase 1 · Diagnóstico y Necesidades\n\n' +
      'Antes de proponerte una solución, necesitamos entender tu punto de partida. ' +
      '¿Cuál describe mejor tu necesidad principal en este momento?'
    );
    await botDice('Selecciona una opción:', OPCIONES_DIAGNOSTICO, 300);
  }

  const RESPUESTAS_DIAGNOSTICO = {
    diag_data: 'Perfilamiento: Datos.\n\n' +
      'Trabajamos en la limpieza, integración y estructuración de datos dispersos ' +
      '(hojas de cálculo, ERPs, bases de datos) para dejarlos listos y confiables para análisis o automatización. ' +
      'Un consultor de datos revisará tus fuentes actuales antes de proponer una arquitectura concreta.',
    diag_rpa: 'Perfilamiento: RPA (Automatización de Procesos).\n\n' +
      'Diseñamos robots de software que ejecutan tareas repetitivas (formularios, conciliaciones, reportes) ' +
      'sin intervención manual. El alcance exacto depende del proceso actual, por lo que un consultor mapeará ' +
      'el flujo antes de definir el robot a construir.',
    diag_ia: 'Perfilamiento: Inteligencia Artificial.\n\n' +
      'Desarrollamos modelos o integramos IA (clasificación, generación de texto, predicción) sobre tus datos ' +
      'y procesos existentes. Cada caso de uso de IA requiere validación de viabilidad con un especialista antes de cotizar.',
    diag_legacy: 'Perfilamiento: Compatibilidad con sistemas Legacy.\n\n' +
      'Construimos puentes (APIs, conectores, capas de integración) entre tus sistemas antiguos y las nuevas ' +
      'soluciones de Data, RPA o IA, sin necesidad de reemplazar la infraestructura actual. ' +
      'Esto requiere una revisión técnica puntual de tu sistema para confirmar compatibilidad.'
  };

  async function responderDiagnostico(valor) {
    const texto = RESPUESTAS_DIAGNOSTICO[valor];
    await botDice(texto);
    await botDice(MSG_ENVIO_LOCAL);
    await botDice(
      '¿Quieres continuar con la Fase 2 (Cotización y Soluciones) o volver al menú principal?',
      [
        { etiqueta: 'Ir a Cotización', valor: 'fase2' },
        { etiqueta: 'Menú principal', valor: 'menu' }
      ],
      300
    );
  }

  /* ---------------------------------------------------------
     7. FASE 2 — COTIZACIÓN Y SOLUCIONES
  --------------------------------------------------------- */

  const OPCIONES_ARQUITECTURA = [
    { etiqueta: 'Cloud (Nube)', valor: 'arq_cloud' },
    { etiqueta: 'On-premise (Local)', valor: 'arq_onpremise' },
    { etiqueta: 'Híbrida', valor: 'arq_hibrida' }
  ];

  async function iniciarFase2() {
    context.step = 'fase2';
    guardarEstado();
    await botDice(
      'Fase 2 · Cotización y Soluciones\n\n' +
      'Trabajamos con tres niveles de paquete, todos ajustables según el diagnóstico previo:\n\n' +
      '• Starter — Automatización puntual de un proceso o flujo de datos específico.\n' +
      '• Pro — Integración de varios procesos/fuentes con monitoreo y soporte continuo.\n' +
      '• Enterprise — Arquitectura a medida, múltiples sistemas y acompañamiento dedicado.\n\n' +
      'El precio final no se fija aquí: se calcula tras el diagnóstico técnico y se formaliza en una propuesta firmada. ' +
      'Nunca ofrecemos cifras cerradas sin ese análisis previo.'
    );
    await botDice(
      '¿Sobre qué tipo de arquitectura te gustaría desplegar la solución?',
      OPCIONES_ARQUITECTURA,
      300
    );
  }

  const RESPUESTAS_ARQUITECTURA = {
    arq_cloud: 'Arquitectura Cloud seleccionada. Es la opción más ágil para escalar y suele ser la de menor costo de mantenimiento inicial.',
    arq_onpremise: 'Arquitectura On-premise seleccionada. Es la opción recomendada cuando hay restricciones regulatorias o de datos sensibles que exigen infraestructura propia.',
    arq_hibrida: 'Arquitectura Híbrida seleccionada. Combina servidores propios para lo sensible con la nube para lo escalable; suele ser la más usada en compatibilidad con sistemas Legacy.'
  };

  async function responderArquitectura(valor) {
    const texto = RESPUESTAS_ARQUITECTURA[valor];
    await botDice(texto);
    await botDice(
      'Un consultor de PISTA debe validar el alcance final antes de emitir una cotización formal. ' +
      '¿Te gustaría conocer ahora cómo protegemos tu inversión con el modelo de Custodia (Escrow), ' +
      'o prefieres hablar directamente con un asesor?'
    );
    await botDice('¿Cómo continuamos?', [
      { etiqueta: 'Ver Custodia (Escrow)', valor: 'fase3' },
      { etiqueta: 'Hablar con Asesor', valor: 'fase5' },
      { etiqueta: 'Menú principal', valor: 'menu' }
    ], 300);
  }

  /* ---------------------------------------------------------
     8. FASE 3 — CUSTODIA DEL DINERO (ESCROW)
  --------------------------------------------------------- */

  async function iniciarFase3() {
    context.step = 'fase3';
    guardarEstado();
    await botDice(
      'Fase 3 · Custodia del Dinero (Escrow)\n\n' +
      'PISTA opera bajo un modelo de garantía fiduciaria (Escrow): el pago acordado no llega directamente a PISTA. ' +
      'Se deposita en custodia de un tercero de confianza mientras dura el periodo de prueba del desarrollo.\n\n' +
      'El dinero solo se libera a PISTA cuando tú, como cliente, confirmas que la solución cumple los criterios ' +
      'de aprobación acordados. Si no se cumplen, los fondos permanecen resguardados y se negocian los ajustes necesarios.'
    );
    await botDice(
      '¿Quieres ver en detalle cómo funciona el entorno de pruebas (Sandbox) y los criterios de liberación de pago?',
      [
        { etiqueta: 'Ver Fase 4: Pruebas', valor: 'fase4' },
        { etiqueta: 'Hablar con Asesor', valor: 'fase5' },
        { etiqueta: 'Menú principal', valor: 'menu' }
      ],
      350
    );
  }

  /* ---------------------------------------------------------
     9. FASE 4 — PRUEBAS Y DESARROLLO
  --------------------------------------------------------- */

  async function iniciarFase4() {
    context.step = 'fase4';
    guardarEstado();
    await botDice(
      'Fase 4 · Pruebas y Desarrollo\n\n' +
      'Todo desarrollo se entrega primero en un entorno Sandbox aislado, separado de tus sistemas productivos, ' +
      'para que puedas probarlo sin ningún riesgo operativo.\n\n' +
      'Los criterios de aprobación para liberar el pago en custodia (Escrow) se definen desde la Fase 2 y ' +
      'típicamente incluyen: pruebas funcionales (UAT) exitosas, cumplimiento del alcance firmado y una lista ' +
      'de verificación (checklist) firmada por ambas partes.\n\n' +
      'Solo cuando das tu aprobación formal sobre ese checklist, se instruye la liberación de fondos desde la custodia.'
    );
    await botDice(
      '¿Deseas coordinar estos criterios con un asesor humano para tu caso puntual?',
      [
        { etiqueta: 'Hablar con Asesor', valor: 'fase5' },
        { etiqueta: 'Menú principal', valor: 'menu' }
      ],
      300
    );
  }

  /* ---------------------------------------------------------
     10. FASE 5 — ENTREGA Y HABLAR CON ASESOR (captura guiada)
  --------------------------------------------------------- */

  async function iniciarFase5() {
    context.step = 'fase5_nombre';
    guardarEstado();
    await botDice(
      'Fase 5 · Entrega y Hablar con Asesor\n\n' +
      'Perfecto, para conectarte con un KAM (Key Account Manager) de PISTA necesito algunos datos. ' +
      'Puedes escribir "cancelar" en cualquier momento para volver al menú.\n\n' +
      'Para empezar, ¿cuál es tu nombre completo?'
    );
  }

  async function procesarCapturaContacto(textoUsuario) {
    const texto = textoUsuario.trim();

    if (texto.toLowerCase() === 'cancelar') {
      await botDice('De acuerdo, cancelé el registro de contacto. Volvamos al menú principal.');
      await mostrarMenuPrincipal();
      return;
    }

    switch (context.step) {
      case 'fase5_nombre':
        context.contacto.nombre = texto;
        context.step = 'fase5_empresa';
        guardarEstado();
        await botDice(`Gracias, ${texto.split(' ')[0]}. ¿Cuál es el nombre de tu empresa?`);
        break;

      case 'fase5_empresa':
        context.contacto.empresa = texto;
        context.step = 'fase5_correo';
        guardarEstado();
        await botDice('¿Cuál es tu correo electrónico de contacto?');
        break;

      case 'fase5_correo':
        if (!validarCorreo(texto)) {
          await botDice(
            'Ese correo no parece válido (revisa que tenga el formato nombre@dominio.com). ' +
            '¿Puedes escribirlo de nuevo?'
          );
          return;
        }
        context.contacto.correo = texto;
        context.step = 'fase5_necesidad';
        guardarEstado();
        await botDice('Por último, cuéntame en una frase cuál es tu necesidad principal.');
        break;

      case 'fase5_necesidad':
        context.contacto.necesidad = texto;
        guardarEstado();
        await finalizarCapturaContacto();
        break;

      default:
        break;
    }
  }

  function validarCorreo(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  async function finalizarCapturaContacto() {
    const { nombre, empresa, correo, necesidad } = context.contacto;
    await botDice(
      'Este es el resumen de tu solicitud:\n\n' +
      `• Nombre: ${nombre}\n` +
      `• Empresa: ${empresa}\n` +
      `• Correo: ${correo}\n` +
      `• Necesidad: ${necesidad}`
    );
    await botDice(MSG_ENVIO_LOCAL);
    await botDice(
      'Un KAM de PISTA revisará esta información y se pondrá en contacto contigo por correo.'
    );
    context.step = 'menu';
    guardarEstado();
    await mostrarMenuPrincipal();
  }

  /* ---------------------------------------------------------
     11. DESPACHADOR DE OPCIONES (chips)
  --------------------------------------------------------- */

  async function manejarSeleccionUsuario(opcion) {
    usuarioDice(opcion.etiqueta);

    switch (opcion.valor) {
      case 'menu':
        await mostrarMenuPrincipal();
        break;
      case 'fase1':
        await iniciarFase1();
        break;
      case 'fase2':
        await iniciarFase2();
        break;
      case 'fase3':
        await iniciarFase3();
        break;
      case 'fase4':
        await iniciarFase4();
        break;
      case 'fase5':
        await iniciarFase5();
        break;
      case 'diag_data':
      case 'diag_rpa':
      case 'diag_ia':
      case 'diag_legacy':
        await responderDiagnostico(opcion.valor);
        break;
      case 'arq_cloud':
      case 'arq_onpremise':
      case 'arq_hibrida':
        await responderArquitectura(opcion.valor);
        break;
      default:
        await mostrarMenuPrincipal();
    }
  }

  /* ---------------------------------------------------------
     12. RECONOCIMIENTO DE PALABRAS CLAVE (texto libre)
  --------------------------------------------------------- */

  const RESPUESTAS_PALABRAS_CLAVE = {
    precio: 'El precio exacto depende siempre de tu diagnóstico y alcance (Fase 1 y 2), por eso no ' +
      'entregamos cifras cerradas sin análisis previo. Puedo llevarte a la Fase 2 (Cotización y Soluciones) o ' +
      'conectarte con un asesor para una cifra concreta.',
    escrow: 'El Escrow es nuestro modelo de custodia fiduciaria: tu pago se resguarda con un tercero de confianza ' +
      'durante el periodo de prueba y solo se libera a PISTA cuando apruebas que la solución cumple lo acordado. ' +
      'Puedo darte el detalle completo en la Fase 3.',
    legacy: 'La compatibilidad Legacy consiste en conectar tus sistemas antiguos con nuevas soluciones de Data, RPA ' +
      'o IA sin reemplazar tu infraestructura actual. Podemos profundizar en la Fase 1 (Diagnóstico).',
    humano: 'Claro, puedo conectarte directamente con un asesor humano (KAM) de PISTA. Solo necesito algunos datos de contacto.',
    ia: 'Sobre Inteligencia Artificial: integramos o desarrollamos modelos de IA sobre tus datos y procesos existentes, ' +
      'siempre validando primero la viabilidad técnica del caso de uso. Puedo darte más detalle en la Fase 1 (Diagnóstico).',
    datos: 'Sobre Datos: trabajamos en limpieza, integración y estructuración de tus fuentes de información para dejarlas ' +
      'listas para análisis o automatización. Puedo darte más detalle en la Fase 1 (Diagnóstico).'
  };

  function detectarPalabraClave(textoOriginal) {
    const texto = textoOriginal
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // quita acentos

    const claves = Object.keys(RESPUESTAS_PALABRAS_CLAVE);
    return claves.find((clave) => texto.includes(clave)) || null;
  }

  async function manejarTextoLibre(textoUsuario) {
    const claveDetectada = detectarPalabraClave(textoUsuario);

    if (claveDetectada === 'humano') {
      await botDice(RESPUESTAS_PALABRAS_CLAVE.humano);
      await iniciarFase5();
      return;
    }

    if (claveDetectada) {
      await botDice(RESPUESTAS_PALABRAS_CLAVE[claveDetectada]);
      await botDice('¿Quieres que te lleve directo a esa sección o prefieres ver el menú completo?', [
        { etiqueta: 'Llévame allá', valor: mapaClaveAFase(claveDetectada) },
        { etiqueta: 'Menú principal', valor: 'menu' },
        { etiqueta: 'Hablar con Asesor', valor: 'fase5' }
      ], 300);
      return;
    }

    // Duda ambigua: no inventamos respuesta, derivamos a revisión humana.
    await botDice(
      'Buena pregunta. Ese punto requiere revisión puntual de un consultor de PISTA para no darte información ' +
      'incompleta o incorrecta. ¿Te gustaría que te conecte con un asesor humano, o prefieres ver el menú de opciones?'
    );
    await botDice('¿Cómo prefieres continuar?', [
      { etiqueta: 'Hablar con Asesor', valor: 'fase5' },
      { etiqueta: 'Menú principal', valor: 'menu' }
    ], 300);
  }

  function mapaClaveAFase(clave) {
    const mapa = {
      precio: 'fase2',
      escrow: 'fase3',
      legacy: 'fase1',
      ia: 'fase1',
      datos: 'fase1'
    };
    return mapa[clave] || 'menu';
  }

  /* ---------------------------------------------------------
     13. ENTRADA DE TEXTO LIBRE DEL USUARIO
  --------------------------------------------------------- */

  inputForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const texto = inputEl.value.trim();
    if (!texto) return;

    inputEl.value = '';
    usuarioDice(texto);

    // Si estamos en medio de la captura guiada de contacto (Fase 5),
    // el texto libre se interpreta como respuesta al formulario paso a paso.
    if (context.step && context.step.startsWith('fase5_')) {
      await procesarCapturaContacto(texto);
      return;
    }

    await manejarTextoLibre(texto);
  });

  /* ---------------------------------------------------------
     14. APERTURA / CIERRE DE LA VENTANA DE CHAT
  --------------------------------------------------------- */

  function abrirChat() {
    chatWindow.classList.add('is-open');
    chatWindow.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('is-hidden');
    inputEl.focus();
  }

  function cerrarChat() {
    chatWindow.classList.remove('is-open');
    chatWindow.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('is-hidden');
  }

  fab.addEventListener('click', abrirChat);
  closeBtn.addEventListener('click', cerrarChat);
  resetBtn.addEventListener('click', () => {
    const confirmado = window.confirm('¿Reiniciar la conversación? Se borrará el historial local.');
    if (confirmado) reiniciarConversacion();
  });

  /* ---------------------------------------------------------
     15. ARRANQUE DE LA CONVERSACIÓN
  --------------------------------------------------------- */

  async function iniciarConversacion() {
    context.step = 'menu';
    guardarEstado();
    await botDice(
      'Hola, soy el Asistente PISTA 👋\n\n' +
      'En PISTA construimos soluciones de Data, RPA e Inteligencia Artificial, y protegemos tu inversión con un ' +
      'modelo de garantía fiduciaria (Escrow): tu pago se resguarda con un tercero de confianza durante todo el ' +
      'periodo de prueba y solo se libera cuando confirmas que la solución cumple lo acordado.'
    );
    await mostrarMenuPrincipal();
  }

  function iniciarAlCargarPagina() {
    cargarEstadoGuardado();
    const habiaHistorial = cargarHistorialGuardado();

    if (habiaHistorial) {
      // Restaura los chips del menú si el usuario se quedó en el menú principal.
      if (context.step === 'menu') {
        mostrarChips(OPCIONES_MENU);
      }
      console.log('[PISTA] Historial de conversación restaurado desde localStorage.');
    } else {
      iniciarConversacion();
    }
  }

  document.addEventListener('DOMContentLoaded', iniciarAlCargarPagina);

})();