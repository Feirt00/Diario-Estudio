# manageste.md - Estructura de delegación de agentes

Cómo funciona el equipo de agentes de este proyecto y qué está haciendo cada uno.

- **Proyecto:** Diario de Estudio (`index.html` + `styles.css` + `app.js`)
- **Agente principal (padre):** **Zeirt** — decide, delega, revisa y entrega.
- **Fecha de creación:** 2026-10-21

---

## 1. El equipo

| Agente | Rol | Zona de código reservada |
|--------|-----|---------------------------|
| **Zeirt** (padre) | Decide qué se hace, delega, **verifica** el trabajo de los otros y completa lo que falte. Es el único que commitea. | Toda la app (revisión final) |
| **Agente 1 — Guardian de los Datos** | Robustez de datos: lectura/escritura de `localStorage`, validación de lo guardado, totales | `loadSessions`, `saveSessions`, `formatDate`, `calculateWeekMinutes`, `updateSessionList`, `createSessionItem`, submit del formulario de estudio, `#form-message` |
| **Agente 2 — Criptógrafo del Acceso** | Acceso de usuarios: hash, contraseñas, sesión, registro y login | `hashPassword`, `usernameKey`, `*Users`, `*Session`, `*Attempts`, `registerUser`, `loginUser`, `logoutUser`, `renderAuthStatus`, modal de acceso, bloque `// Inicializar` |
| **Agente 3 — Inspector (QA)** | Verifica los arreglos contra `vulnerabilities.md` y busca fallos nuevos | **Ninguna**: solo lee, prueba y escribe el informe |

> Cada agente tiene una zona reservada. Si un agente necesita tocar la zona de otro, **no lo hace**:
> lo anota en su informe y lo decide Zeirt. Así dos agentes pueden trabajar en el mismo archivo a la vez
> sin pisarse.

---

## 2. Protocolo de delegación (el que Zeirt sigue)

1. **Zeirt define la tarea** con: objetivo, prueba de auditoría concreta que hay que cerrar, zona de
   código reservada, zona prohibida, estilo del proyecto y formato del informe.
2. **El agente ejecuta** con ediciones puntuales. Nunca reescribe un archivo entero ni normaliza
   finales de línea (`app.js` tiene CRLF y LF mezclados: normalizarlo genera un diff gigante).
3. **El agente se reporta**: qué cambió, cómo se comprueba, qué encontró y **qué NO** arregló.
4. **Zeirt verifica** (esto no es opcional):
   - lee el diff y comprueba que nadie tocó la zona de otro;
   - ejecuta la batería de pruebas en el navegador;
   - repite las pruebas de `vulnerabilities.md` para ver si alguna sigue fallando;
   - decide: aprobar, devolver con cambios o resolverlo él mismo.
5. **Zeirt completa** lo que quede: el apartado de agentes en la app, `MEMORY.md`, `AGENTS.md` y
   `vulnerabilities.md`.
6. **Solo Zeirt hace commit** (rama `master`). Los agentes nunca hacen `git add` ni `git commit`.

---

## 3. Apartado: qué está haciendo cada agente

_(estado en vivo; se actualiza al cerrar cada fase)_

### Fase 1 — Arreglos de la auditoría de seguridad

| Agente | Tarea | Pruebas | Estado | Resultado |
|--------|-------|---------|--------|-----------|
| **Agente 1 — Guardian de los Datos** | Que la app no se muera con datos corruptos y que no acepte datos imposibles | B1, B2, D2, B4 | En curso | — |
| **Agente 2 — Criptógrafo del Acceso** | Que la contraseña no se rompa en segundos y que la sesión no se falsifique a la ligera | C3, C4, C5, C6, B3, A3 | En curso | — |
| **Agente 3 — Inspector (QA)** | Repasar todo y buscar fallos nuevos | Repetir las 28 + pruebas nuevas | En espera (arranca cuando terminen 1 y 2) | — |
| **Zeirt (padre)** | Verificar, integrar, documentar y commitear | Diff + pruebas | supervising | — |

### Fase 2 — Verificación y cierre (prevista)

| Agente | Tarea | Estado |
|--------|-------|--------|
| **Agente 3 — Inspector (QA)** | Batería completa sobre la app ya arreglada + informe de hallazgos nuevos | Pendiente |
| **Zeirt (padre)** | Revisar, actualizar `vulnerabilities.md` / `MEMORY.md` / `AGENTS.md` y commitear | Pendiente |

---

## 4. Reglas que heredan los agentes

- Textos de la interfaz en español.
- Llaves en su propia línea, 4 espacios, comentarios solo donde aporten.
- Nunca `innerHTML` con datos del usuario: `createElement` + `textContent`.
- Fechas siempre en local: `parseLocalDate()` y `toLocalDateString()`, nunca `toISOString()` ni
  `new Date("AAAA-MM-DD")`.
- Nada de dependencias, frameworks, npm ni paso de build: la app tiene que abrir con doble clic.
- No se reescribe `app.js` entero ni se normalizan sus finales de línea.
- `MEMORY.md` se actualiza **al terminar cada tarea** y se mantiene en ~50 líneas.

---

## 5. Límites que la app no puede superar (para no prometer más de la cuenta)

La app es 100 % local: sin servidor, sin base de datos y sin red. Por eso hay cosas que **no tienen
arreglo real** y se aceptan como limitación (documentadas en `AGENTS.md`):

1. El rate limit y el bloqueo de 30 s viven en `localStorage`: se pueden resetear a mano y no
   cubren otros navegadores (prueba **C1** y **C2**).
2. La sesión no se puede firmar de verdad: sin backend, cualquier secreto queda en el mismo
   navegador. Se valida su forma y que el usuario exista, pero la impersonación de un usuario
   **existente** sigue siendo posible (prueba **B3**).
3. La contraseña se guarda hasheada, pero quien tenga el navegador puede leer el hash. Con PBKDF2 y
   salt aleatorio ya no se rompe con un diccionario trivial (pruebas **C4** y **C5**).

---

## 6. Historial de fases

| Fecha | Fase | Resultado |
|-------|------|-----------|
| 2026-10-21 | Auditoría de seguridad | 28 pruebas en `vulnerabilities.md`: el XSS aguanta; fallan datos y autenticación |
| 2026-10-21 | Fase 1 (arreglos) | Agente 1 + Agente 2 en paralelo, Zeirt como verificador |
