# Plan de pruebas consolidado

## Proyecto
Artesanos Market

## Objetivo del plan
Definir la estrategia de pruebas utilizada para validar la calidad funcional y técnica del sistema desarrollado en la Fase 2. El plan incluye pruebas unitarias, pruebas de integración, pruebas funcionales/manuales, herramientas utilizadas, criterios de entrada y salida, y defectos detectados durante el desarrollo.

## Alcance

El alcance de pruebas cubre los módulos principales del sistema:

- Autenticación de usuarios.
- Roles de cliente, vendedor y administrador.
- Catálogo de productos.
- Gestión de productos del vendedor.
- Carrito de compras.
- Validación de stock.
- Checkout y generación de pedidos.
- Gestión de estados de pedidos.
- Administración de usuarios y productos.
- Reportes básicos.

## Tipos de prueba

| Tipo de prueba | Descripción | Herramienta |
|---|---|---|
| Pruebas unitarias/backend | Validan endpoints y reglas principales de la API. | xUnit, WebApplicationFactory |
| Cobertura de código | Mide la cobertura de las pruebas automatizadas del backend. | Coverlet |
| Pruebas de integración | Validan comunicación entre frontend, backend y datos. | Navegador, API desplegada, GitHub Actions |
| Pruebas funcionales/manuales | Validan los flujos de usuario desde la interfaz. | Chrome/Edge, Vercel, Render |
| Análisis estático backend | Revisión de formato y estándares básicos del backend. | dotnet format |
| Análisis estático frontend | Revisión de código React. | ESLint |
| Build automatizado | Compilación de backend y frontend. | GitHub Actions |
| Despliegue continuo | Publicación automática de frontend y backend. | Vercel, Render |

## Ambiente de pruebas

### Ambiente local

- Backend: .NET 8
- Frontend: React + Vite
- Base de datos: SQL Server local
- Scripts SQL: carpeta database

### Ambiente de CI

- Plataforma: GitHub Actions
- Backend: .NET 8
- Frontend: Node.js 20
- Base de datos de pruebas: InMemory
- Cobertura: Coverlet

### Ambiente online

- Frontend: Vercel
- Backend: Render
- Base de datos demo: InMemory con datos semilla

## Criterios de entrada

Para iniciar pruebas se requiere:

1. Código fuente actualizado en el repositorio.
2. Backend compilando correctamente.
3. Frontend compilando correctamente.
4. Usuarios demo disponibles.
5. Datos demo cargados.
6. Pipeline configurado en GitHub Actions.
7. Ambientes de Render y Vercel accesibles.

## Criterios de salida

Las pruebas se consideran finalizadas cuando:

1. El pipeline de CI/CD finaliza exitosamente.
2. Las pruebas automatizadas del backend pasan correctamente.
3. El reporte de cobertura se genera como artifact del pipeline.
4. La cobertura mínima configurada es de 60%.
5. Los escenarios funcionales principales han sido ejecutados.
6. Los defectos críticos han sido corregidos.
7. La aplicación está accesible desde URLs públicas.

## Pruebas unitarias automatizadas

Las pruebas automatizadas del backend se ubican en:

```txt
backend/tests/ArtesanosMarket.Tests/ApiTests.cs
```

Casos incluidos:

| Caso | Validación |
|---|---|
| Home_ReturnsOk | La API responde correctamente en la raíz. |
| Products_ReturnsSeededProducts | El catálogo devuelve productos semilla. |
| Login_DemoUser_ReturnsOk | Login correcto con usuario demo. |
| Login_InvalidPassword_ReturnsUnauthorized | Login incorrecto devuelve no autorizado. |
| Register_NewUser_ReturnsCreated | Registro exitoso de nuevo usuario. |
| Register_DuplicateEmail_ReturnsBadRequest | No permite correo duplicado. |
| CreateProduct_ReturnsCreated | Permite crear producto. |
| AddToCart_WithAvailableStock_ReturnsOk | Permite agregar producto con stock disponible. |
| AddToCart_ExceedingStock_ReturnsBadRequest | Bloquea cantidades mayores al stock. |
| Cart_ReturnsActiveCart | Devuelve carrito activo del usuario. |
| Checkout_EmptyCart_ReturnsBadRequest | No permite checkout con carrito vacío. |
| Checkout_WithCart_ReturnsOk | Permite checkout con carrito válido. |
| SellerOrders_ReturnsOk | Consulta pedidos de vendedor. |
| AdminUsers_ReturnsOk | Consulta usuarios desde administración. |
| AdminReport_ReturnsOk | Consulta reporte administrativo. |

## Cobertura de código

El pipeline ejecuta pruebas con Coverlet y valida una cobertura mínima del 60% por líneas.

Comando usado en CI:

```bash
dotnet test "$project" --configuration Release --logger "trx" /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:CoverletOutput="../../../TestResults/Coverage/coverage" /p:Threshold=60 /p:ThresholdType=line /p:ThresholdStat=total
```

El reporte se publica como artifact de GitHub Actions con el nombre:

```txt
backend-coverage
```

## Pruebas funcionales e integración

Los escenarios funcionales están documentados en:

```txt
docs/pruebas/pruebas-integracion-funcionales.md
```

Escenarios principales:

1. Inicio de sesión de cliente.
2. Publicación de producto por vendedor.
3. Edición y cancelación de edición de producto.
4. Agregar producto al carrito sin exceder stock.
5. Validación de stock insuficiente.
6. Checkout y generación de pedido.
7. Cambio de estado de pedido por vendedor.
8. Administración de usuarios y productos.

## Defectos encontrados y corregidos

| Defecto | Impacto | Corrección aplicada | Estado |
|---|---|---|---|
| El formulario de vendedor no limpiaba campos después de publicar producto. | El usuario no percibía que la acción había finalizado. | Se implementó formulario controlado con estado y reseteo visual. | Corregido |
| La lista Mis productos no se actualizaba inmediatamente. | El vendedor no veía el producto recién creado. | Se recargó la lista después de guardar. | Corregido |
| No existía botón para cancelar edición de producto. | El vendedor quedaba atrapado en modo edición. | Se agregó botón Cancelar y retorno a modo Agregar producto. | Corregido |
| El sistema permitía agregar más unidades que el stock disponible. | Riesgo de pedidos inválidos. | Se agregó validación de stock en carrito y checkout. | Corregido |
| El registro podía mostrar mensaje de error aunque el usuario se creara. | Confusión para el usuario. | Se bloqueó doble envío y se mejoró manejo de mensajes. | Corregido |
| El backend dependía de SQL Server local para pruebas CI. | Fallaba en GitHub Actions. | Se configuró ambiente Testing con InMemory. | Corregido |
| El deploy online requería base externa. | Dificultaba despliegue académico. | Se configuró Production con InMemory y datos demo. | Corregido |

## Evidencias a capturar

Para el PDF final se recomienda capturar:

1. Pipeline de GitHub Actions exitoso.
2. Job Backend .NET con build, análisis y pruebas.
3. Job Frontend React con lint y build.
4. Artifact backend-coverage.
5. Deploy exitoso en Render.
6. Deploy exitoso en Vercel.
7. Login exitoso en ambiente online.
8. Flujo de compra completo.
9. Validación de stock insuficiente.
10. Panel vendedor y panel administrador.

## Conclusión

El plan de pruebas cubre los módulos principales del sistema y combina pruebas automatizadas, pruebas funcionales, análisis estático, cobertura de código y validación de despliegue. Con esto se respalda que el sistema cumple con los flujos principales definidos para la Fase 2 y que existe evidencia técnica del proceso de calidad aplicado.
