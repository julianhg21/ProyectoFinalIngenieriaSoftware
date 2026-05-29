# Plan de pruebas

## Objetivo

Validar que el MVP de Artesanos Market permita ejecutar el flujo principal de compra: inicio de sesión, catálogo, carrito, checkout, pago simulado e historial de pedidos.

## Alcance

Incluye pruebas funcionales de API, pruebas básicas del frontend mediante build y pruebas unitarias automatizadas del backend.

## Casos principales

| ID | Caso | Resultado esperado |
|---|---|---|
| CP-01 | Consultar estado de API | La API responde 200 OK |
| CP-02 | Listar productos | Devuelve productos activos |
| CP-03 | Iniciar sesión con usuario demo | Devuelve usuario y token demo |
| CP-04 | Agregar producto al carrito | El carrito actualiza total y detalle |
| CP-05 | Confirmar checkout | Se genera pedido con pago aprobado mock |
| CP-06 | Consultar historial | Se muestran pedidos del cliente |

## Criterios de salida

- El backend compila sin errores.
- Las pruebas automatizadas pasan correctamente.
- El frontend genera build exitoso.
- El flujo principal puede demostrarse en video.
