# 📖 BrewDesk — Manual de Usuario y Guía Operativa por Roles

Este manual proporciona una guía detallada para el personal de la cafetería según su perfil de trabajo: **Administrador / Dueño**, **Gerente**, **Cajero**, **Barista** y **Mesero**.

---

## 📑 Tabla de Contenidos

1. [Acceso al Sistema (Inicio de Sesión y PIN)](#1-acceso-al-sistema-inicio-de-sesión-y-pin)
2. [Rol: Cajero (Operación de Caja y Mostrador)](#2-rol-cajero-operación-de-caja-y-mostrador)
   - [Apertura de Turno de Caja](#apertura-de-turno-de-caja)
   - [Toma de Pedidos en Mostrador](#toma-de-pedidos-en-mostrador)
   - [Procesamiento de Pagos y Facturación de Ticket](#procesamiento-de-pagos-y-facturación-de-ticket)
   - [Gastos de Caja Chica y Retiros de Efectivo](#gastos-de-caja-chica-y-retiros-de-efectivo)
   - [Cierre de Turno y Arqueo Ciego (Corte Z)](#cierre-de-turno-y-arqueo-ciego-corte-z)
3. [Rol: Barista y Cocina (Pantalla KDS)](#3-rol-barista-y-cocina-pantalla-kds)
   - [Comprensión de la Pantalla KDS](#comprensión-de-la-pantalla-kds)
   - [Gestión de Tiempos y Semáforos de Alerta](#gestión-de-tiempos-y-semáforos-de-alerta)
   - [Ciclo de Preparación y Despacho](#ciclo-de-preparación-y-despacho)
4. [Rol: Mesero (Comandas de Salón)](#4-rol-mesero-comandas-de-salón)
   - [Apertura de Mesa y Registro de Comanda](#apertura-de-mesa-y-registro-de-comanda)
   - [Modificaciones y Notas de Preparación](#modificaciones-y-notas-de-preparación)
5. [Rol: Gerente y Administrador (Gestión y Control)](#5-rol-gerente-y-administrador-gestión-y-control)
   - [Supervisión de Inventarios y Kardex](#supervisión-de-inventarios-y-kardex)
   - [Registro de Entradas de Compras y Mermas](#registro-de-entradas-de-compras-y-mermas)
   - [Catálogo de Productos y Modificadores](#catálogo-de-productos-y-modificadores)
   - [Lectura del Dashboard y Reportes Financieros](#lectura-del-dashboard-y-reportes-financieros)

---

## 1. Acceso al Sistema (Inicio de Sesión y PIN)

BrewDesk ofrece dos mecanismos de autenticación diseñados para agilidad operativa:

1. **Credenciales Completas (Correo y Contraseña):** Utilizado principalmente por Administradores y Gerentes para ingresar a la configuración y auditoría general.
2. **PIN Numérico Rápido (4 Dígitos):** Pantalla táctil estilo teclado numérico (`Keypad`). Permite a cajeros, meseros y baristas cambiar de usuario entre órdenes en menos de 2 segundos sin teclear contraseñas largas.

---

## 2. Rol: Cajero (Operación de Caja y Mostrador)

### Apertura de Turno de Caja
1. Antes de realizar cualquier venta, navega a la pestaña **Caja**.
2. Si la caja se encuentra cerrada, aparecerá el diálogo de **Apertura de Caja**.
3. Ingresa el monto del **Fondo Inicial de Caja** (dinero en efectivo entregado para dar cambio, ej. `$1,000.00 MXN`).
4. Presiona **Abrir Caja**. La caja quedará habilitada para registrar ventas.

### Toma de Pedidos en Mostrador
1. En la pantalla **POS**, selecciona la categoría del menú (ej. *Café Caliente*).
2. Toca el producto deseado (ej. *Flat White*):
   - Si el producto tiene tamaños, selecciona el tamaño (*8oz*, *12oz*, *16oz*).
   - Elige los modificadores requeridos (ej. *Leche de Avena +$15.00*, *Shot Extra +$12.00*).
   - Agrega notas especiales si el cliente lo solicita (ej. *Tibia*, *Sin azúcar*).
3. Presiona **Agregar a la Orden**. El ítem se sumará al panel lateral derecho.

### Procesamiento de Pagos y Facturación de Ticket
1. Revisa el subtotal de la orden en el panel lateral.
2. Selecciona si el pedido es **Para Consumir Aquí (Mesa)** o **Para Llevar**.
3. Presiona el botón verde **Cobrar**.
4. En el modal de cobro:
   - Selecciona el porcentaje de **Propina Voluntaria** sugerida (0%, 10%, 15%, 20%).
   - Selecciona el **Método de Pago**:
     - **Efectivo:** Digita el monto entregado por el cliente. El sistema calculará en tiempo real el cambio exacto a devolver.
     - **Tarjeta (Débito/Crédito):** Introduce la referencia o confirmación de la terminal bancaria.
     - **Transferencia:** Ingresa los dígitos de confirmación SPEI.
     - **Pago Mixto:** Divide el saldo entre efectivo y tarjeta según lo solicite el cliente.
5. Presiona **Confirmar Pago**. El sistema:
   - Genera el folio consecutivo `TKT-xxxx`.
   - Envía la comanda a la estación KDS del barista.
   - Descuenta los insumos del Kardex en milisegundos.
   - Presenta el ticket listo para entregar al cliente.

### Gastos de Caja Chica y Retiros de Efectivo
Si durante el turno se requiere realizar un pago menor (ej. compra urgente de hielo o insumo) o un retiro parcial de seguridad:
1. Ve a la pestaña **Caja** y selecciona **Movimiento de Efectivo**.
2. Elige el tipo: **Salida (Gasto Menor / Retiro)** o **Entrada (Depósito)**.
3. Ingresa el monto y el motivo detallado (ej. *"Compra de bolsa de hielo 5kg"*).
4. Confirma el movimiento. El sistema ajustará el efectivo esperado en caja.

### Cierre de Turno y Arqueo Ciego (Corte Z)
1. Al finalizar el turno de trabajo, navega a **Caja** -> **Cerrar Turno (Corte Z)**.
2. Realiza el conteo físico de todo el efectivo presente en el cajón (billetes y monedas).
3. Ingresa la cantidad real contada en el campo **Efectivo Físico Contado**.
4. Presiona **Cerrar Caja**:
   - El sistema calculará automáticamente la diferencia (`Efectivo Contado - Efectivo Esperado`).
   - Se generará el reporte de cierre con el desglose de ventas por tarjeta, transferencias, propinas acumuladas y la diferencia de efectivo (cuadrado, sobrante o faltante).

---

## 3. Rol: Barista y Cocina (Pantalla KDS)

### Comprensión de la Pantalla KDS
El KDS muestra las comandas pendientes agrupadas en tarjetas visuales de alto contraste.
En la barra superior, el barista puede filtrar por su estación de trabajo:
- **Barista Caliente:** Espressos, cappuccinos, lattes, infusiones.
- **Barista Frío:** Cold brew, frappes, sodas italianas, bebidas con hielo.
- **Cocina:** Sándwiches, paninis, desayunos calientes.
- **Todas las Estaciones:** Vista general de coordinación.

### Gestión de Tiempos y Semáforos de Alerta
Cada tarjeta de pedido cuenta con un cronómetro de tiempo transcurrido desde su envío:
- 🟢 **Verde (< 4 min):** Tiempo óptimo de preparación.
- 🟡 **Amarillo (4 a 7 min):** Advertencia de demora moderada.
- 🔴 **Rojo (> 7 min):** Alerta crítica de retraso. Priorizar inmediatamente.

### Ciclo de Preparación y Despacho
1. **Comanda en Espera (`pending`):** La comanda entra a la pantalla con sonido de notificación.
2. **Iniciar Preparación (`preparing`):** El barista toca la tarjeta o el botón **Preparar** para indicar a los meseros y cajeros que la bebida está siendo elaborada en máquina.
3. **Marcar Listo (`ready`):** Una vez extraído el café y montada la bebida, presiona **Listo**. La bebida queda en barra de recogida.
4. **Entregar al Cliente (`delivered`):** Cuando el comensal o mesero retira la bebida, se presiona **Entregado** para despejar la pantalla KDS.

---

## 4. Rol: Mesero (Comandas de Salón)

### Apertura de Mesa y Registro de Comanda
1. Ingresa al sistema con tu PIN de mesero.
2. En la vista de mesas o POS, selecciona la mesa ocupada (ej. `Mesa 3 - Salón`).
3. Agrega las bebidas y platillos solicitados por los comensales.
4. Especifica los modificadores por comensal (ej. comensal 1: cappuccino con leche deslactosada; comensal 2: latte con jarabe de vainilla).
5. Presiona **Enviar a Barra/Cocina**. La comanda viaja instantáneamente al KDS de los baristas sin necesidad de cobrar todavía.

### Cobro de Mesa
Cuando la mesa solicita la cuenta:
1. Selecciona la comanda activa de la mesa en el POS.
2. Revisa el subtotal, agrega propina sugerida si el cliente lo autoriza.
3. Procede al cobro en el modal de pago y entrega el comprobante a la mesa. La mesa pasará automáticamente al estado **Libre**.

---

## 5. Rol: Gerente y Administrador (Gestión y Control)

### Supervisión de Inventarios y Kardex
1. Ingresa a la pestaña **Inventario**.
2. Observa el estado de los insumos según su semáforo:
   - **Óptimo:** Stock suficiente por encima del mínimo.
   - **Stock Bajo:** Stock por debajo del punto de reorden. Se requiere compra.
   - **Agotado:** Existencia en cero. El producto asociado se desactiva del POS para evitar órdenes fallidas.
3. Toca cualquier insumo para auditar su **Kardex**: Podrás ver cada gramo o mililitro consumido con la referencia exacta del ticket que lo generó.

### Registro de Entradas de Compras y Mermas
- **Para registrar llegada de insumos:** Presiona **Registrar Entrada**, selecciona el insumo (ej. *Café Grano Chiapas*), ingresa la cantidad (ej. `5,000 g`), el costo unitario y la factura de compra.
- **Para registrar merma:** Presiona **Registrar Merma/Ajuste**, indica la cantidad y el motivo obligatorio (*Calibración matutina de molino*, *Leche caducada*, etc.).

### Catálogo de Productos y Modificadores
1. Navega a **Productos**.
2. Puedes activar o pausar la disponibilidad de cualquier producto con un solo toque (útil cuando se termina un ingrediente temporalmente).
3. Administra los precios de variantes y los recargos de modificadores.

### Lectura del Dashboard y Reportes Financieros
En la vista **Dashboard**, el gerente tiene acceso en tiempo real a:
- Facturación total del día, semana o mes.
- Cantidad de tickets y ticket promedio por comensal.
- Gráficas de ventas por franja horaria para programar turnos del personal en horas pico.
- Top 5 de productos más vendidos y más rentables.
