# Guía Rápida de Verificación (Quickstart): Módulo 005 - Chatbot Asesor Deportivo (FitBot)

Esta guía describe los escenarios de prueba manual y de extremo a extremo para auditar el funcionamiento de **FitBot**, la adición directa al carrito desde la conversación, las consultas a SQLite y la adaptabilidad responsive.

---

## 1. Arranque del Entorno de Desarrollo

```bash
# Iniciar frontend y backend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API REST: `http://localhost:3001/api`
- Base de datos: `backend/database.sqlite`

---

## 2. Escenario 1: Botón Flotante y Saludo Inicial

1. Abre `http://localhost:5173` en el navegador.
2. Observa la esquina inferior derecha de la pantalla:
   - *Resultado esperado*: Se visualiza el botón circular flotante de FitBot con ícono de robot/entrenador, indicador verde "En línea" y un globo de bienvenida: *"¡Hola! Soy FitBot, tu coach deportivo. ¿En qué te ayudo hoy?"*.
3. Haz clic en el botón flotante:
   - *Resultado esperado*: Se abre suavemente la ventana del chat con la cabecera *"FitBot - Coach & Asesor de Suplementos"*, el mensaje de bienvenida y los 4 botones de acción rápida:
     - `💪 Ganar masa muscular`
     - `⚡ Energía y Pre-entreno`
     - `📦 Consultar estado de mi pedido`
     - `💳 ¿Cómo pagar con Yape / Plin / Cuenta?`

---

## 3. Escenario 2: Recomendación de Suplementos y Adición Directa al Carrito

1. En el chat abierto, presiona el botón rápido **"💪 Ganar masa muscular"** o escribe *"quiero ganar masa muscular"*.
2. Observa el indicador de escritura:
   - *Resultado esperado*: Aparece brevemente *"FitBot está escribiendo..."* (~400ms).
3. Respuesta de FitBot:
   - *Resultado esperado*: Explica que para masa muscular se recomienda proteína whey y creatina creapure, y despliega hasta **3 mini-tarjetas interactivas** con foto, nombre, categoría, precio en Soles (`S/`), stock disponible y el botón **"+ Agregar al Carrito"**.
4. Haz clic en el botón **"+ Agregar al Carrito"** de la tarjeta de *Gold Standard 100% Whey*:
   - *Resultado esperado*:
     - El botón de la tarjeta cambia inmediatamente a **"✓ ¡Agregado!"** con fondo esmeralda.
     - El contador numérico del carrito en el encabezado superior de la tienda se incrementa en +1.
     - La ventana del chat **permanece abierta** para continuar la conversación.

---

## 4. Escenario 3: Consulta Rápida de Métodos de Pago Reales

1. En el chat, haz clic en el botón rápido **"💳 ¿Cómo pagar con Yape / Plin / Cuenta?"** o escribe *"cómo pago por yape"*.
2. *Resultado esperado*:
   - FitBot consulta en tiempo real los datos de `store_settings` y responde detallando:
     - Titular Oficial: `Jeancarlos José Huertas Quichca`
     - Yape: `924046690`
     - Plin: `983064501`
     - Banco BCP: Cuenta en Soles `22079349234041` y CCI `00222017934923404128`
     - Tarjeta de Crédito/Débito Sandbox.

---

## 5. Escenario 4: Rastreo de Pedido por DNI Peruano (8 Dígitos)

1. En el chat, presiona **"📦 Consultar estado de mi pedido"**.
2. FitBot solicitará tu DNI o código de pedido.
3. Escribe el DNI de prueba de Carlos Mendoza: `72458912`.
4. *Resultado esperado*:
   - FitBot consulta SQLite y presenta hasta las 3 órdenes más recientes de ese comprador con:
     - Código de Orden (ej. `ORD-2026-003`).
     - Fecha y Total en `S/`.
     - Estado logístico actual (`En Verificación`, `Pagado / En Preparación`, etc.).
     - Desglose de productos adquiridos.
5. Prueba escribiendo un DNI inválido de 6 dígitos (ej. `123456`):
   - *Resultado esperado*: FitBot responde amablemente indicando que el DNI en el Perú consta de 8 dígitos numéricos.

---

## 6. Escenario 5: Asesoría en Lenguaje Natural y Manejo de Stock Agotado

1. Escribe en el chat: *"algo barato"* o *"suplemento económico"*.
2. *Resultado esperado*: FitBot filtra los suplementos con menor precio en Soles (`S/`) y los presenta ordenados.
3. Si algún producto tiene stock 0:
   - *Resultado esperado*: La tarjeta muestra la insignia roja *"Agotado"*, el botón de agregar al carrito queda inhabilitado y FitBot sugiere una alternativa equivalente en stock.

---

## 7. Escenario 6: Adaptabilidad Móvil y Persistencia de Sesión

1. Abre las herramientas de desarrollo del navegador (F12) y conmuta a la vista móvil (ej. iPhone 14 o 390px de ancho).
2. Abre FitBot:
   - *Resultado esperado*: FitBot se adapta fluidamente a pantalla completa con cabecera fija y botones táctiles cómodos.
3. Cierra FitBot, navega a la pestaña "Mi Perfil" o "Panel Admin", y vuelve a abrir FitBot:
   - *Resultado esperado*: El historial previo de mensajes se mantiene intacto gracias a la persistencia en `sessionStorage`.

