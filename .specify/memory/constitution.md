<!--
Sync Impact Report:
- Version change: 0.0.0 (template) → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] → I. Arquitectura Full-Stack Unificada y Confiable
  - [PRINCIPLE_2_NAME] → II. Base de Datos SQLite Autoinicializada con Datos Semilla (Auto-Seed)
  - [PRINCIPLE_3_NAME] → III. Pagos Dirigidos a las Cuentas Reales del Propietario (Yape/Plin, Transferencia y Tarjeta)
  - [PRINCIPLE_4_NAME] → IV. Idioma, Localización y Validación para el Mercado Peruano
  - [PRINCIPLE_5_NAME] → V. Verificabilidad sin Bloqueos y Experiencia de Usuario Ágil
- Added sections:
  - Estándares Técnicos y Arquitectura de Datos
  - Flujo Operativo y Políticas de Cobranza Directa
- Removed sections: None
- Follow-up TODOs: None
-->

# FitStore Pro Constitution

## Core Principles

### I. Arquitectura Full-Stack Unificada y Confiable
- **Frontend**: El cliente web MUST ser construido con React, empaquetado y servido a través de Vite, estilizado con Tailwind CSS e integrado con la biblioteca oficial de iconos Lucide Icons.
- **Backend API REST**: El servidor de backend MUST estar implementado sobre Node.js utilizando Express, exponiendo endpoints REST limpios bajo el prefijo unificado `/api`.
- **Persistencia Local**: La base de datos MUST ser un archivo local SQLite denominado `database.sqlite` ubicado en la raíz del entorno del servidor, garantizando portabilidad absoluta y cero configuración externa de red o servicios cloud para el almacenamiento.
- **Conectividad y CORS**: El backend MUST configurar Middleware de CORS explícito (Cross-Origin Resource Sharing) que permita la comunicación bidireccional inmediata con el frontend de Vite sin arrojar excepciones de bloqueo de orígenes cruzados en entornos locales o de producción.

*Rationale*: Un stack unificado en JavaScript/TypeScript reduce la sobrecarga cognitiva, elimina la fricción de despliegue y proporciona arranque inmediato y robustez en la ejecución.

### II. Base de Datos SQLite Autoinicializada con Datos Semilla (Auto-Seed)
- **Auto-Inicialización (Zero-Setup)**: Al inicializar el servidor backend, el sistema MUST verificar la presencia e integridad del archivo `database.sqlite`. Si no existe o no contiene las tablas requeridas, MUST ejecutar automáticamente la creación del esquema relacional completo sin requerir comandos de migración manuales.
- **Esquema Relacional Mandatorio (6 Tablas)**: El esquema relacional MUST estructurarse exactamente en las siguientes 6 entidades:
  1. `users`: Gestión de administradores y clientes registrados (id, email, password_hash, full_name, dni, phone, role, created_at).
  2. `products`: Catálogo completo de suplementos y equipamiento fitness (id, name, description, price, category, stock, image_url, created_at).
  3. `orders`: Transacciones de compra (id, user_id, total, status, shipping_address, customer_dni, customer_phone, created_at).
  4. `order_items`: Desglose individual de productos comprados (id, order_id, product_id, quantity, unit_price).
  5. `payments`: Registro y conciliación de pagos (id, order_id, method, amount, operation_number, voucher_url, status, settlement_account, created_at).
  6. `store_settings`: Configuración centralizada del negocio y cuentas de recaudación del propietario (id, store_name, owner_name, yape_phone, plin_phone, bank_name, account_number, cci, card_settlement_account, updated_at).
- **Semilla de Datos Reales (Auto-Seed)**: La inicialización MUST sembrar automáticamente:
  - 8 productos fitness de catálogo real con imágenes en alta resolución funcionales (suplementos deportivos y equipamiento).
  - 1 usuario Administrador listo para operar: `admin@fitstore.pe` con contraseña `admin123`.
  - 2 clientes peruanos registrados con órdenes iniciales en distintos estados (`completado`, `pendiente`) para pruebas inmediatas.
  - Configuración inicial de cuentas bancarias y billeteras del propietario en `store_settings`.

*Rationale*: Permite que cualquier entorno de desarrollo, evaluación o demostración sea 100% funcional desde el primer segundo posterior al arranque, garantizando consistencia de datos y pruebas reproducibles.

### III. Pagos Dirigidos a las Cuentas Reales del Propietario
El sistema MUST asegurar que todos los cobros se canalicen directamente hacia las cuentas bancarias y billeteras del dueño de la tienda, implementando 3 vías de pago transparentes:
- **Vía 1: Yape y Plin del Propietario (Billeteras Digitales)**:
  - MUST desplegar visualmente el número de celular asociado a Yape y Plin del titular, su nombre completo y un código QR dinámico de pago.
  - MUST solicitar al cliente el número de operación emitido por su app bancaria.
  - MUST permitir adjuntar la captura del comprobante/voucher o presionar un botón de "Generar Voucher Demo en 1 Clic" para acelerar verificaciones en pruebas.
- **Vía 2: Transferencia Directa a Cuenta Bancaria / CCI**:
  - MUST presentar la entidad financiera de destino (ej. BCP, BBVA, Interbank), el Número de Cuenta corriente/ahorros en Soles y el Código de Cuenta Interbancario (CCI) del propietario.
  - MUST ofrecer botones de copiado rápido al portapapeles ("Copiar Cuenta", "Copiar CCI") con feedback visual inmediato.
  - MUST solicitar el número de operación y la subida de captura del comprobante bancario.
