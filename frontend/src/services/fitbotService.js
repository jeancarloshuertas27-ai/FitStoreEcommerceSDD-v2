import api from './api.js';

const STORAGE_KEY = 'fitstore_fitbot_history';

export const INITIAL_MESSAGES = [
  {
    id: 'welcome-1',
    sender: 'bot',
    text: '¡Hola, atleta! 💪 Soy **FitBot**, tu coach y asesor deportivo de **FitStore Pro**.\n\nEstoy conectado en tiempo real al catálogo de suplementos, pedidos y cuentas de pago. ¿Cuál es tu objetivo físico hoy o en qué te puedo ayudar?',
    timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    type: 'welcome',
  },
];

export const QUICK_REPLIES = [
  { id: 'qr-muscle', label: '💪 Ganar masa muscular', query: 'ganar masa muscular' },
  { id: 'qr-energy', label: '⚡ Energía y Pre-entreno', query: 'energia preentreno' },
  { id: 'qr-order', label: '📦 Consultar estado de mi pedido', query: 'consultar estado de mi pedido' },
  { id: 'qr-payment', label: '💳 ¿Cómo pagar con Yape / Plin / Cuenta?', query: 'como pagar yape plin' },
];

/**
 * Normaliza una cadena quitando tildes y caracteres especiales para búsquedas heurísticas.
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Obtiene el historial guardado en sessionStorage o devuelve el mensaje de bienvenida inicial.
 */
export function getStoredHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_MESSAGES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MESSAGES;
  } catch (e) {
    console.error('Error al recuperar historial de FitBot:', e);
    return INITIAL_MESSAGES;
  }
}

/**
 * Guarda el historial en sessionStorage.
 */
export function saveHistory(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Error al guardar historial de FitBot en sessionStorage:', e);
  }
}

/**
 * Limpia el historial y regresa al estado de bienvenida inicial.
 */
export function clearHistory() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error al limpiar historial de FitBot:', e);
  }
  return INITIAL_MESSAGES;
}

/**
 * Procesa la consulta del usuario y genera una respuesta contextual conectada a los datos de SQLite.
 *
 * @param {string} userText - Mensaje ingresado por el usuario o click de quick reply.
 * @param {Array} products - Lista de productos cargados desde SQLite.
 * @param {Object} storeSettings - Configuración y cuentas de cobro del propietario.
 * @returns {Promise<Object>} Objeto del mensaje de respuesta de FitBot.
 */
