# Prompt para proponer la página `position` con OpenSpec

Genera los artefactos de planificación de OpenSpec para la página `position` de este repositorio. Lee `prompts/requerimientos.md` completo y úsalo como fuente del comportamiento solicitado. Propón el cambio con el nombre `agregar-kanban-de-posicion`.

## Flujo de trabajo

1. **Explora con `openspec-explore`.** Empieza con la skill instalada en `.agents/skills/openspec-explore/SKILL.md` y trabaja en modo de solo lectura. Revisa `requerimientos.md`, las especificaciones y los cambios activos de OpenSpec, el enrutamiento de React, el listado de posiciones y las rutas, controladores y servicios relevantes de Express. Contrasta las rutas y los JSON del documento con `backend/api-spec.yaml` y el código. Comprueba las rutas de consulta y actualización, la estructura del flujo de entrevistas y los identificadores de candidato, aplicación y fase necesarios para persistir un movimiento. Resume las discrepancias con referencias a los archivos y registra las decisiones menores como supuestos. Si queda una duda que cambia el alcance o el comportamiento esperado, pide una aclaración antes de pasar a la propuesta.
2. **Genera los artefactos con `openspec-propose`.** Una vez entendido el proyecto, sal del modo de exploración y usa `.agents/skills/openspec-propose/SKILL.md` para crear el cambio a partir de los hallazgos. Sigue el esquema `spec-driven`, el orden de dependencias y las instrucciones que devuelva la CLI para cada artefacto. Crea `proposal.md`, las especificaciones delta `specs/<capacidad>/spec.md`, `design.md` y `tasks.md` dentro del cambio. Incluye escenarios verificables con `GIVEN`, `WHEN` y `THEN`, un diseño de integración basado en el contrato comprobado y tareas de implementación y verificación futuras con sus casillas pendientes.

## Alcance funcional

- Diseña el contenido interno de una posición específica dentro de la estructura existente de la aplicación. Incluye el título y una flecha a su izquierda para volver al listado de posiciones.
- Describe un tablero Kanban con una columna por fase del flujo de contratación. Cada tarjeta debe aparecer en su fase actual y mostrar el nombre completo y la puntuación media del candidato.
- Especifica cómo arrastrar una tarjeta a otra columna actualiza la fase de la aplicación del candidato mediante la API y cómo se comprobará que el cambio quedó guardado.
- Evalúa la viabilidad de mostrar las fases en vertical y a ancho completo en móvil, tal como pide el documento si es posible.

## Límite y entrega

Escribe únicamente la estructura inicial y los artefactos del cambio OpenSpec. La implementación queda pendiente de una solicitud posterior. Mantén en solo lectura el código, las pruebas, las dependencias, las migraciones, la configuración y las especificaciones principales. Omite la ejecución de `openspec-apply-change`, la sincronización y el archivado.

Al terminar el flujo de la skill, entrega la ruta del cambio, la lista de artefactos, el estado final, el resultado de la validación estricta y las discrepancias o preguntas pendientes. Detente después de presentar los artefactos.