- **Vía 3: Tarjeta de Crédito/Débito Sandbox con Liquidación a Cuenta Recaudadora**:
  - MUST ofrecer un formulario interactivo de pago con tarjeta preconfigurado para pruebas rápidas (tarjeta de pruebas `4242 4242 4242 4242`).
  - MUST procesar la transacción instantáneamente generando un código de autorización unívoco en formato `AUTH-XXXX`.
  - MUST registrar explícitamente en el comprobante final y en la tabla `payments` de SQLite que el importe abonado fue liquidado directamente en la Cuenta Bancaria Recaudadora del dueño de la tienda.

*Rationale*: Suprime comisiones intermedias y la retención innecesaria de fondos para el modelo de negocio directo, otorgando al dueño trazabilidad financiera y disponibilidad de liquidez inmediata.

### IV. Idioma, Localización y Validación para el Mercado Peruano
- **Idioma y Redacción**: Toda la interfaz de usuario, etiquetas, descripciones de catálogo, notificaciones, errores del sistema y comprobantes de compra MUST expresarse íntegramente en español adaptado al Perú.
- **Moneda Oficial**: Todas las referencias monetarias MUST formularse en Soles peruanos con el símbolo oficial `S/` y dos decimales (ej. `S/ 189.90`).
- **Validación de Identidad (DNI)**: Todo formulario de registro de usuario o finalización de compra MUST exigir y validar un Documento Nacional de Identidad (DNI) de exactamente 8 dígitos numéricos.
- **Validación Telefónica**: Los números de contacto móvil solicitados al cliente y los configurados para Yape/Plin MUST validar el estándar peruano de exactamente 9 dígitos numéricos.

*Rationale*: Alinea el software con las costumbres comerciales, normativas de comprobantes de pago y expectativas de usabilidad del consumidor en el Perú.

### V. Verificabilidad sin Bloqueos y Experiencia de Usuario Ágil
- **Barra de Navegación Global (Top Bar Switcher)**: La aplicación MUST mantener en todo momento una barra superior accesible que permita alternar instantáneamente entre las tres áreas clave del sistema:
  1. **Tienda del Cliente**: Navegación de productos, búsqueda, filtrado por categorías fitness y carrito de compras interactivo.
  2. **Perfil y Pedidos del Cliente**: Consulta de historial de compras, seguimiento de pedidos y descarga/revisión de comprobantes.
  3. **Panel de Administración**: Métricas globales, gestión de pedidos pendientes de aprobación, administración de catálogo y configuración del sistema.
- **Acceso Rápido Administrador en 1 Clic**: La barra MUST incluir un botón de atajo que autentique o traslade de inmediato a la sesión de administrador sin forzar el reingreso manual de credenciales durante sesiones de revisión o QA.
- **Pestaña de Configuración Financiera**: El panel de administración MUST disponer de una pestaña específica para auditar y actualizar en caliente los datos de recaudación del propietario (Banco, Número de Cuenta, CCI, Titular, Celular Yape/Plin), impactando de inmediato en las vistas de checkout del cliente.

*Rationale*: Agiliza las auditorías de producto, las demostraciones comerciales y el control continuo de calidad sin fricciones ni bloqueos en flujos de autenticación.

## Estándares Técnicos y Arquitectura de Datos

### Integridad de Datos y Persistencia
- Las relaciones entre `orders`, `order_items`, `users` y `payments` MUST mantener integridad referencial mediante claves foráneas activadas en SQLite (`PRAGMA foreign_keys = ON;`).
- Toda actualización de stock en la tabla `products` originada por un pedido MUST procesarse bajo transacciones atómicas de SQLite para prevenir condiciones de carrera.

### Seguridad y Configuración
- Las contraseñas de usuarios en `users` MUST almacenarse con algoritmos seguros de derivación de claves o hashing (ej. bcrypt).
- El backend MUST responder en formato JSON estandarizado con códigos de estado HTTP semánticos (200, 201, 400, 401, 403, 404, 500).

## Flujo Operativo y Políticas de Cobranza Directa

### Conciliación de Pagos
1. **Creación de Pedido**: El cliente añade suplementos o equipamiento fitness al carrito, ingresa sus datos (DNI de 8 dígitos y celular de 9 dígitos) y selecciona el método de pago preferido.
2. **Registro de Transacción**: El pedido se crea con estado inicial y se genera el registro correlativo en `payments`.
3. **Validación y Liquidación**:
   - En pagos con **Yape/Plin** y **Transferencia Bancaria**, el cliente registra el N° de operación y el comprobante (o voucher demo). El pedido pasa a estado `en_revision` para aprobación desde el Panel de Administración.
   - En pagos con **Tarjeta Sandbox**, el sistema valida la autorización simulada `AUTH-XXXX`, confirma la liquidación en la cuenta recaudadora del dueño y actualiza el pedido automáticamente a `pagado`.
4. **Comprobante y Despacho**: El cliente recibe un comprobante digital detallado con el desglose de productos y la constancia de abono a la cuenta del propietario.

## Governance

- La presente Constitución constituye el marco rector supremo para el desarrollo y evolución de FitStore Pro.
- Ninguna especificación técnica (`spec.md`), plan de implementación (`plan.md`) ni lista de tareas (`tasks.md`) podrá contradecir los 5 Principios Fundamentales aquí establecidos.
- Cualquier modificación a este marco regulatorio requerirá una propuesta de enmienda documentada, evaluando el impacto operativo y actualizando el versionado semántico según las siguientes reglas:
  - **MAJOR**: Eliminación, reemplazo o cambio incompatible de un principio básico.
  - **MINOR**: Incorporación de un nuevo principio o ampliación material de las reglas operativas.
  - **PATCH**: Correcciones ortográficas, aclaraciones semánticas o ajustes no funcionales de redacción.
- Todo Pull Request, revisión de código o tarea de implementación debe validar explícitamente el cumplimiento de estos principios antes de darse por completada.

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
