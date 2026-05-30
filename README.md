# Artesanos Market

Proyecto final de Ingeniería de Software. Sistema web MVP de e-commerce para artesanos y pequeños productores locales en Guatemala.

## Aplicación desplegada

- Frontend: https://artesanos-market.vercel.app/
- Backend API: https://artesanos-market-backend-u5nf.onrender.com

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
- Base de datos: SQL Server documentado en scripts, base en memoria para ejecución rápida del MVP y ambiente demo
- CI/CD: GitHub Actions, Vercel y Render
- Pruebas: xUnit + Microsoft.AspNetCore.Mvc.Testing + Coverlet

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

Para apuntar al backend desplegado:

```txt
VITE_API_URL=https://artesanos-market-backend-u5nf.onrender.com
```

## Usuarios demo

```txt
Cliente: cliente@demo.com / Demo123
Vendedor: vendedor@demo.com / Demo123
Administrador: admin@demo.com / Demo123
```

## Pruebas

Ejecutar pruebas del backend:

```bash
dotnet test backend/tests/ArtesanosMarket.Tests/ArtesanosMarket.Tests.csproj
```

Ejecutar pruebas con cobertura desde CI:

```bash
dotnet test "$project" --configuration Release --logger "trx" /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:CoverletOutput="../../../TestResults/Coverage/coverage" /p:Threshold=60 /p:ThresholdType=line /p:ThresholdStat=total
```

La cobertura mínima configurada es del 60% por líneas y el reporte se publica como artifact de GitHub Actions con el nombre `backend-coverage`.

## CI/CD

El pipeline principal está configurado en `.github/workflows/ci.yml` y se ejecuta con `push` y `pull_request` hacia las ramas principales del flujo de trabajo.

El pipeline ejecuta:

- Restore backend
- Build backend
- Análisis estático backend con `dotnet format`
- Pruebas backend con cobertura usando Coverlet
- Publicación del artifact `backend-coverage`
- Instalación de dependencias frontend
- Lint frontend
- Build frontend
- Publicación del artifact `frontend-dist`

El despliegue continuo se realiza desde GitHub hacia:

- Frontend en Vercel: https://artesanos-market.vercel.app/
- Backend en Render: https://artesanos-market-backend-u5nf.onrender.com

## Alcance implementado

- Login demo
- Registro vía API
- Catálogo de productos
- Carrito
- Checkout
- Pago mock
- Historial de pedidos
- Panel de vendedor
- Gestión de productos por vendedor
- Panel administrador
- Reportes básicos
- Pipeline CI/CD con GitHub Actions
- Pruebas automatizadas backend con cobertura
- Pruebas funcionales documentadas
