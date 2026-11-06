# Feature Specification: Módulo 005 - Chatbot Asesor Deportivo Inteligente (FitBot) Conectado a SQLite y Carrito

**Feature Branch**: `005-chatbot-asesor-fitbot`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Incorporar un asistente virtual interactivo flotante ('FitBot - Asesor FitStore Pro') conectado en tiempo real al catálogo de productos, pedidos y cuentas de pago en SQLite (products, orders, store_settings) que guíe al comprador según sus objetivos físicos, consulte stock/precios en vivo, permita añadir suplementos al carrito directamente desde la conversación y responda dudas sobre pagos con Yape, Plin o Transferencia."

---

## Clarifications

### Session 2026-11-06
- Q: ¿Cuántas mini-tarjetas de productos como máximo debe mostrar FitBot en una misma respuesta para garantizar una lectura ágil sin saturar la ventana del chat? → A: Opción A: Máximo 3 productos recomendados por consulta con stock disponible (balance ideal de legibilidad).
- Q: ¿Qué comportamiento visual y retroalimentación debe ocurrir de inmediato cuando el comprador pulsa el botón "+ Agregar al Carrito" en una tarjeta dentro del chat? → A: Opción A: El botón de la tarjeta cambia a "✓ ¡Agregado!" temporalmente, se actualiza el contador del carrito en el header y el chat permanece abierto para continuar la asesoría sin interrupciones.
- Q: ¿Cómo debe presentar FitBot los resultados cuando un cliente consulta su estado ingresando un DNI que cuenta con múltiples compras registradas en el sistema? → A: Opción A: Listar hasta los 3 pedidos más recientes ordenados por fecha descendente, con código, fecha, total en S/, estado actual y productos.
- Q: ¿Cuál debe ser el estado inicial del widget de FitBot al cargar la tienda y cómo debe gestionarse el historial de conversación al minimizar o navegar entre pantallas? → A: Opción A: Iniciar cerrado mostrando el botón flotante con badge "En línea", conservando el historial de mensajes durante la sesión activa en el navegador (sessionStorage).
- Q: ¿Cómo debe desplegarse la ventana del chat de FitBot en dispositivos móviles (pantallas pequeñas) para garantizar la máxima comodidad táctil del usuario? → A: Opción A: En móviles se adapta a pantalla completa para tecleo y scroll cómodo; en escritorio se despliega como ventana flotante elegante en la esquina inferior derecha.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta de Suplementos por Objetivos y Adición Directa al Carrito (Priority: P1) 🎯 MVP

Como comprador fitness interesado en alcanzar mis metas deportivas (ganar masa muscular, rendimiento o pérdida de grasa), quiero abrir el asistente interactivo FitBot en la tienda, recibir sugerencias de suplementos basadas en el catálogo real con stock vigente y poder agregar productos al carrito de compras directamente desde la conversación sin salir del chat.

**Why this priority**: Constituye el núcleo de valor comercial del chatbot (MVP). Permite transformar las dudas del comprador en ventas inmediatas, conectando el asesoramiento virtual con la acción directa de compra en el carrito global.

**Independent Test**: Abrir la tienda, pulsar el botón flotante de FitBot, escribir "quiero una proteína para masa muscular" o presionar el botón rápido "💪 Ganar masa muscular", verificar que FitBot responda con mini-tarjetas de productos reales (foto, nombre, precio en `S/` y unidades en stock) y al hacer clic en "+ Agregar al Carrito", confirmar que el contador del carrito superior se incremente y el producto quede listo para pagar.

**Acceptance Scenarios**:

1. **Given** que el comprador está navegando en cualquier vista de la tienda, **When** hace clic en el botón flotante de FitBot, **Then** se abre la ventana de chat moderna con el mensaje de bienvenida del coach, el indicador "En línea" y los botones de consulta rápida.
2. **Given** que el chat está abierto, **When** el comprador pulsa "💪 Ganar masa muscular" o escribe "creatina", **Then** FitBot muestra una animación de "FitBot está escribiendo..." durante 400ms y presenta mini-tarjetas interactivas con foto, nombre, precio oficial en Soles (`S/`) y stock real de los suplementos que cumplen el criterio.
3. **Given** que FitBot muestra una tarjeta de producto con stock disponible, **When** el usuario pulsa "+ Agregar al Carrito", **Then** el suplemento se añade al carrito de compras global, el contador numérico del header se actualiza inmediatamente y se muestra una confirmación visual dentro del chat.
4. **Given** un producto sin unidades disponibles (stock = 0), **When** FitBot lo incluye en recomendaciones, **Then** la tarjeta muestra una insignia de "Agotado", el botón de agregar queda deshabilitado y FitBot sugiere una alternativa equivalente en stock.

