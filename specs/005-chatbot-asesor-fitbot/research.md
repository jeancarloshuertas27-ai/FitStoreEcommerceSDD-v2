# Technical Research & Decisions: Módulo 005 - Chatbot Asesor Deportivo Inteligente (FitBot)

**Feature**: `005-chatbot-asesor-fitbot` | **Date**: 2026-11-06

---

## 1. Motor de Asesoría y Coincidencia Conversacional Local vs. API de LLM Externa

### Contexto
El requerimiento funcional exige que FitBot actúe como un coach y asesor deportivo inteligente que entienda objetivos ("ganar masa muscular", "energía", "definir", "creatina", "barato") y responda sin depender de APIs externas de pago o servidores de nube de terceros que puedan fallar, requerir tokens o quedar bloqueados en entornos locales.

### Decisión
Implementar un **Motor de Inteligencia Conversacional Heurístico y Local** integrado directamente en el frontend (`fitbotService.js` o módulo conversacional dentro de React) con las siguientes capacidades:
1. **Normalización Lingüística**: Limpieza de acentos, minúsculas, eliminación de signos y tolerancia a variaciones comunes (ej. "proteina", "proteína", "whey", "creapure", "c4").
2. **Mapeo de Intenciones (Intent Matching)**:
   - *Intención Masa Muscular*: Palabras clave ("masa", "musculo", "volumen", "crecer", "proteina", "whey", "ganar") $\rightarrow$ Categorías `Proteínas` y `Creatinas`.
   - *Intención Energía/Rendimiento*: Palabras clave ("energia", "fuerza", "pre", "preentreno", "cansancio", "potencia", "cafeina") $\rightarrow$ Categoría `Pre-Entrenos` y `Accesorios`.
   - *Intención Económica*: Palabras clave ("barato", "economico", "precio", "oferta") $\rightarrow$ Suplementos ordenados por menor precio (`price ASC`).
   - *Intención Métodos de Pago*: Palabras clave ("yape", "plin", "cuenta", "transferencia", "bcp", "cci", "pagar", "tarjeta", "cobro") $\rightarrow$ Consulta en tiempo real de `store_settings`.
   - *Intención Rastreo de Pedido*: Entrada de 8 dígitos numéricos o patrón `ORD-` $\rightarrow$ Consulta en tiempo real de `orders`.
3. **Filtro de Catálogo en Vivo**: Cruce directo con los productos reales cargados desde la base de datos SQLite (`/api/products`), filtrando productos con existencias y limitando a máximo 3 tarjetas por respuesta.
4. **Retardo Humanizado de Respuesta (Typing Indicator)**: Temporizador de 400ms que muestra "FitBot está escribiendo..." antes de renderizar la respuesta final.

### Razón
- Cumple rigurosamente con el **Principio I** (Arquitectura Full-Stack Unificada) y el **Principio II** (Base de Datos SQLite Autoinicializada).
- Garantiza **100% de confiabilidad**: nunca falla por cuotas de OpenAI, caídas de internet, o cambios de versión de APIs externas.
- Latencia instantánea (< 50ms) con respuesta ágil, ideal para demostraciones y revisiones de producto.

### Alternativas Consideradas
- **Integrar OpenAI / Anthropic API vía backend**: Descartado por requerir API Keys pagadas, generar latencia de 1 a 3 segundos, ser vulnerable a agotamiento de cuotas y violar la directriz explícita del usuario de no depender de APIs externas.
- **Microservicio local en Python (Rasa / HuggingFace)**: Descartado por introducir dependencias de Python y modelos pesados no compatibles con la directriz de zero-setup en Node.js/SQLite.

---

## 2. Integración Reactiva con el Carrito Global (`CartContext`) y Feedback en Chat

### Contexto
Cuando FitBot recomienda un suplemento (ej. "Gold Standard Whey"), el usuario debe poder agregarlo al carrito con un solo clic directamente desde la tarjeta del chat.

