# Prompts iniciales — Interfaz «position» (kanban) de LTI

> Prompts realmente utilizados. Herramienta: Claude Code (extensión de VS Code), modelo Claude Sonnet 5.5. El resultado se describe tal como ocurrió.

## Contexto aportado
- Enunciado oficial del ejercicio «Creando la interfaz de gestión de aplicaciones de LTI» (tres contratos de API y requisitos de diseño).
- Este repositorio (frontend CRA + React 18 + TypeScript + react-bootstrap, y backend Express + Prisma), levantado en local con PostgreSQL en un contenedor Docker aislado y los datos de `prisma/seed.ts`.
- Una solución previa del mismo ejercicio, hecha sin acceso a este repositorio (HTML + JavaScript sin dependencias); se reutilizó su lógica (orden de fases, asociación de tarjetas, movimiento optimista con reversión), no su código.

## Prompt 1 — Encargo inicial (resumen fiel)
> Implementa el ejercicio: interfaz kanban de gestión de candidatos; título de la posición; flecha para volver al listado; columnas dinámicas según las fases; tarjetas con nombre completo y puntuación media; drag & drop para actualizar la fase; diseño responsive; integración con los endpoints. Revisa las inconsistencias de los contratos y documenta cada decisión. Sin sobreingeniería ni funcionalidades extra.

## Prompt 2 — Adaptación a este repositorio (resumen fiel)
> Adapta la solución al repositorio oficial usando React y los contratos reales del backend. Instala lo necesario, prepara PostgreSQL en un entorno local aislado, reutiliza la lógica y lo aprendido, ejecuta las comprobaciones necesarias y limítate a los requisitos oficiales.

## Qué se encontró al contrastar el enunciado con el backend real
| Enunciado | Backend real de este repositorio | Decisión |
|---|---|---|
| `GET /positions/:id/interviewFlow` | `GET /position/:id/interviewflow` (singular, minúsculas) | Se usa la ruta real. |
| Respuesta `{ positionName, interviewFlow }` | Envuelta: `{ interviewFlow: { positionName, interviewFlow: { … } } }` | El cliente desenvuelve la respuesta. |
| `GET /positions/:id/candidates` sin identificadores | `GET /position/:id/candidates` devuelve además `id` (candidato) y `applicationId` | Se usan para identificar la tarjeta y para el PUT. |
| `PUT /candidates/:id/stage` | `PUT /candidates/:id` con `{ applicationId, currentInterviewStep }` | Se usa la ruta real; `:id` es el id del candidato. |
| Dos fases con `orderIndex` 2 en el ejemplo | Igual en los datos de ejemplo | Se ordena por `orderIndex` y, en empate, por `id`. |

## Resultado de las comprobaciones (ejecución real)
- `tsc --noEmit` sin errores. `npm run build` correcto (con `CI=true` falla por un aviso previo de `AddCandidateForm.js`, ajeno a este cambio).
- Prueba en Chrome contra el backend y la base de datos reales: 15/15 comprobaciones (navegación desde «Ver proceso», título, columnas por fase, tarjetas con nombre y puntuación, flecha de volver, arrastrar y soltar con actualización real en la base de datos, persistencia al recargar, alternativa con selector, y diseño móvil de 390 px en vertical y sin desplazamiento horizontal).

## Iteración real
La primera ejecución de la verificación dio 3 fallos porque esperaba solo 800 ms a que la base de datos reflejara el cambio; la petición tardó más en esa primera ejecución. Se cambió la espera por un sondeo con límite. En la segunda ejecución la actualización tardó 159 ms. No se cambió el código de la interfaz por este motivo.

## Qué no se delegó
Decidir qué se envía en el PUT y cómo se asocian las fases, y comprobar que la actualización llega de verdad a la base de datos.

## No comprobado
- La reversión de la tarjeta cuando el servidor devuelve un error (el código la implementa; no se forzó un fallo).
- Navegadores distintos de Chrome ni pantallas táctiles reales.