---

### User Story 2 - Botones de Consulta Rápida y Preguntas Frecuentes de Pago (Priority: P2)

Como cliente que visita la tienda y desea asesoría inmediata o conocer cómo pagar sus compras, quiero contar con accesos rápidos de 1 clic para objetivos populares y para consultar las cuentas oficiales de cobro (Yape, Plin, BCP, CCI) del propietario.

**Why this priority**: Acelera la interacción para usuarios que no desean escribir en el teclado y resuelve la fricción de pago mostrando de forma instantánea y transparente los datos de cobro oficiales sin tener que ir al checkout.

**Independent Test**: Abrir FitBot y hacer clic en el botón rápido "💳 ¿Cómo pagar con Yape / Plin / Cuenta?", verificando que FitBot responda con el nombre del titular y los números reales de Yape, Plin, Banco BCP y CCI registrados en la configuración de la tienda.

**Acceptance Scenarios**:

1. **Given** que el usuario abre FitBot, **When** visualiza la barra de acciones rápidas, **Then** se presentan los 4 botones: "💪 Ganar masa muscular", "⚡ Energía y Pre-entreno", "📦 Consultar estado de mi pedido" y "💳 ¿Cómo pagar con Yape / Plin / Cuenta?".
2. **Given** que el usuario presiona "⚡ Energía y Pre-entreno", **When** se procesa la acción, **Then** FitBot responde explicando para qué sirve un pre-entreno y despliega las opciones de la categoría Pre-Entrenos y Accesorios disponibles en inventario.
3. **Given** que el usuario hace clic en "💳 ¿Cómo pagar con Yape / Plin / Cuenta?", **When** se genera la respuesta, **Then** FitBot detalla las 3 vías de pago (Yape/Plin, BCP/CCI y Tarjeta) junto con el nombre del titular y los números de cobro vigentes en el sistema.

---

### User Story 3 - Rastreo de Pedidos en Vivo desde la Conversación (Priority: P3)

Como cliente que ya realizó una compra en FitStore Pro, quiero ingresar mi número de DNI (8 dígitos) o código de pedido dentro del chat para que FitBot consulte el estado en tiempo real de mi orden sin tener que navegar a otra pantalla.

**Why this priority**: Reduce la carga de soporte al cliente, brindando autoservicio inmediato de seguimiento logístico y validación de vouchers.

**Independent Test**: Ingresar en el chat el DNI "72458912" o un código "ORD-2026-001", y comprobar que FitBot retorne el código de orden, la fecha de compra, el estado actual (`En Verificación`, `Pagado / En Preparación`, `Enviado` o `Entregado`) y el total pagado en Soles (`S/`).

**Acceptance Scenarios**:

1. **Given** que el usuario presiona el botón "📦 Consultar estado de mi pedido", **When** FitBot solicita el número de DNI o código, **Then** el usuario ingresa su DNI de 8 dígitos y el chatbot busca las órdenes asociadas en el sistema.
2. **Given** que el DNI ingresado cuenta con pedidos registrados, **When** FitBot encuentra las coincidencias, **Then** despliega un resumen con el código de orden, fecha, estado logístico/pago actual y los productos adquiridos.
3. **Given** que el cliente ingresa un DNI o código que no existe en el sistema, **When** FitBot realiza la búsqueda, **Then** responde amablemente informando que no se encontraron compras con esos datos e invitando a verificar el número o contactar por WhatsApp.

---

### User Story 4 - Asesoría Fitness Contextual y Búsqueda en Lenguaje Natural (Priority: P4)

Como deportista con requerimientos específicos (ej. "suplemento barato", "quiero bajar de peso", "pre-entreno sin picazón", "fuerza"), quiero formular preguntas en texto libre y recibir respuestas orientadas al fitness peruano que entiendan sinónimos y filtren adecuadamente el catálogo.

**Why this priority**: Dota a FitBot de una experiencia conversacional amigable y realista, respondiendo adecuadamente a variaciones de texto y jerga deportiva sin depender de servicios externos de pago.