### Decisión
Conectar las mini-tarjetas de FitBot con la función `addToCart(product, 1)` provista por el hook `useCart()` de la aplicación:
1. Al pulsar "+ Agregar al Carrito", se invoca `addToCart(product, 1)`.
2. El botón de esa tarjeta cambia su estado visual durante 1.8 segundos:
   - Icono `Check` color verde esmeralda.
   - Texto `"✓ ¡Agregado!"`.
   - Estilo de fondo esmeralda con leve animación de confirmación.
3. El contador numérico del carrito en el Header superior (`Header.jsx`) se incrementa automáticamente al estar vinculado al mismo contexto global.
4. La ventana del chat de FitBot permanece abierta sin cerrarse ni bloquear la pantalla, permitiendo al usuario seguir conversando o hacer clic en otros suplementos sugeridos.

### Razón
- Evita interrumpir el flujo conversacional. Si se abriera el drawer del carrito forzosamente, el usuario perdería la lectura de la recomendación de FitBot.
- Respeta la decisión acordada en la Pregunta 2 de la sesión de clarificación.

### Alternativas Consideradas
- **Abrir el drawer lateral de compras (CartDrawer) inmediatamente**: Descartado porque tapa la conversación y obliga al usuario a cerrarlo para seguir chateando con FitBot.

---

## 3. Consulta de Rastreo de Pedidos y Cuentas de Cobro en SQLite

### Contexto
El cliente puede consultar en el chat el estado de su orden introduciendo su DNI o código de pedido, así como los datos de recaudación vigentes.

### Decisión
1. **Rastreo por DNI o Código**:
   - FitBot detecta entradas numéricas de 8 dígitos (`/^\d{8}$/`) o con prefijo `ORD-`.
   - Si los pedidos ya fueron obtenidos en el frontend o si se consulta el endpoint de pedidos, FitBot filtra en memoria o vía API las órdenes donde `customer_dni === input` o `order_code.toUpperCase().includes(input.toUpperCase())`.
   - Si existen coincidencias, toma hasta las 3 más recientes (`ORDER BY id DESC`) y muestra una tarjeta estructurada en el chat con:
     - Código de orden (ej. `ORD-2026-003`).
     - Fecha de compra formateada.
     - Total en Soles (`S/ XX.XX`).
     - Badge con el estado logístico (`Pendiente`, `En Verificación`, `Pagado / En Preparación`, `Enviado`, `Entregado`, `Cancelado`).
     - Ítems comprados resumidos.
2. **Cuentas de Cobro Oficiales**:
   - FitBot consume el objeto `storeSettings` (titular `Jeancarlos José Huertas Quichca`, Yape `924046690`, Plin `983064501`, BCP `22079349234041`, CCI `00222017934923404128` y WhatsApp `983064501`).
   - Muestra los datos organizados con botón rápido para copiar el número de Yape o cuenta BCP.

### Razón
- Alineación total con los Principios III y IV de la Constitución (cobros directos al propietario y localización peruana con DNI de 8 dígitos).

---

## 4. Adaptabilidad Responsiva Móvil y Persistencia de Sesión

### Contexto
FitBot debe operar con fluidez tanto en computadoras como en teléfonos móviles, y no perder el historial de mensajes si el usuario navega entre pestañas.

### Decisión
1. **Persistencia en `sessionStorage`**:
   - El arreglo de mensajes se almacena bajo la clave `fitstore_fitbot_history`.
   - Permite que si el comprador va a la vista de "Mi Perfil" o navega el catálogo, al volver a abrir FitBot mantenga los mensajes recientes sin duplicarlos.
2. **Diseño Responsive con Tailwind CSS**:
   - En pantallas desktop ($\ge 640\text{px}$): ventana flotante de `w-[380px]` y `h-[540px]` anclada a `bottom-6 right-6` con sombras `shadow-2xl` y bordes redondeados `rounded-3xl`.
   - En pantallas móviles ($< 640\text{px}$): ventana modal a pantalla completa (`fixed inset-0 z-50`) con cabecera fija, scroll táctil suave y botones de tamaño óptimo para interacción táctil (mínimo 44px de altura).

### Razón
- Cumple con la decisión acordada en la Pregunta 4 y 5 de clarificación.