export async function processUserMessage(userText, products = [], storeSettings = {}) {
  const norm = normalizeText(userText);
  const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const msgId = `bot-${Date.now()}`;

  // Asegurar acceso al catálogo completo desde SQLite si no se recibieron o si están filtrados
  let catalog = Array.isArray(products) ? [...products] : [];
  if (catalog.length < 8) {
    try {
      const fullCatalog = await api.getProducts();
      if (Array.isArray(fullCatalog) && fullCatalog.length > 0) {
        catalog = fullCatalog;
      }
    } catch (e) {
      // Usar los productos en memoria
    }
  }

  // Asegurar configuración del dueño actualizada
  let activeSettings = storeSettings;
  if (!activeSettings || !activeSettings.owner_name) {
    try {
      const fetchedSettings = await api.getSettings();
      if (fetchedSettings && fetchedSettings.owner_name) {
        activeSettings = fetchedSettings;
      }
    } catch (e) {
      // Usar storeSettings o defaults
    }
  }

  // --------------------------------------------------------------------------
  // 1. INTENCIÓN: RASTREO DE PEDIDOS (DNI O CÓDIGO DE ORDEN)
  // --------------------------------------------------------------------------
  const dniMatch = userText.match(/\b\d{8}\b/);
  const orderCodeMatch = userText.match(/\bORD-\d{4}-\d{3}\b/i);
  const isAskingForOrderTracking =
    norm.includes('pedido') ||
    norm.includes('orden') ||
    norm.includes('rastrear') ||
    norm.includes('estado de mi pedido') ||
    norm.includes('comprobante') ||
    norm.includes('seguimiento');

  // Si ingresa 7 o 9 dígitos numéricos seguidos pero no 8
  const invalidDniMatch = userText.match(/\b\d{7}\b|\b\d{9,10}\b/);

  if ((dniMatch || orderCodeMatch) || (isAskingForOrderTracking && (dniMatch || orderCodeMatch))) {
    try {
      const allOrders = await api.getAllOrders();
      const searchDni = dniMatch ? dniMatch[0] : null;
      const searchCode = orderCodeMatch ? orderCodeMatch[0].toUpperCase() : null;

      const matchingOrders = allOrders.filter((o) => {
        if (searchDni && o.customer_dni === searchDni) return true;
        if (searchCode && o.order_code && o.order_code.toUpperCase().includes(searchCode)) return true;
        return false;
      });

      if (matchingOrders.length > 0) {
        // Ordenar del más reciente al más antiguo y tomar máximo 3
        const sorted = [...matchingOrders]
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 3);

        const ordersSummary = sorted.map((ord) => {
          const itemsText = ord.items && ord.items.length > 0
            ? ord.items.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')
            : 'Productos fitness';

          return {
            order_code: ord.order_code,
            created_at: ord.created_at ? ord.created_at.substring(0, 16) : 'Reciente',
            customer_name: ord.customer_name,
            customer_dni: ord.customer_dni,
            total: Number(ord.total) || 0,
            order_status: ord.order_status || 'En Verificación',
            payment_status: ord.payment?.payment_status || 'Pendiente de Verificación',
            payment_method: ord.payment?.method || 'Yape',
            destination_account: ord.payment?.destination_account || 'Cuenta del Propietario',
            items_summary: itemsText,
          };
        });

        return {
          id: msgId,
          sender: 'bot',
          text: `Encontré **${matchingOrders.length} compra(s)** registrada(s) con esos datos en SQLite. Aquí tienes el estado más reciente de tus pedidos:`,
          timestamp: now,
          type: 'order_tracking',
          orders: ordersSummary,
        };
      } else {
        return {
          id: msgId,
          sender: 'bot',
          text: `No encontré ningún pedido registrado con el DNI o código **"${userText.trim()}"** en nuestra base de datos.\n\nPor favor verifica que tu número de DNI tenga 8 dígitos o consulta directamente con el soporte oficial vía WhatsApp al **+51 ${activeSettings?.whatsapp_notification || '983064501'}**.`,
          timestamp: now,
          type: 'text',
        };
      }
    } catch (err) {
      console.error('Error al rastrear pedido en FitBot:', err);
      return {
        id: msgId,
        sender: 'bot',
        text: 'Ocurrió un error temporal al conectar con la base de datos de órdenes. Por favor intenta nuevamente en unos instantes.',
        timestamp: now,
        type: 'text',
      };
    }
  }

  // Si pidió rastrear pedido pero no incluyó ningún DNI ni código
  if (isAskingForOrderTracking && !dniMatch && !orderCodeMatch) {
    if (invalidDniMatch) {
      return {
        id: msgId,
        sender: 'bot',
        text: '⚠️ Recuerda que el **DNI en el Perú consta de exactamente 8 dígitos numéricos**. Por favor ingresa tu DNI correcto (ej. `72458912`) o tu código de orden (ej. `ORD-2026-001`) para buscar tu compra.',
        timestamp: now,
        type: 'text',
      };
    }

    return {
      id: msgId,
      sender: 'bot',
      text: '📦 **Rastreo de Pedidos en Tiempo Real**\n\nPor favor escribe tu **número de DNI (8 dígitos)** o el **código de tu orden** (ej. `ORD-2026-001`) y buscaré de inmediato en SQLite el estado de tu compra.',
      timestamp: now,
      type: 'text',
    };
  }

  // --------------------------------------------------------------------------
  // 2. INTENCIÓN: MÉTODOS DE PAGO Y CUENTAS OFICIALES (store_settings)
  // --------------------------------------------------------------------------
  const isAskingPayment =
    norm.includes('yape') ||
    norm.includes('plin') ||
    norm.includes('cuenta') ||
    norm.includes('banco') ||
    norm.includes('bcp') ||
    norm.includes('cci') ||
    norm.includes('como pagar') ||
    norm.includes('metodo de pago') ||
    norm.includes('metodos de pago') ||
    norm.includes('tarjeta') ||
    norm.includes('transferencia') ||
    norm.includes('donde deposito') ||
    norm.includes('datos de pago');

  if (isAskingPayment) {
    const ownerName = activeSettings?.owner_name || 'Jeancarlos José Huertas Quichca';
    const yapeNum = activeSettings?.yape_number || '924046690';
    const plinNum = activeSettings?.plin_number || '983064501';
    const bankName = activeSettings?.bank_name || 'BCP - Banco de Crédito del Perú';
    const bankAcc = activeSettings?.bank_account_soles || '22079349234041';
    const bankCci = activeSettings?.bank_cci || '00222017934923404128';
    const whatsapp = activeSettings?.whatsapp_notification || '983064501';

    return {
      id: msgId,
      sender: 'bot',
      text: `En **FitStore Pro** todos los cobros se dirigen directamente a las cuentas oficiales del dueño sin intermediarios. Aquí tienes los datos actualizados:`,
      timestamp: now,
      type: 'payment_info',
      paymentData: {
        owner_name: ownerName,
        yape_number: yapeNum,
        plin_number: plinNum,
        bank_name: bankName,
        bank_account_soles: bankAcc,
        bank_cci: bankCci,
        whatsapp_notification: whatsapp,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 3. INTENCIÓN: ASESORÍA POR OBJETIVO FÍSICO / CATEGORÍAS
  // --------------------------------------------------------------------------

  // A) Ganar masa muscular / Proteínas / Creatinas
  const isMuscleGoal =
    norm.includes('masa') ||
    norm.includes('musculo') ||
    norm.includes('volumen') ||
    norm.includes('crecer') ||
    norm.includes('hipertrofia') ||
    norm.includes('fuerza') ||
    norm.includes('proteina') ||
    norm.includes('whey') ||
    norm.includes('creatina') ||
    norm.includes('creapure') ||
    norm.includes('ganar masa');

  if (isMuscleGoal) {
    let candidates = [];
    if (norm.includes('creatina') || norm.includes('creapure')) {
      candidates = catalog.filter((p) => p.category === 'Creatinas');
    } else if (norm.includes('proteina') || norm.includes('whey')) {
      candidates = catalog.filter((p) => p.category === 'Proteínas');
    } else {
      candidates = catalog.filter((p) => p.category === 'Proteínas' || p.category === 'Creatinas');
    }

    // Priorizar productos con stock > 0
    const available = candidates.filter((p) => p.stock > 0);
    const selected = available.length > 0 ? available.slice(0, 3) : candidates.slice(0, 3);

    return {
      id: msgId,
      sender: 'bot',
      text: '💪 **Recomendación para Ganancia Muscular**\n\nPara maximizar la síntesis proteica e hipertrofia, la combinación de **Proteína Whey aislada** (post-entrenamiento) y **Creatina Creapure** (5g diarios para fuerza y volumen celular) es el estándar de oro. Aquí tienes las mejores opciones disponibles:',
      timestamp: now,
      type: 'products',
      products: selected,
    };
  }

  // B) Energía / Pre-Entreno / Accesorios de Gimnasio
  const isEnergyGoal =
    norm.includes('energia') ||
    norm.includes('pre') ||
    norm.includes('preentreno') ||
    norm.includes('pre-entreno') ||
    norm.includes('pre entreno') ||
    norm.includes('cansancio') ||
    norm.includes('cafeina') ||
    norm.includes('potencia') ||
    norm.includes('explosiv') ||
    norm.includes('shaker') ||
    norm.includes('accesorio') ||
    norm.includes('cinturon') ||
    norm.includes('correa');

  if (isEnergyGoal) {
    let candidates = catalog.filter((p) => p.category === 'Pre-Entrenos' || p.category === 'Accesorios');
    const available = candidates.filter((p) => p.stock > 0);
    const selected = available.length > 0 ? available.slice(0, 3) : candidates.slice(0, 3);

    return {
      id: msgId,
      sender: 'bot',
      text: '⚡ **Recomendación para Energía y Rendimiento Extremo**\n\nLos pre-entrenos con beta-alanina y cafeína anhidra te darán vasodilatación, concentración y resistencia en series pesadas. Acompáñalos con un buen shaker o cinturón lumbar para proteger tu columna:',
      timestamp: now,
      type: 'products',
      products: selected,
    };
  }

  // C) Suplementos Baratos / Económicos / Menor Precio
  const isCheapGoal =
    norm.includes('barato') ||
    norm.includes('economico') ||
    norm.includes('menor precio') ||
    norm.includes('oferta') ||
    norm.includes('mas barato') ||
    norm.includes('precio bajo') ||
    norm.includes('barata');

  if (isCheapGoal) {
    const sortedByPrice = [...catalog]
      .filter((p) => p.stock > 0)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, 3);

    return {
      id: msgId,
      sender: 'bot',
      text: '🏷️ **Opciones más Económicas en Catálogo**\n\nEstos son los suplementos y accesorios fitness con los precios más accesibles en Soles (`S/`), manteniendo la máxima pureza y garantía 100% original de FitStore Pro:',
      timestamp: now,
      type: 'products',
      products: sortedByPrice,
    };
  }

  // D) Pérdida de Grasa / Definición Muscular
  const isFatLossGoal =
    norm.includes('grasa') ||
    norm.includes('definir') ||
    norm.includes('definicion') ||
    norm.includes('bajar de peso') ||
    norm.includes('quemar') ||
    norm.includes('adelgazar') ||
    norm.includes('perder peso');

  if (isFatLossGoal) {
    // Para definición se recomiendan proteínas bajas en carbohidratos (Whey Isolate) o pre-entrenos para mantener el gasto calórico alto
    const candidates = catalog.filter(
      (p) => (p.category === 'Proteínas' || p.category === 'Pre-Entrenos') && p.stock > 0
    ).slice(0, 3);

    return {
      id: msgId,
      sender: 'bot',
      text: '🔥 **Estrategia para Definición y Quema de Grasa**\n\nEn etapa de déficit calórico, lo crucial es mantener un consumo alto de proteína aislada de rápida absorción para proteger tu masa muscular y un pre-entreno para sostener la intensidad en tus entrenamientos de pesas y cardio:',
      timestamp: now,
      type: 'products',
      products: candidates,
    };
  }

  // E) Búsqueda directa por palabras clave de productos existentes en SQLite
  const directMatches = catalog.filter((p) => {
    const pNorm = normalizeText(`${p.name} ${p.description} ${p.category}`);
    const words = norm.split(/\s+/).filter((w) => w.length > 2);
    return words.some((word) => pNorm.includes(word));
  });

  if (directMatches.length > 0) {
    const available = directMatches.filter((p) => p.stock > 0);
    const selected = available.length > 0 ? available.slice(0, 3) : directMatches.slice(0, 3);

    return {
      id: msgId,
      sender: 'bot',
      text: `Encontré estas opciones en nuestro catálogo que coinciden con tu búsqueda:`,
      timestamp: now,
      type: 'products',
      products: selected,
    };
  }

  // --------------------------------------------------------------------------
  // 4. FALLBACK / RESPUESTA GENERAL Y ORIENTACIÓN DEPORTIVA
  // --------------------------------------------------------------------------
  return {
    id: msgId,
    sender: 'bot',
    text: `Como tu coach fitness puedo ayudarte a:\n\n1. Recomendarte **Proteínas, Creatinas o Pre-Entrenos** según tus metas físicas.\n2. Consultar opciones económicas o suplementos en oferta.\n3. Indicarte los datos de cobro oficiales para transferir por **Yape, Plin o BCP**.\n4. Rastrear en vivo tu pedido con tu **DNI de 8 dígitos** o código de orden.\n\n¿Por cuál te gustaría empezar? Puedes usar los botones de acceso rápido aquí abajo:`,
    timestamp: now,
    type: 'welcome',
  };
}

export default {
  INITIAL_MESSAGES,
  QUICK_REPLIES,
  getStoredHistory,
  saveHistory,
  clearHistory,
  processUserMessage,
};