**Independent Test**: Escribir en el chat frases como "algo económico", "para definir", "cuál creatina me recomiendas", y verificar que FitBot interprete la intención, explique brevemente el beneficio y muestre los suplementos pertinentes ordenados por precio o relevancia.

**Acceptance Scenarios**:

1. **Given** que el usuario escribe un término de objetivo ("definición", "fuerza", "energía", "aumento"), **When** FitBot analiza el mensaje, **Then** mapea la intención al catálogo pertinente y responde con recomendaciones técnicas claras y concisas.
2. **Given** que el usuario escribe una palabra clave de producto con variaciones ("whey", "proteina", "creatina creapure"), **When** el motor de búsqueda local procesa la consulta, **Then** recupera los suplementos que coinciden en nombre, descripción o categoría.
3. **Given** que el usuario escribe una consulta no relacionada con fitness o suplementos, **When** FitBot responde, **Then** reorienta cortésmente la conversación hacia nutrición deportiva, catálogo de la tienda o métodos de pago.

---

### Edge Cases

- **Catálogo sin resultados**: Si el usuario busca un producto inexistente (ej. "quemador importado x"), FitBot debe notificar que no se cuenta con esa referencia exacta y sugerir explorar las categorías disponibles ('Proteínas', 'Creatinas', 'Pre-Entrenos').
- **Productos con stock agotado**: Si un producto recomendado tiene stock 0, FitBot debe marcar claramente "Agotado" en la tarjeta, deshabilitar el botón de adición y aclarar que está por reingresar.
- **DNI con formato inválido**: Si el usuario intenta rastrear un pedido con un texto que no tiene exactamente 8 dígitos numéricos ni el formato `ORD-`, FitBot debe advertir que el DNI en el Perú contiene 8 dígitos.
- **Múltiples órdenes para un mismo DNI**: Si un cliente tiene 3 pedidos registrados, FitBot debe listar los pedidos priorizando el más reciente y mostrando el estado de cada uno.
- **Dispositivos móviles y pantallas pequeñas**: La ventana de FitBot no debe desbordar la pantalla en smartphones; debe adaptarse con dimensiones responsivas, permitiendo minimizar o cerrar fácilmente.
- **Carrito persistente**: Al pulsar "+ Agregar al Carrito" varias veces sobre el mismo producto, el sistema debe validar que la cantidad acumulada no exceda el stock real disponible en inventario.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE iniciar con el widget de FitBot cerrado, mostrando en la esquina inferior derecha un botón flotante con icono representativo, badge de "En línea", un tooltip sutil de bienvenida y animación suave de apertura/cierre.
- **FR-002**: La ventana de FitBot DEBE contener un encabezado con el título "FitBot - Coach & Asesor de Suplementos", un botón de minimizar/cerrar y un historial interactivo de mensajes con desplazamiento automático. En computadoras de escritorio DEBE renderizarse como ventana flotante moderna (380px de ancho) en la esquina inferior derecha, y en dispositivos móviles (< 640px) DEBE adaptarse de forma responsiva a modo pantalla completa con controles táctiles accesibles.
- **FR-003**: FitBot DEBE incluir un retardo de escritura humanizado ("FitBot está escribiendo...") de aproximadamente 400ms antes de emitir cada respuesta para brindar una experiencia interactiva natural.
- **FR-004**: FitBot DEBE ofrecer una botonera de acciones rápidas (Quick Replies) que incluya como mínimo:
  1. `💪 Ganar masa muscular` (recomienda Proteínas y Creatinas).
  2. `⚡ Energía y Pre-entreno` (recomienda Pre-entrenos y Accesorios).
  3. `📦 Consultar estado de mi pedido` (inicia flujo de rastreo).
  4. `💳 ¿Cómo pagar con Yape / Plin / Cuenta?` (despliega datos de recaudación vigentes).
- **FR-005**: Las respuestas de recomendación de productos DEBEN incluir hasta un máximo de 3 mini-tarjetas interactivas por consulta dentro de la conversación mostrando:
  - Imagen del suplemento.
  - Nombre oficial y categoría.
  - Precio formateado en Soles peruanos (`S/ XX.XX`).
  - Indicador de stock disponible o distintivo de "Agotado".
  - Botón interactivo **"+ Agregar al Carrito"** funcional.
