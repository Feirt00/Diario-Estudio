# MEMORY.md - Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1.2: registro/login local (modal) con estado en la cabecera, racha actual, mejor racha y
  lista de sesiones. Tema claro/oscuro.
- Claves en localStorage (con prefijo `diario-estudio-`): `sesiones`, `tema`, `usuarios`,
  `sesion`, `login-intentos`. Si alguna vez se listan sin prefijo, es un error.
- Todo en `index.html` + `styles.css` + `app.js`. Sin build, sin dependencias, sin tests en el repo.
- Versionado: `git init` + rama `master` (orphan) apuntando a `https://github.com/Feirt00/Agentes.git`.
  En ese repo `main` contiene otra cosa: no mezclarla ni borrarla.

## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic (`file://`).
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- Mejor racha = corrida consecutiva máxima en todo el historial, sin anclaje a hoy/ayer.
- Ninguna racha se guarda: siempre se recalcula desde `diario-estudio-sesiones` (fuente única
  de verdad), para que no se desincronicen al borrar o editar sesiones.
- Acceso solo localStorage. La app NO está protegida: el login identifica, no bloquea, para no
  romper el flujo actual ni obligar a crear cuenta.
- Contraseñas hasheadas con FNV-1a + salt fijo. A propósito es simple: no criptográfico.
- Usuario sin distinguir mayúsculas ni espacios gracias a `usernameKey`; se guarda el nombre tal
  cual para mostrarlo. Sesión sin caducidad.

## Aprendizajes y errores a evitar
- No mezclar el anclaje de la racha actual (hoy/ayer) con el cálculo histórico de la mejor racha.
- `new Date("AAAA-MM-DD")` se parsea en UTC y desplaza el día: usar `parseLocalDate()`.
- Nada de `innerHTML` con datos del usuario, ni por comodidad: `updateSessionList()` lo usaba con
  `session.topic` y rompía la regla de `AGENTS.md`. Se pintó con `createSessionItem()` + `textContent`.
- Al documentar, escribir siempre las claves de localStorage con su prefijo real, o se confunden.
- Validaciones y rate limit van DENTRO de `registerUser()`/`loginUser()`, no en el evento del
  formulario; si no, quedan sin aplicar cuando se llaman desde otro sitio.
- Al concatenar o reescribir archivos con PowerShell 5.1 se rompen acentos, emojis y aparece un
  BOM. Usar el editor de opencode, no `Set-Content`.

## Próximos pasos
- (vacío por ahora)
