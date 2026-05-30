# Artesanos Market

Proyecto final de Ingeniería de Software. Sistema web MVP de e-commerce para artesanos y pequeños productores locales en Guatemala.

## Flujo principal

1. El cliente inicia sesión.
2. Consulta el catálogo de productos.
3. Agrega productos al carrito.
4. Realiza checkout.
5. El sistema genera un pedido y simula el pago.
6. El cliente consulta su historial de pedidos.

## Tecnologías

- Frontend: React + Vite + Bootstrap
- Backend: .NET 8 Minimal API
- Base de datos: SQL Server documentado en scripts, base en memoria para ejecución rápida del MVP
- CI/CD: Azure Pipelines
- Pruebas: xUnit + Microsoft.AspNetCore.Mvc.Testing

## Estructura

```txt
backend/   API .NET y pruebas
database/  Scripts SQL
docs/      Documentación técnica y plan de pruebas
frontend/  Aplicación React
```

## Ejecutar backend

```bash
cd backend/src/ArtesanosMarket.Api
dotnet restore
dotnet run
```

La API queda disponible en:

```txt
http://localhost:5000
```

También se puede abrir Swagger en:

```txt
http://localhost:5000/swagger
```

## Ejecutar frontend

```bash
cd frontend
npm install
npm run dev
```

Por defecto el frontend consume la API en `http://localhost:5000`. Si se necesita otro endpoint, crear un archivo `.env` en `frontend/`:

```txt
VITE_API_URL=http://localhost:5000
```

## Usuarios demo

```txt
Cliente: cliente@demo.com / Demo123
Vendedor: vendedor@demo.com / Demo123
```

## Pruebas

```bash
dotnet test backend/tests/ArtesanosMarket.Tests/ArtesanosMarket.Tests.csproj
```

## Pipeline

El archivo `azure-pipelines.yml` ejecuta:

- Restore backend
- Build backend
- Test backend
- Install frontend
- Build frontend

## Alcance implementado

- Login demo
- Registro vía API
- Catálogo de productos
- Carrito
- Checkout
- Pago mock
- Historial de pedidos
- Pipeline CI
- Pruebas funcionales básicas
