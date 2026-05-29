# Arquitectura del sistema

## Estilo arquitectónico

El proyecto usa una arquitectura simple de aplicación web en capas:

- Frontend React: interfaz web para cliente y vendedor.
- Backend .NET 8 API: expone endpoints REST para autenticación, catálogo, carrito, pedidos y pago mock.
- Base de datos: modelo relacional documentado para SQL Server.
- Pipeline: automatiza compilación y pruebas.

## Diagrama lógico

```txt
Usuario Web
   |
   | HTTPS / REST JSON
   v
Frontend React
   |
   | HTTP / REST JSON
   v
Backend .NET API
   |
   | EF Core / SQL
   v
Base de datos
```

## Decisiones técnicas

| Decisión | Justificación |
|---|---|
| Monorepo | Facilita el trabajo del equipo y la entrega del curso |
| React + Vite | Permite construir rápido una interfaz funcional |
| .NET 8 Minimal API | Reduce complejidad inicial y permite crear endpoints rápidamente |
| Pago mock | Cumple el flujo de compra sin depender de una pasarela real |
| Azure Pipelines | Coincide con lo solicitado en el curso y evidencia CI |
