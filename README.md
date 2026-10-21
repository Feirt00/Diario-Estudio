# 📚 Diario de Estudio

Web **100 % local** para registrar sesiones de estudio y motivarse con la racha de días seguidos:
cuánto estudiaste, qué tema, y unas gráficas para verlo de un vistazo. Sin servidores, sin bases de
datos, sin dependencias: se abre con doble clic en `index.html` y funciona.

Creado por **Feirt** con la ayuda de un **equipo de agentes de programación (IA)** dentro de
OpenCode — más detalles en [Cómo se hizo](#cómo-se-hizo-este-proyecto).

---

## Qué hace

- **📝 Registrar sesiones**: fecha, tema y minutos (acepta decimales como 12.5), desde el formulario
  o con el cronómetro.
- **🔥 Racha**: días consecutivos con al menos una sesión, mejor racha y total de minutos de la
  semana (de lunes a hoy), siempre calculados desde cero con todo el historial.
- **⏱️ Cronómetro**: cuenta atrás basada en la hora real (aguanta pestañas en segundo plano) que
  registra la sesión al terminar y avisa con un sonido (Web Audio API, sin archivos).
- **📊 Tres gráficos dibujados a mano con SVG** (nada de librerías ni CDN):
  - **Minutos por día**: ventana de 7 días con botones `‹ ›` y detalle por día al pulsar una barra.
  - **Reparto por tema** (pastel): con filtro global / hoy / día elegido / semana.
  - **Minutos por semana** (línea) y **Temas más estudiados**.
- **🔍 Filtros en la lista de sesiones**: hoy (por defecto), última semana, último mes o todo el
  historial — solo cambia lo que se pinta, nunca los totales.
- **👤 Cuentas locales**: registro e inicio de sesión con contraseñas hasheadas (PBKDF2 con salt),
  o bien usar la app **sin cuenta** como invitado. Cada usuario tiene sus propias sesiones.
- **🌗 Tema claro y oscuro** con un botón, y diseño responsive que se ve bien en el móvil.

## Cómo se usa

1. Doble clic en `index.html` (no hace falta servidor ni instalar nada).
2. Al entrar se muestra la **pantalla de acceso**: iniciar sesión, crear cuenta o **entrar sin cuenta**.
3. Registrar una sesión desde la pestaña 📚 Diario o dejar corriendo el ⏱️ Cronómetro.
4. Mirar el progreso en 📊 Gráficos. Todo se guarda solo en ese navegador.

## Estructura del proyecto

```
Diario De Estudio/
├── index.html      → estructura de la página (pestañas, paneles, pantalla de acceso)
├── styles.css      → todos los estilos (tema claro/oscuro, responsive, gráficos)
├── app.js          → lógica y datos (sesiones, racha, cuentas, cronómetro, gráficos SVG)
└── *.md            → documentación del proyecto (ver abajo)
```

- **Sin build, sin npm, sin frameworks**: HTML + CSS + JavaScript puros, tal cual los lee el
  navegador. Se puede abrir con `file://` (doble clic) y también funciona servida por HTTP.
- **Datos**: `localStorage` con el prefijo `diario-estudio-`. Las sesiones tienen la forma
  `{ date: "AAAA-MM-DD", topic, minutes }`; con cuenta la clave es
  `diario-estudio-sesiones-<usuario>` y sin cuenta la global `diario-estudio-sesiones`.
- **Documentación**:
  - `AGENTS.md` — reglas del proyecto (formato de código, fechas, seguridad, límites).
  - `manageste.md` — el equipo de agentes, sus zonas de código y el historial de fases.
  - `MEMORY.md` — memoria de trabajo: estado actual y decisiones recientes.
  - `vulnerabilities.md` — auditoría de seguridad completa (27 pruebas + hallazgos de las fases).

## Cómo se hizo este proyecto

El desarrollo lo realizó un **equipo de agentes de programación (IA)** trabajando dentro de
OpenCode, bajo la dirección de **Feirt**, que decide el diseño, las funcionalidades y aprueba cada
entrega:

| Agente | Rol |
|---|---|
| **Zeirt** | Padre del equipo: reparte los encargos, revisa cada diff, verifica y entrega |
| **Agente 1 — Manipulador de Datos** | Zona de datos: `localStorage`, sesiones, lista y filtros |
| **Agente 2 — Criptógrafo del Acceso** | Zona de acceso: registro, login, pantalla de entrada |
| **Agente 3 — Inspector** | Solo lee y verifica: seguridad, XSS, accesibilidad, móvil |
| **Agente 4 — Analista de Datos** | Zona de gráficos: SVG a mano, pastel, barras, semanas |

El método: cada fase se delega a los agentes con zona de código reservada (nadie toca la zona de
otro), el padre revisa el diff, y todo se comprueba con **baterías de pruebas automatizadas** en
Chrome headless (sin frameworks de test) más la auditoría de `vulnerabilities.md`. Solo Zeirt hace
`git commit`. El historial completo de fases está en `manageste.md`.

## Datos y privacidad

La app **no tiene backend**: todo vive en el `localStorage` de ese navegador. No hay red, no hay
telemetría y no se sube nada a ningún sitio. Si se borra el almacenamiento del navegador, se borran
los datos; y las cuentas son locales (si se olvida la contraseña, se crea otra cuenta nueva — las
sesiones no viven dentro de la cuenta).

Por lo mismo, **no es una app protegida**: el login identifica al usuario, no es una barrera real
sin servidor. Todos los detalles y limitaciones están documentados con honestidad en
`vulnerabilities.md` y `AGENTS.md`.

## Reglas del proyecto

- 🚫 Nunca: añadir dependencias, frameworks ni pasos de build.
- 🌐 Textos de la interfaz siempre en español.
- 🛡️ El contenido del usuario nunca se pinta con `innerHTML`.
- 📅 Fechas y racha siempre en zona horaria local (nada de `toISOString()`).

## Repositorio

- GitHub: **<https://github.com/Feirt00/Agentes>**
- Rama principal: `master` (la rama `main` es de otro proyecto y se deja intacta).
