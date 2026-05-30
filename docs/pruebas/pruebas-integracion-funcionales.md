# Pruebas de integración y funcionales

## Proyecto
Artesanos Market

## Objetivo
Validar que los principales flujos funcionales del sistema operen correctamente integrando frontend, backend y almacenamiento de datos. Estas pruebas complementan las pruebas automatizadas del backend y sirven como evidencia de aceptación funcional para la Fase 2.

## Ambiente de prueba

- Frontend: Vercel
- Backend: Render
- Base de datos en ambiente online: InMemory con datos demo
- Base de datos local: SQL Server
- Navegador sugerido: Google Chrome o Microsoft Edge
- Usuarios demo:
  - cliente@demo.com / Demo123
  - vendedor@demo.com / Demo123
  - admin@demo.com / Demo123

## Escenario 1: Inicio de sesión de cliente

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Integración Frontend-Backend |
| Precondición | Backend y frontend desplegados y disponibles |
| Datos | cliente@demo.com / Demo123 |
| Pasos | 1. Abrir la URL del frontend. 2. Ingresar correo y contraseña del cliente. 3. Presionar Entrar. |
| Resultado esperado | El sistema autentica al usuario y muestra el catálogo únicamente después del login. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 2: Publicación de producto por vendedor

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Integración Frontend-Backend |
| Precondición | Usuario vendedor autenticado |
| Datos | Producto de prueba con nombre, descripción, precio, stock, categoría e imagen |
| Pasos | 1. Iniciar sesión como vendedor. 2. Ir al Panel vendedor. 3. Completar el formulario Publicar producto. 4. Presionar Agregar producto. |
| Resultado esperado | El sistema muestra mensaje de producto agregado, limpia el formulario y actualiza la tabla Mis productos. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 3: Edición y cancelación de edición de producto

| Campo | Detalle |
|---|---|
| Tipo | Funcional |
| Precondición | Usuario vendedor autenticado y con productos disponibles |
| Datos | Producto existente |
| Pasos | 1. En Panel vendedor, seleccionar Editar en un producto. 2. Verificar que el formulario cambia a modo Actualizar producto. 3. Presionar Cancelar. |
| Resultado esperado | El formulario se limpia, desaparece el modo edición y el botón vuelve a Agregar producto. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 4: Agregar producto al carrito sin exceder stock

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Integración Frontend-Backend |
| Precondición | Usuario cliente autenticado y productos activos disponibles |
| Datos | Producto con stock mayor a cero |
| Pasos | 1. Iniciar sesión como cliente. 2. Agregar un producto al carrito. 3. Abrir la vista Carrito. |
| Resultado esperado | El producto aparece en el carrito con cantidad, precio unitario, subtotal y total actualizado. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 5: Validación de stock insuficiente

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Regla de negocio |
| Precondición | Usuario cliente autenticado y producto con stock limitado |
| Datos | Producto con stock bajo |
| Pasos | 1. Agregar el producto al carrito. 2. Incrementar la cantidad por encima del stock disponible. |
| Resultado esperado | El sistema bloquea la operación y muestra alerta indicando que no hay suficiente stock. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 6: Checkout y generación de pedido

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Integración Frontend-Backend |
| Precondición | Cliente autenticado con productos válidos en carrito |
| Datos | Dirección, teléfono, método de pago y observaciones |
| Pasos | 1. Ir a Carrito. 2. Completar datos de entrega. 3. Confirmar compra. |
| Resultado esperado | El sistema genera un pedido confirmado, descuenta stock y muestra mensaje de confirmación. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 7: Cambio de estado de pedido por vendedor

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Integración |
| Precondición | Existe un pedido generado para un producto del vendedor |
| Datos | Pedido confirmado |
| Pasos | 1. Iniciar sesión como vendedor. 2. Ir a Pedidos recibidos. 3. Cambiar estado del pedido a En preparación, Enviado o Entregado. |
| Resultado esperado | El estado del pedido se actualiza correctamente. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Escenario 8: Administración de usuarios y productos

| Campo | Detalle |
|---|---|
| Tipo | Funcional / Administración |
| Precondición | Usuario administrador autenticado |
| Datos | Usuario o producto activo |
| Pasos | 1. Iniciar sesión como administrador. 2. Ir al Panel admin. 3. Activar o desactivar un usuario o producto. |
| Resultado esperado | El sistema actualiza el estado y refleja el cambio en la tabla correspondiente. |
| Resultado obtenido | Pendiente de completar con evidencia. |
| Estado | Pendiente de evidencia |

## Evidencia requerida
Para cerrar este documento se deben adjuntar capturas de:

1. Login exitoso.
2. Producto publicado por vendedor.
3. Producto agregado al carrito.
4. Validación de stock insuficiente.
5. Pedido generado.
6. Cambio de estado de pedido.
7. Panel administrador con usuarios/productos.

## Conclusión
Los escenarios definidos cubren los flujos principales del sistema para los tres roles: cliente, vendedor y administrador. También validan reglas críticas como autenticación, publicación de productos, carrito, validación de stock, checkout, pedidos y administración básica.