- **FR-006**: Al presionar "+ Agregar al Carrito" en una tarjeta del chat, el ítem DEBE sumarse automáticamente al carrito de compras global, transformando el botón temporalmente en "✓ ¡Agregado!" con retroalimentación visual inmediata y actualizando el contador del header, manteniendo la ventana de FitBot abierta para continuar la conversación.
- **FR-007**: FitBot DEBE consultar la configuración de cobro del sistema (`store_settings`) en tiempo real para informar el nombre del titular, números de Yape y Plin, y cuentas BCP/CCI actualizadas.
- **FR-008**: FitBot DEBE permitir el rastreo de compras mediante el ingreso del DNI (8 dígitos) o código de orden. Si el cliente cuenta con múltiples pedidos, DEBE listar hasta las 3 compras más recientes ordenadas de forma cronológica descendente, detallando código de orden, fecha, total en Soles (`S/`), estado actual (`Pendiente`, `En Verificación`, `Pagado / En Preparación`, `Enviado`, `Entregado` o `Cancelado`) y los ítems adquiridos.
- **FR-009**: El motor de respuestas de FitBot DEBE operar de forma 100% autónoma y local (conectado a los datos de SQLite), sin depender de servicios ni APIs externas de terceros que puedan fallar, requerir tokens o quedar fuera de línea.
- **FR-010**: FitBot DEBE validar que toda entrada de DNI para consulta de pedidos consista en 8 dígitos numéricos, emitiendo un mensaje aclaratorio si no cumple el estándar peruano.
- **FR-011**: FitBot DEBE persistir el historial de la conversación durante la sesión activa del comprador (`sessionStorage`) para permitir navegar entre la tienda, el catálogo y el checkout sin perder el contexto de la consulta ni reiniciar el diálogo al minimizar la ventana.

---

### Key Entities *(include if feature involves data)*

- **Conversación / Mensaje**: Representa cada mensaje emitido por el usuario o por FitBot (identificador, rol `user` o `bot`, texto, tipo de contenido: texto, mini-tarjetas de productos, resumen de orden o botones de acción rápida, timestamp).
- **Mini-Tarjeta de Producto en Chat**: Estructura visual de suplemento recomendada en el chat (id de producto, nombre, categoría, precio en Soles `S/`, stock disponible, imagen, flag de disponibilidad para agregar al carrito).
- **Consulta de Rastreo**: Búsqueda por DNI o código de pedido vinculada a las órdenes registradas en el sistema (código, fecha, cliente, productos, total en `S/`, estado del pedido y estado de pago).
- **Información de Pago del Propietario**: Datos vigentes de cobro para orientación al comprador (titular, Yape, Plin, BCP, CCI y WhatsApp de soporte).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El comprador puede abrir el chat de FitBot y recibir una recomendación de productos en menos de 1 segundo tras seleccionar un objetivo rápido.
- **SC-002**: El 100% de los suplementos mostrados en las tarjetas del chat reflejan exactamente el precio en Soles (`S/`) y el stock real registrado en la base de datos SQLite.
- **SC-003**: Al presionar el botón "+ Agregar al Carrito" dentro de una recomendación de FitBot, el producto se refleja en el carrito de compras en menos de 300ms.
- **SC-004**: Los clientes pueden conocer el estado actualizado de su pedido introduciendo su DNI de 8 dígitos en un solo paso conversacional.
- **SC-005**: El motor de asesoría opera con cero dependencias de APIs en la nube de terceros, garantizando 100% de disponibilidad en ejecuciones locales y demostraciones.
- **SC-006**: El 100% de los textos, botones, términos fitness y monedas están adaptados al mercado peruano en idioma español y con moneda oficial en Soles (`S/`).

---

## Assumptions

- **Disponibilidad de Datos Locales**: Se asume que el backend provee los endpoints necesarios para consultar catálogo de productos (`/api/products`), órdenes (`/api/orders`) y configuración bancaria (`/api/settings`) ya construidos en los módulos previos.
- **Carrito Global React**: Se asume que el contexto del carrito (`CartContext`) está disponible globalmente en la SPA para incorporar suplementos desde cualquier componente secundario.
- **Reglas Heurísticas y Filtros Inteligentes**: Dado el requerimiento de no depender de APIs externas de IA que puedan fallar o requerir claves privadas, las respuestas conversacionales y el mapeo de intenciones se basarán en un motor de coincidencia de patrones y categorías de nutrición deportiva optimizado para el catálogo fitness de FitStore Pro.
- **Diseño Flotante No Intrusivo**: El botón flotante de FitBot se ubicará en la esquina inferior derecha sin superponerse ni bloquear botones de compra o navegación esenciales del pie de página.

