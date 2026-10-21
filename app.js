// Elementos del DOM
const form = document.getElementById('study-form');
const dateInput = document.getElementById('date');
const topicInput = document.getElementById('topic');
const minutesInput = document.getElementById('minutes');
const formMessage = document.getElementById('form-message');
const streakDisplay = document.getElementById('streak');
const bestStreakDisplay = document.getElementById('best-streak');
const weekMinutesDisplay = document.getElementById('week-minutes');
const sessionList = document.getElementById('session-list');
const agentList = document.getElementById('agent-list');
const themeToggle = document.getElementById('theme-toggle');
const timerDisplay = document.getElementById('timer-display');
const timerTotal = document.getElementById('timer-total');
const timerMinutes = document.getElementById('timer-minutes');
const timerTopic = document.getElementById('timer-topic');
const timerStart = document.getElementById('timer-start');
const timerPause = document.getElementById('timer-pause');
const timerReset = document.getElementById('timer-reset');
const timerMessage = document.getElementById('timer-message');
const timerDone = document.getElementById('timer-done');
const timerSave = document.getElementById('timer-save');
const authStatus = document.getElementById('auth-status');
const authModal = document.getElementById('auth-modal');
const authClose = document.getElementById('auth-close');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');
const authMessage = document.getElementById('auth-message');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleLink = document.getElementById('auth-toggle-link');

// Claves para localStorage
// STORAGE_KEY es la clave global de las sesiones: se usa cuando no hay sesión
// iniciada. Con sesión iniciada cada usuario tiene la suya (ver getSessionsKey()).
const STORAGE_KEY = 'diario-estudio-sesiones';
const THEME_KEY = 'diario-estudio-tema';
const USERS_KEY = 'diario-estudio-usuarios';
const SESSION_KEY = 'diario-estudio-sesion';
const ATTEMPTS_KEY = 'diario-estudio-login-intentos';

// Ajustes del acceso
const MAX_ATTEMPTS = 5;
const BLOCK_SECONDS = 30;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MIN_USERNAME = 3;
const MAX_USERNAME = 20;

// Parámetros del hash de contraseñas: PBKDF2 con SHA-256 y salt aleatorio por usuario.
// 210.000 iteraciones hacen lento un ataque con diccionario aunque alguien se
// lleve el almacenamiento del navegador.
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_BITS = 256;
const SALT_BYTES = 16;

// Contraseñas muy comunes: se rechazan al crear una cuenta.
const COMMON_PASSWORDS = [
    '123456',
    '12345678',
    '123456789',
    '1234567890',
    'password',
    'contraseña',
    'qwerty',
    'qwerty123',
    'abc123',
    '111111',
    '000000',
    '123123',
    'admin123',
    'iloveyou',
    'letmein'
];

// ============================================================
// Almacenamiento (localStorage) a salvo de fallos
// ============================================================
//
// localStorage puede lanzar errores sin avisar: el navegador puede bloquearlo
// (cookies desactivadas, modo privado estricto) o no tener espacio. Si eso pasa
// en mitad de la app, la pantalla se queda en blanco. Estos tres helpers
// capturan el error y devuelven null/false, para que la app siga viva.

// Último error que ha dado el almacenamiento. Sirve para saber si lo que falló
// fue la cuota (no hay espacio) o cualquier otra cosa.
let storageLastError = null;

function storageGet(key)
{
    try
    {
        return localStorage.getItem(key);
    }
    catch (error)
    {
        storageLastError = error;
        console.warn('No se pudo leer "' + key + '" del almacenamiento:', error);
        return null;
    }
}

function storageSet(key, value)
{
    try
    {
        localStorage.setItem(key, value);
        return true;
    }
    catch (error)
    {
        storageLastError = error;
        console.warn('No se pudo guardar "' + key + '" en el almacenamiento:', error);
        return false;
    }
}

function storageRemove(key)
{
    try
    {
        localStorage.removeItem(key);
        return true;
    }
    catch (error)
    {
        storageLastError = error;
        console.warn('No se pudo borrar "' + key + '" del almacenamiento:', error);
        return false;
    }
}

// Mensaje del registro. Es el MISMO si la cuenta se crea o si el nombre ya
// estaba en uso: así el registro no sirve para averiguar qué usuarios existen.
const REGISTER_MESSAGE = 'Si ese nombre estaba libre, la cuenta ya está creada. Inicia sesión para entrar.';

// Obtener fecha de hoy en formato local (YYYY-MM-DD)
function getTodayLocal()
{
    return toLocalDateString(new Date());
}

// Convertir fecha local a objeto Date (medianoche local)
function parseLocalDate(dateStr)
{
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Formatear fecha para mostrar.
// Si la fecha no es válida se avisa con un texto legible, nunca con "Invalid Date".
function formatDate(dateStr)
{
    if (!isValidDateString(dateStr))
    {
        return 'Fecha inválida';
    }

    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

// Pasar un objeto Date a texto AAAA-MM-DD (fecha local)
function toLocalDateString(date)
{
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Comprobar que una fecha es un texto AAAA-MM-DD que existe en el calendario
function isValidDateString(dateStr)
{
    if (typeof dateStr !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    const date = parseLocalDate(dateStr);
    if (isNaN(date.getTime())) return false;

    // "2026-02-30" se convertiría en 2 de marzo: al volver no coincide con el texto
    return toLocalDateString(date) === dateStr;
}

// Normalizar una sesión guardada.
// Devuelve { date, topic, minutes } si la sesión tiene la forma esperada,
// o null si está corrupta y hay que descartarla.
// Los minutos pueden venir como texto (de cuando se guardaban así):
// se aceptan si son un número válido y se dejan como número.
function normalizeSession(session)
{
    if (!session || typeof session !== 'object' || Array.isArray(session)) return null;
    if (!isValidDateString(session.date)) return null;
    if (typeof session.topic !== 'string') return null;
    if (typeof session.minutes !== 'number' && typeof session.minutes !== 'string') return null;
    if (typeof session.minutes === 'string' && session.minutes.trim() === '') return null;

    const minutes = Number(session.minutes);
    if (!isFinite(minutes)) return null;

    // Una sesión de 0 minutos (o negativos) no es estudiar: se descarta, igual
    // que hace el formulario, que no deja guardar minutos <= 0. Si se dejaran
    // pasar, la racha contaría días que no se han estudiado (prueba H5).
    if (minutes <= 0) return null;

    return { date: session.date, topic: session.topic, minutes: minutes };
}

// Clave de localStorage donde se guardan las sesiones del usuario actual.
// Sin sesión iniciada se usa la clave global ("diario-estudio-sesiones").
// Con sesión iniciada cada usuario tiene la suya: se le añade su "usernameKey"
// ("diario-estudio-sesiones-ana"). Así dos usuarios del mismo navegador no
// comparten sesiones, ni racha, ni totales, ni gráficos.
function getSessionsKey()
{
    const user = getCurrentUser();

    if (!user || typeof user !== 'object' || typeof user.username !== 'string')
    {
        return STORAGE_KEY;
    }

    const key = usernameKey(user.username);

    if (key === '')
    {
        return STORAGE_KEY;
    }

    return STORAGE_KEY + '-' + key;
}

// Convertir lo que hay guardado en una lista de sesiones válidas.
// Si el JSON está corrupto o no es una lista, se devuelve una lista vacía:
// la app nunca se cae por datos guardados.
function parseSessions(rawData)
{
    let parsed;

    try
    {
        parsed = rawData ? JSON.parse(rawData) : [];
    }
    catch (error)
    {
        console.warn('No se pudieron leer las sesiones guardadas:', error);
        return [];
    }

    if (!Array.isArray(parsed))
    {
        console.warn('Las sesiones guardadas no son una lista: se ignoran.');
        return [];
    }

    const sessions = [];
    for (const session of parsed)
    {
        const valid = normalizeSession(session);
        if (valid)
        {
            sessions.push(valid);
        }
        else
        {
            console.warn('Se descartó una sesión con datos inválidos:', session);
        }
    }

    return sessions;
}

// Migrar las sesiones de la clave global a la clave del usuario.
// Se hace UNA sola vez: cuando un usuario entra por primera vez y su clave
// propia todavía no existe, lo que había en la clave global pasa a su clave
// y la global se vacía (así ninguna sesión se queda duplicada en las dos).
function migrateSessionsToUser(userKey)
{
    // Sin sesión iniciada no hay nada que migrar: todo sigue en la clave global.
    if (userKey === STORAGE_KEY) return false;

    // Si el usuario ya tiene su clave (aunque esté vacía), sus sesiones ya
    // están separadas: no se vuelve a tocar la global.
    if (storageGet(userKey) !== null) return false;

    const globalSessions = parseSessions(storageGet(STORAGE_KEY));

    // La clave global no existe o no tiene sesiones: no hay nada que mover.
    if (globalSessions.length === 0) return false;

    if (!storageSet(userKey, JSON.stringify(globalSessions))) return false;

    // La global se vacía: cada sesión está en una sola clave.
    storageSet(STORAGE_KEY, '[]');

    return true;
}

// Cargar sesiones desde localStorage.
// Nunca falla: si el JSON está corrupto o una sesión no tiene la forma
// esperada, esa sesión se descarta y la app sigue funcionando.
function loadSessions()
{
    const key = getSessionsKey();

    // Si el usuario entra por primera vez, lo que había en la clave global
    // pasa a su clave.
    migrateSessionsToUser(key);

    return parseSessions(storageGet(key));
}

// Guardar sesiones en localStorage.
// Devuelve { ok, message } y nunca lanza errores: si el navegador rechaza
// la escritura (cuota llena, almacenamiento bloqueado) se avisa con un mensaje.
function saveSessions(sessions)
{
    const key = getSessionsKey();

    if (!storageSet(key, JSON.stringify(sessions)))
    {
        const isQuotaExceeded = storageLastError && storageLastError.name === 'QuotaExceededError';
        const message = isQuotaExceeded
            ? 'No se pudo guardar la sesión: el almacenamiento del navegador está lleno. Borra sesiones antiguas o libera espacio.'
            : 'No se pudo guardar la sesión en este navegador: el almacenamiento está bloqueado o lleno.';

        return { ok: false, message: message };
    }

    return { ok: true, message: '' };
}

// Calcular racha actual
function calculateStreak(sessions)
{
    if (sessions.length === 0) return 0;

    const studyDates = new Set(sessions.map(s => s.date));

    let streak = 0;
    const today = parseLocalDate(getTodayLocal());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let currentDate = studyDates.has(getTodayLocal()) ? today : yesterday;

    while (true)
    {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        if (studyDates.has(dateStr))
        {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        else
        {
            break;
        }
    }

    return streak;
}

// Calcular mejor racha (máxima histórica)
function calculateBestStreak(sessions)
{
    if (sessions.length === 0) return 0;

    const todayStr = getTodayLocal();
    const studyDatesSet = new Set();

    for (let i = 0; i < sessions.length; i++)
    {
        const dateStr = sessions[i].date;
        if (dateStr > todayStr)
        {
            continue;
        }
        studyDatesSet.add(dateStr);
    }

    const studyDatesList = [];
    for (let dateStr of studyDatesSet)
    {
        studyDatesList.push(dateStr);
    }

    studyDatesList.sort((a, b) => a.localeCompare(b));

    if (studyDatesList.length === 0) return 0;

    let bestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < studyDatesList.length; i++)
    {
        const prevDate = parseLocalDate(studyDatesList[i - 1]);
        const currDate = parseLocalDate(studyDatesList[i]);

        const prevNext = new Date(prevDate);
        prevNext.setDate(prevNext.getDate() + 1);

        if (currDate.getFullYear() === prevNext.getFullYear() &&
            currDate.getMonth() === prevNext.getMonth() &&
            currDate.getDate() === prevNext.getDate())
            {
            currentStreak++;
        }
        else
        {
            if (currentStreak > bestStreak)
            {
                bestStreak = currentStreak;
            }
            currentStreak = 1;
        }
    }

    if (currentStreak > bestStreak)
    {
        bestStreak = currentStreak;
    }

    return bestStreak;
}

// Obtener el lunes de esta semana en formato local (AAAA-MM-DD).
// getDay() da 0 para el domingo, así que del domingo al lunes hay 6 días.
function getWeekStart()
{
    const date = parseLocalDate(getTodayLocal());
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - daysSinceMonday);
    return toLocalDateString(date);
}

// Calcular los minutos estudiados esta semana (del lunes a hoy).
// Las fechas ya vienen en AAAA-MM-DD, así que se comparan como texto.
// Los minutos negativos o no finitos no cuentan: el total nunca sale negativo.
function calculateWeekMinutes(sessions)
{
    if (!Array.isArray(sessions)) return 0;

    const weekStart = getWeekStart();
    const today = getTodayLocal();

    let total = 0;
    for (const session of sessions)
    {
        if (!session || typeof session.date !== 'string') continue;
        if (session.date < weekStart || session.date > today) continue;

        const minutes = Number(session.minutes);
        if (!isFinite(minutes) || minutes < 0) continue;

        total += minutes;
    }
    return total;
}

// Actualizar rachas en pantalla
function updateStreak()
{
    const sessions = loadSessions();
    streakDisplay.textContent = calculateStreak(sessions);
}

function updateBestStreak()
{
    const sessions = loadSessions();
    bestStreakDisplay.textContent = calculateBestStreak(sessions);
}

function updateWeekTotal()
{
    const sessions = loadSessions();
    weekMinutesDisplay.textContent = calculateWeekMinutes(sessions);
}

// Mostrar los minutos de una sesión (si no son válidos, se muestran como 0)
function formatMinutes(minutes)
{
    const value = Number(minutes);
    if (!isFinite(value) || value <= 0) return '0 min';
    return value + ' min';
}

// Crear el <li> de una sesión. Los datos van con textContent para que
// un tema con "<" o comillas no rompa el HTML.
function createSessionItem(session)
{
    const item = document.createElement('li');

    const date = document.createElement('span');
    date.className = 'session-date';
    date.textContent = formatDate(session.date);

    const topic = document.createElement('span');
    topic.className = 'session-topic';
    topic.textContent = typeof session.topic === 'string' ? session.topic : '';

    const minutes = document.createElement('span');
    minutes.className = 'session-minutes';
    minutes.textContent = formatMinutes(session.minutes);

    item.appendChild(date);
    item.appendChild(topic);
    item.appendChild(minutes);

    return item;
}

// Actualizar lista de sesiones
function updateSessionList()
{
    const sessions = loadSessions();

    sessions.sort((a, b) => b.date.localeCompare(a.date));

    // Se vacía la lista y se vuelve a pintar
    sessionList.textContent = '';

    if (sessions.length === 0)
    {
        const empty = document.createElement('li');
        empty.className = 'empty-message';
        empty.textContent = 'Aún no hay sesiones registradas';
        sessionList.appendChild(empty);
        return;
    }

    for (const session of sessions)
    {
        sessionList.appendChild(createSessionItem(session));
    }
}

// Repintar todo lo que depende de las sesiones guardadas.
// La llama Zeirt al iniciar y al cerrar sesión: al cambiar de usuario, la
// racha, la mejor racha, el total de la semana, la lista y los gráficos
// tienen que cambiar también.
function refreshCurrentUserViews()
{
    updateStreak();
    updateBestStreak();
    updateWeekTotal();
    updateSessionList();

    // Los gráficos se redibujan si la función existe (la aporta el agente de gráficos)
    if (typeof renderCharts === 'function')
    {
        renderCharts();
    }
}

// Los agentes del proyecto: quién es y qué está haciendo.
// El reparto detallado y el protocolo de delegación están en `manageste.md`.
const AGENTS = [
    { name: 'Zeirt', role: 'Agente principal', task: 'Verifica, integra y documenta', status: 'terminado' },
    { name: 'Guardian de los Datos', role: 'Agente 1', task: 'Sesiones por usuario y migración', status: 'terminado' },
    { name: 'Criptógrafo del Acceso', role: 'Agente 2', task: 'Hash, contraseñas y sesión', status: 'terminado' },
    { name: 'Inspector', role: 'Agente 3', task: 'Verificación y pruebas nuevas', status: 'terminado' },
    { name: 'Analista de Datos', role: 'Agente 4', task: 'Ventana de días y detalle por día', status: 'terminado' }
];

// Pintar el apartado de agentes
function renderAgents()
{
    if (!agentList) return;

    agentList.textContent = '';

    for (const agent of AGENTS)
    {
        const item = document.createElement('li');
        item.className = 'agent-item';

        const name = document.createElement('span');
        name.className = 'agent-name';
        name.textContent = agent.name;

        const role = document.createElement('span');
        role.className = 'agent-role';
        role.textContent = agent.role;

        const task = document.createElement('span');
        task.className = 'agent-task';
        task.textContent = agent.task;

        const status = document.createElement('span');
        status.className = 'agent-status ' + agent.status;
        status.textContent = agent.status;

        item.appendChild(name);
        item.appendChild(role);
        item.appendChild(task);
        item.appendChild(status);

        agentList.appendChild(item);
    }
}

// Mostrar un mensaje junto al formulario (error o confirmación)
// Se usa en vez de alert() para que el aviso se vea en la propia página.
function showFormMessage(text, type)
{
    if (!text)
    {
        formMessage.hidden = true;
        formMessage.textContent = '';
        return;
    }

    formMessage.hidden = false;
    formMessage.textContent = text;
    formMessage.className = 'form-message ' + type;
}

// Manejar envío del formulario
form.addEventListener('submit', (e) =>
{
    e.preventDefault();

    const date = dateInput.value;
    const topic = topicInput.value.trim();

    // Los minutos admiten un decimal: se redondea a una sola cifra para no
    // guardar valores larguísimos (12.34 -> 12.3).
    const minutes = Math.round(Number(minutesInput.value) * 10) / 10;

    if (!isValidDateString(date) || !topic || !isFinite(minutes) || minutes <= 0)
    {
        showFormMessage('Por favor, completa todos los campos correctamente.', 'error');
        return;
    }

    const sessions = loadSessions();
    sessions.push({ date, topic, minutes });

    const result = saveSessions(sessions);
    if (!result.ok)
    {
        // La sesión no se ha guardado: se avisa y no se borra lo que se ha escrito
        showFormMessage(result.message, 'error');
        return;
    }

    showFormMessage('Sesión registrada.', 'success');

    topicInput.value = '';
    minutesInput.value = '';
    dateInput.value = getTodayLocal();

    updateStreak();
    updateBestStreak();
    updateWeekTotal();
    updateSessionList();
});

// Tema claro/oscuro
function toggleTheme()
{
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    storageSet(THEME_KEY, isDark ? 'dark' : 'light');
}

// Cargar tema guardado
function loadTheme()
{
    const savedTheme = storageGet(THEME_KEY);
    if (savedTheme === 'dark')
    {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    }
}

themeToggle.addEventListener('click', toggleTheme);

// ============================================================
// Acceso de usuarios (solo local, sin backend)
// ============================================================

// Convertir el nombre de usuario a una clave sin mayúsculas ni espacios
function usernameKey(username)
{
    return username.trim().toLowerCase();
}

// Pasar bytes a texto hexadecimal (para guardar el salt y el hash)
function bytesToHex(bytes)
{
    let hex = '';
    for (let i = 0; i < bytes.length; i++)
    {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

// Pasar texto hexadecimal a bytes (para usar el salt en PBKDF2)
function hexToBytes(hex)
{
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++)
    {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

// ¿Está disponible la Web Crypto API? Sin ella no se puede hashear de forma segura.
function isCryptoAvailable()
{
    return typeof crypto !== 'undefined'
        && typeof crypto.getRandomValues === 'function'
        && typeof crypto.subtle !== 'undefined'
        && typeof crypto.subtle.deriveBits === 'function';
}

// Generar un salt aleatorio para un usuario (en hexadecimal)
function generateSalt()
{
    const bytes = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
}

// Hash de la contraseña con PBKDF2 (SHA-256) y el salt del usuario.
// Es asíncrona porque usa crypto.subtle. Devuelve el hash en hexadecimal,
// o null si la Web Crypto API no está disponible o algo falla.
async function hashPassword(password, salt)
{
    if (!isCryptoAvailable())
    {
        return null;
    }

    try
    {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: hexToBytes(salt),
                iterations: PBKDF2_ITERATIONS,
                hash: PBKDF2_HASH
            },
            keyMaterial,
            PBKDF2_KEY_BITS
        );

        return bytesToHex(new Uint8Array(bits));
    }
    catch (error)
    {
        return null;
    }
}

// Comparar dos hashes sin devolver en cuanto un carácter no coincide
function hashesMatch(hashA, hashB)
{
    if (typeof hashA !== 'string' || typeof hashB !== 'string') return false;
    if (hashA.length !== hashB.length) return false;

    let diff = 0;
    for (let i = 0; i < hashA.length; i++)
    {
        diff |= hashA.charCodeAt(i) ^ hashB.charCodeAt(i);
    }
    return diff === 0;
}

// ¿La contraseña está en la lista de contraseñas muy comunes?
function isCommonPassword(password)
{
    return COMMON_PASSWORDS.indexOf(password.trim().toLowerCase()) !== -1;
}

// Leer los usuarios guardados. Si el JSON está corrupto se devuelve una lista
// vacía en vez de romper la app.
function loadUsers()
{
    const data = storageGet(USERS_KEY);
    if (!data) return [];

    try
    {
        const users = JSON.parse(data);
        if (!Array.isArray(users)) return [];

        // Solo se aceptan registros con los campos mínimos
        return users.filter(user =>
            user
            && typeof user.username === 'string'
            && typeof user.usernameKey === 'string'
            && typeof user.passwordHash === 'string'
        );
    }
    catch (error)
    {
        return [];
    }
}

function saveUsers(users)
{
    return storageSet(USERS_KEY, JSON.stringify(users));
}

// Quitar las cuentas antiguas (las que no tienen "salt").
//
// MOTIVO: antes de PBKDF2 la contraseña se guardaba con un hash FNV-1a de solo
// 32 bits. Con tan pocos bits hay colisiones (dos contraseñas distintas con el
// mismo hash) y se pueden encontrar en segundos, así que esas cuentas NO se
// pueden validar sin abrir ese agujero (prueba C4).
//
// Qué se pierde: el acceso a esas cuentas (no sus datos). Las sesiones de
// estudio no están en la cuenta, viven en "diario-estudio-sesiones", así que no
// se pierde nada de lo que el usuario haya estudiado. El nombre queda libre para
// volver a crear la cuenta.
function purgeLegacyUsers()
{
    const users = loadUsers();
    const current = users.filter(user => typeof user.salt === 'string' && user.salt !== '');
    const removed = users.length - current.length;

    if (removed > 0)
    {
        saveUsers(current);
        console.warn('Se han desactivado ' + removed + ' cuenta(s) antigua(s) por seguridad.');
    }

    return removed;
}

// Leer la sesión guardada. Devuelve null si no hay o si el JSON está roto.
function getCurrentUser()
{
    const data = storageGet(SESSION_KEY);
    if (!data) return null;

    try
    {
        return JSON.parse(data);
    }
    catch (error)
    {
        return null;
    }
}

// Comprobar que la sesión guardada es válida: que tenga la forma
// { username, loggedInAt } y que ese usuario exista en la lista de usuarios.
// Si no, se borra la sesión y se sigue sin iniciar sesión.
//
// LIMITACIÓN HONESTA: sin servidor no hay forma real de FIRMAR la sesión, porque
// el secreto tendría que estar en el mismo navegador que el atacante. Quien
// pueda escribir en localStorage puede hacerse pasar por un usuario que SÍ
// existe. Lo que aquí se evita es mostrar usuarios que no existen (prueba B3).
function validateSession()
{
    const session = getCurrentUser();

    const validShape = session
        && typeof session === 'object'
        && typeof session.username === 'string'
        && session.username.length > 0
        && typeof session.loggedInAt === 'string'
        && session.loggedInAt.length > 0;

    if (!validShape)
    {
        clearSession();
        return null;
    }

    const users = loadUsers();
    const exists = users.some(user => user.usernameKey === usernameKey(session.username));

    if (!exists)
    {
        clearSession();
        return null;
    }

    return session;
}

function setSession(username)
{
    return storageSet(SESSION_KEY, JSON.stringify({
        username: username,
        loggedInAt: getTodayLocal()
    }));
}

function clearSession()
{
    storageRemove(SESSION_KEY);
}

// Intentos fallidos de acceso
//
// LIMITACIÓN HONESTA (prueba C1): el bloqueo vive en localStorage, que también
// controla quien quiere saltarse el bloqueo: borrando la clave
// "diario-estudio-login-intentos" el bloqueo se anula. Sin servidor no hay forma
// de arreglarlo de verdad, así que esto frena la impaciencia, no la fuerza bruta.
function loadAttempts()
{
    const data = storageGet(ATTEMPTS_KEY);
    if (!data) return { count: 0, blockedUntil: 0 };

    try
    {
        const attempts = JSON.parse(data);
        if (!attempts || typeof attempts !== 'object') return { count: 0, blockedUntil: 0 };

        return {
            count: Number(attempts.count) || 0,
            blockedUntil: Number(attempts.blockedUntil) || 0
        };
    }
    catch (error)
    {
        return { count: 0, blockedUntil: 0 };
    }
}

function saveAttempts(attempts)
{
    storageSet(ATTEMPTS_KEY, JSON.stringify(attempts));
}

// Segundos que quedan de bloqueo (0 si no está bloqueado)
function secondsLeftBlocked()
{
    const attempts = loadAttempts();
    const left = Math.ceil((attempts.blockedUntil - Date.now()) / 1000);
    return left > 0 ? left : 0;
}

function registerFailedAttempt()
{
    const attempts = loadAttempts();
    attempts.count = attempts.count + 1;
    if (attempts.count >= MAX_ATTEMPTS)
    {
        attempts.blockedUntil = Date.now() + BLOCK_SECONDS * 1000;
    }
    saveAttempts(attempts);
}

function clearAttempts()
{
    saveAttempts({ count: 0, blockedUntil: 0 });
}

// Mostrar el usuario conectado o el enlace de acceso.
// Todo se pinta con createElement + textContent: nunca con innerHTML.
function renderAuthStatus()
{
    const user = validateSession();

    authStatus.textContent = '';

    if (user)
    {
        const name = document.createElement('span');
        name.className = 'auth-username';
        name.textContent = user.username;

        // Son <button> y no <span> para que se puedan enfocar con el teclado
        // y el foco vuelva aquí al cerrar el modal.
        const exit = document.createElement('button');
        exit.type = 'button';
        exit.className = 'auth-link';
        exit.id = 'logout-link';
        exit.textContent = 'Cerrar sesión';

        authStatus.appendChild(name);
        authStatus.appendChild(exit);
    }
    else
    {
        const login = document.createElement('button');
        login.type = 'button';
        login.className = 'auth-link';
        login.id = 'login-link';
        login.textContent = 'Iniciar sesión';

        authStatus.appendChild(login);
    }
}

// ---------- Modal ----------

// 'login' o 'register'
let authMode = 'login';

function setAuthMessage(text, type)
{
    if (!text)
    {
        authMessage.hidden = true;
        authMessage.textContent = '';
        return;
    }
    authMessage.hidden = false;
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + type;
}

// Cambiar el modo del modal ("login" o "register").
// keepValues: si es true no se borra lo que el usuario escribió. Se usa al
// terminar un registro, para que solo tenga que pulsar "Entrar".
function setAuthMode(mode, keepValues)
{
    authMode = mode;
    setAuthMessage('');

    if (!keepValues)
    {
        clearAuthForm();
    }

    updateRateLimitUI();

    if (mode === 'login')
    {
        authTitle.textContent = 'Iniciar sesión';
        authSubmit.textContent = 'Entrar';
        authPassword.setAttribute('placeholder', 'Tu contraseña');
        authPassword.setAttribute('autocomplete', 'current-password');
        authToggleText.textContent = '¿No tienes cuenta?';
        authToggleLink.textContent = 'Crear usuario';
    }
    else
    {
        authTitle.textContent = 'Crear usuario';
        authSubmit.textContent = 'Crear cuenta';
        authPassword.setAttribute('placeholder', 'Mínimo ' + MIN_PASSWORD + ' caracteres');
        authPassword.setAttribute('autocomplete', 'new-password');
        authToggleText.textContent = '¿Ya tienes cuenta?';
        authToggleLink.textContent = 'Iniciar sesión';
    }
}

function clearAuthForm()
{
    authUsername.value = '';
    authPassword.value = '';
}

// Activar o desactivar el formulario según el bloqueo por intentos
function updateRateLimitUI()
{
    const left = secondsLeftBlocked();
    if (left > 0)
    {
        authSubmit.disabled = true;
        authUsername.disabled = true;
        authPassword.disabled = true;
        setAuthMessage('Demasiados intentos fallidos. Inténtalo de nuevo en ' + left + ' s.', 'error');
    }
    else
    {
        authSubmit.disabled = false;
        authUsername.disabled = false;
        authPassword.disabled = false;
    }
}

// Elemento que tenía el foco antes de abrir el modal (para devolvérselo al cerrar)
let lastFocusedElement = null;

// Temporizador que cierra el modal tras un acceso correcto
let authCloseTimer = null;

function openAuthModal(mode)
{
    // Si se reabre el modal antes de que se cierre solo, se cancela el cierre automático
    if (authCloseTimer !== null)
    {
        clearTimeout(authCloseTimer);
        authCloseTimer = null;
    }

    lastFocusedElement = document.activeElement;
    authModal.hidden = false;
    setAuthMode(mode);
    authUsername.focus();
}

function closeAuthModal()
{
    if (authCloseTimer !== null)
    {
        clearTimeout(authCloseTimer);
        authCloseTimer = null;
    }

    authModal.hidden = true;
    setAuthMessage('');

    // El foco vuelve al elemento que abrió el modal
    if (lastFocusedElement && document.contains(lastFocusedElement))
    {
        lastFocusedElement.focus();
    }
}

// ---------- Acciones ----------

// Devuelve { ok, message }. Nunca lanza errores: siempre un mensaje para el usuario.
async function registerUser(username, password)
{
    try
    {
        return await createAccount(username, password);
    }
    catch (error)
    {
        console.warn('No se pudo completar el registro:', error);
        return { ok: false, message: 'No se ha podido guardar la cuenta en este navegador. Borra datos del navegador o libera espacio.' };
    }
}

// Crear la cuenta. Va separada de registerUser() para que registerUser() sea
// siempre la que envuelve los errores: nunca se lanzan hacia la interfaz.
async function createAccount(username, password)
{
    if (!username || !password)
    {
        return { ok: false, message: 'Completa ambos campos.' };
    }
    if (username.length < MIN_USERNAME || username.length > MAX_USERNAME)
    {
        return { ok: false, message: 'El usuario debe tener entre ' + MIN_USERNAME + ' y ' + MAX_USERNAME + ' caracteres.' };
    }
    if (/\s/.test(username))
    {
        return { ok: false, message: 'El usuario no puede tener espacios.' };
    }
    if (password.length < MIN_PASSWORD)
    {
        return { ok: false, message: 'La contraseña necesita al menos ' + MIN_PASSWORD + ' caracteres.' };
    }
    if (password.length > MAX_PASSWORD)
    {
        return { ok: false, message: 'La contraseña no puede pasar de ' + MAX_PASSWORD + ' caracteres.' };
    }
    if (isCommonPassword(password))
    {
        return { ok: false, message: 'Esa contraseña es demasiado común. Elige otra más difícil de adivinar.' };
    }

    // Sin Web Crypto API no se puede proteger la contraseña: no se cae a un hash débil.
    if (!isCryptoAvailable())
    {
        return { ok: false, message: 'Este navegador no permite usar un hash seguro (falta la Web Crypto API). Actualiza el navegador: no se ha creado la cuenta.' };
    }

    const users = loadUsers();
    const key = usernameKey(username);

    // Si el nombre ya está en uso se responde con el MISMO mensaje y el mismo
    // comportamiento que si la cuenta se acabara de crear. Si no, el registro
    // serviría para averiguar qué nombres de usuario existen (prueba C3).
    if (users.some(user => user.usernameKey === key))
    {
        return { ok: true, message: REGISTER_MESSAGE };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    if (!passwordHash)
    {
        return { ok: false, message: 'No se ha podido proteger la contraseña en este navegador. No se ha creado la cuenta.' };
    }

    users.push({
        username: username,
        usernameKey: key,
        passwordHash: passwordHash,
        salt: salt,
        createdAt: getTodayLocal()
    });

    if (!saveUsers(users))
    {
        return { ok: false, message: 'No se ha podido guardar la cuenta: el almacenamiento del navegador está lleno. Borra datos del navegador o libera espacio.' };
    }

    // No se inicia sesión aquí a propósito: el registro siempre acaba igual
    // (pide iniciar sesión), así que no revela si el nombre estaba libre.
    return { ok: true, message: REGISTER_MESSAGE };
}

// Devuelve { ok, message }. Nunca lanza errores: siempre un mensaje para el usuario.
async function loginUser(username, password)
{
    try
    {
        return await signIn(username, password);
    }
    catch (error)
    {
        console.warn('No se pudo completar el inicio de sesión:', error);
        return { ok: false, message: 'No se ha podido comprobar la contraseña en este navegador. Inténtalo de nuevo.' };
    }
}

// Comprobar la contraseña e iniciar sesión. Va separada de loginUser() para que
// loginUser() sea siempre la que envuelve los errores.
async function signIn(username, password)
{
    // Bloqueo por intentos: no se comprueba nada mientras dure
    const left = secondsLeftBlocked();
    if (left > 0)
    {
        return { ok: false, message: 'Demasiados intentos fallidos. Inténtalo de nuevo en ' + left + ' s.', blocked: true };
    }

    if (!username || !password)
    {
        return { ok: false, message: 'Completa ambos campos.' };
    }

    // Sin Web Crypto API no se puede comprobar la contraseña: no se cae a un hash débil.
    if (!isCryptoAvailable())
    {
        return { ok: false, message: 'Este navegador no permite usar un hash seguro (falta la Web Crypto API). Actualiza el navegador: no se ha iniciado sesión.' };
    }

    const users = loadUsers();
    const key = usernameKey(username);
    const user = users.find(item => item.usernameKey === key);

    // Mensaje genérico: no revela si el usuario existe
    const fail = { ok: false, message: 'Usuario o contraseña incorrectos.' };

    if (!user)
    {
        // Se calcula un hash "de mentira" para que este fallo tarde lo mismo que
        // un login real. Si no, el tiempo de respuesta revelaría qué usuarios
        // existen (canal de tiempo, prueba H2).
        await hashPassword(password, generateSalt());
        registerFailedAttempt();
        return fail;
    }

    const salt = typeof user.salt === 'string' ? user.salt : '';

    // Las cuentas creadas antes de PBKDF2 (sin "salt") están desactivadas: su
    // contraseña se guardaba con un hash de 32 bits (FNV-1a) que se rompe por
    // colisión (prueba C4). No se pueden validar sin abrir ese agujero, así que
    // se ignoran. Sus sesiones de estudio no se pierden: el nombre queda libre
    // para crear la cuenta otra vez.
    if (salt === '')
    {
        registerFailedAttempt();
        return fail;
    }

    const hash = await hashPassword(password, salt);

    if (!hash || !hashesMatch(user.passwordHash, hash))
    {
        registerFailedAttempt();
        return fail;
    }

    // Si la sesión no se puede guardar, avisamos: si no, el login parecería
    // bueno pero el usuario seguiría sin sesión al recargar.
    if (!setSession(user.username))
    {
        return { ok: false, message: 'No se ha podido guardar la sesión en este navegador. Borra datos del navegador o libera espacio.' };
    }

    clearAttempts();
    return { ok: true, message: 'Sesión iniciada.' };
}

function logoutUser()
{
    clearSession();
    renderAuthStatus();

    // Al salir se vuelve a la lista global (la que no tiene cuenta).
    refreshCurrentUserViews();
}

// ---------- Eventos ----------

authStatus.addEventListener('click', (e) =>
{
    if (e.target.id === 'login-link')
    {
        openAuthModal('login');
    }
    else if (e.target.id === 'logout-link')
    {
        logoutUser();
    }
});

authClose.addEventListener('click', closeAuthModal);

authModal.addEventListener('click', (e) =>
{
    if (e.target === authModal)
    {
        closeAuthModal();
    }
});

authToggleLink.addEventListener('click', (e) =>
{
    e.preventDefault();
    setAuthMode(authMode === 'login' ? 'register' : 'login');
});

authForm.addEventListener('submit', async (e) =>
{
    e.preventDefault();

    // Se bloquea el botón mientras se calcula el hash para no mandar dos veces
    authSubmit.disabled = true;

    const result = authMode === 'register'
        ? await registerUser(authUsername.value.trim(), authPassword.value)
        : await loginUser(authUsername.value.trim(), authPassword.value);

    // El registro SIEMPRE termina pidiendo iniciar sesión, diga lo que diga el
    // resultado. Así no se puede averiguar si el nombre ya estaba en uso
    // (prueba C3): el comportamiento es idéntico en los dos casos.
    if (authMode === 'register')
    {
        if (result.ok)
        {
            setAuthMode('login', true);
            setAuthMessage(result.message, 'success');
        }
        else
        {
            authSubmit.disabled = false;
            setAuthMessage(result.message, 'error');
        }
        return;
    }

    if (result.ok)
    {
        setAuthMessage(result.message, 'success');
        renderAuthStatus();

        // Al entrar, las sesiones pasan a la cuenta del usuario (si las tenía
        // sin cuenta) y la vista se repinta con sus datos.
        refreshCurrentUserViews();

        authCloseTimer = setTimeout(closeAuthModal, 600);
    }
    else
    {
        setAuthMessage(result.message, 'error');
        updateRateLimitUI();
    }
});

// Teclado dentro del modal de acceso:
// - Escape cierra el modal.
// - Tab no deja salir del modal (trampa de foco): al llegar al último elemento
//   el foco vuelve al primero, y al revés con Shift.
document.addEventListener('keydown', (e) =>
{
    if (authModal.hidden) return;

    if (e.key === 'Escape')
    {
        closeAuthModal();
        return;
    }

    if (e.key !== 'Tab') return;

    const focusables = authModal.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first)
    {
        e.preventDefault();
        last.focus();
    }
    else if (!e.shiftKey && document.activeElement === last)
    {
        e.preventDefault();
        first.focus();
    }
});

// Cuenta atrás mientras el bloqueo siga activo
setInterval(() =>
{
    if (!authModal.hidden && secondsLeftBlocked() > 0)
    {
        updateRateLimitUI();
    }
}, 1000);

// ---------- Pestañas ----------

// Mostrar una pestaña y ocultar las demás
function showTab(tabName)
{
    const buttons = document.querySelectorAll('.tab-button');

    for (const button of buttons)
    {
        const isActive = button.dataset.tab === tabName;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    const panels = document.querySelectorAll('.panel');

    for (const panel of panels)
    {
        panel.hidden = panel.id !== 'panel-' + tabName;
    }

    // Los gráficos se redibujan al abrir su pestaña (la función la aporta el agente de gráficos)
    if (tabName === 'graficos' && typeof renderCharts === 'function')
    {
        renderCharts();
    }
}

for (const tabButton of document.querySelectorAll('.tab-button'))
{
    tabButton.addEventListener('click', () =>
    {
        showTab(tabButton.dataset.tab);
    });
}

// ---------- Cronómetro ----------

// Clave de localStorage donde se guarda el estado del cronómetro
const TIMER_KEY = 'diario-estudio-cronometro';

let timerRemaining = 0;     // segundos que quedan
let timerTotalSeconds = 0;  // segundos de la sesión completa
let timerEndAt = 0;         // momento en que acaba (0 si está en pausa)
let timerTicker = null;     // intervalo que refresca la cuenta atrás

// Formatear segundos como "mm:ss" (o "h:mm:ss" si hace falta)
function formatTimer(seconds)
{
    const safe = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const rest = safe % 60;

    if (hours > 0)
    {
        return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
    }

    return String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
}

// Aviso del cronómetro (si el texto está vacío, el aviso se oculta)
function showTimerMessage(text, type)
{
    if (!text)
    {
        timerMessage.hidden = true;
        timerMessage.textContent = '';
        return;
    }

    timerMessage.hidden = false;
    timerMessage.textContent = text;
    timerMessage.className = 'form-message ' + (type || '');
}

// Guardar el estado del cronómetro para que sobreviva a cerrar la página
function saveTimerState()
{
    const state = {
        remaining: timerRemaining,
        total: timerTotalSeconds,
        endAt: timerEndAt,
        topic: timerTopic.value,
        minutes: timerMinutes.value
    };

    // Si el navegador no deja guardar, el cronómetro sigue funcionando en memoria
    if (!storageSet(TIMER_KEY, JSON.stringify(state)))
    {
        console.warn('No se pudo guardar el estado del cronómetro.');
    }
}

// Leer el estado guardado del cronómetro
function loadTimerState()
{
    try
    {
        const data = storageGet(TIMER_KEY);
        if (!data) return null;
        return JSON.parse(data);
    }
    catch (e)
    {
        return null;
    }
}

// Pintar el tiempo que queda
function updateTimerDisplay()
{
    timerDisplay.textContent = formatTimer(timerRemaining);

    if (timerTotalSeconds > 0)
    {
        timerTotal.hidden = false;
        timerTotal.textContent = 'Sesión de ' + formatTimer(timerTotalSeconds)
            + ' · quedan ' + formatTimer(timerRemaining);
    }
    else
    {
        timerTotal.hidden = true;
    }
}

// Arrancar el intervalo que refresca la cuenta atrás
function startTicker()
{
    stopTicker();
    timerTicker = setInterval(tickTimer, 250);
}

// Parar el intervalo de la cuenta atrás
function stopTicker()
{
    if (timerTicker !== null)
    {
        clearInterval(timerTicker);
        timerTicker = null;
    }
}

// Cada tick: se usa la hora real y no un contador, para que el reloj no se desvíe
function tickTimer()
{
    if (!timerEndAt) return;

    timerRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    updateTimerDisplay();

    if (timerRemaining <= 0)
    {
        finishTimer();
    }
}

// Empezar (o continuar) el cronómetro
function startTimer()
{
    if (timerEndAt > 0) return;

    if (timerRemaining <= 0)
    {
        const minutes = Number(timerMinutes.value);

        if (!isFinite(minutes) || minutes <= 0)
        {
            showTimerMessage('Escribe cuántos minutos quieres estudiar (mínimo 1).', 'error');
            return;
        }

        timerTotalSeconds = Math.round(minutes * 60);
        timerRemaining = timerTotalSeconds;
    }

    timerEndAt = Date.now() + timerRemaining * 1000;
    timerDone.hidden = true;
    timerStart.disabled = true;
    timerPause.disabled = false;
    showTimerMessage('', '');
    saveTimerState();
    updateTimerDisplay();
    startTicker();
}

// Pausar la cuenta atrás
function pauseTimer()
{
    if (!timerEndAt) return;

    timerRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    timerEndAt = 0;
    stopTicker();
    timerPause.disabled = true;
    timerStart.disabled = false;
    saveTimerState();
    updateTimerDisplay();
}

// Volver a cero
function resetTimer()
{
    stopTicker();
    timerEndAt = 0;
    timerRemaining = 0;
    timerTotalSeconds = 0;
    timerDone.hidden = true;
    timerStart.disabled = false;
    timerPause.disabled = true;
    showTimerMessage('', '');
    updateTimerDisplay();
    saveTimerState();
}

// El tiempo se ha acabado
function finishTimer()
{
    stopTicker();
    timerEndAt = 0;
    timerRemaining = 0;
    timerPause.disabled = true;
    timerStart.disabled = false;
    showTimerDone();
    playTimerSound();
    updateTimerDisplay();
    saveTimerState();
}

// Mostrar el aviso de "se acabó el tiempo"
function showTimerDone()
{
    timerDone.hidden = false;
    showTimerMessage('¡Tiempo terminado! Puedes registrar la sesión en el diario.', 'success');
}

// Registrar en el diario la sesión hecha con el cronómetro
function saveTimerSession()
{
    const elapsed = Math.max(0, timerTotalSeconds - timerRemaining);
    const minutes = Math.max(0.1, Math.round((elapsed / 60) * 10) / 10);
    const topic = timerTopic.value.trim() || 'Sesión de cronómetro';

    const sessions = loadSessions();
    sessions.push({ date: getTodayLocal(), topic: topic, minutes: minutes });

    const result = saveSessions(sessions);

    if (!result.ok)
    {
        showTimerMessage(result.message, 'error');
        return;
    }

    resetTimer();
    updateStreak();
    updateBestStreak();
    updateWeekTotal();
    updateSessionList();
    showTab('diario');
    showFormMessage('Sesión del cronómetro registrada: ' + minutes + ' min.', 'success');
}

// Sonido al terminar (Web Audio API, sin archivos externos)
function playTimerSound()
{
    try
    {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const context = new AudioContextClass();

        for (let i = 0; i < 3; i++)
        {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const start = context.currentTime + i * 0.35;

            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

            oscillator.start(start);
            oscillator.stop(start + 0.32);
        }

        setTimeout(() => context.close(), 1500);
    }
    catch (e)
    {
        // Si el navegador no deja reproducir sonido, el aviso visual sigue estando
    }
}

// Recuperar el cronómetro que quedó a medias al cerrar la página
function restoreTimer()
{
    const state = loadTimerState();
    if (!state) return;

    timerTotalSeconds = Number(state.total) || 0;
    timerRemaining = Number(state.remaining) || 0;

    if (typeof state.topic === 'string') timerTopic.value = state.topic;
    if (state.minutes) timerMinutes.value = state.minutes;

    const endAt = Number(state.endAt) || 0;

    if (endAt > 0)
    {
        if (endAt > Date.now())
        {
            // seguía corriendo con la página cerrada: sigue contando donde lo dejó
            timerEndAt = endAt;
            timerRemaining = Math.ceil((endAt - Date.now()) / 1000);
            timerStart.disabled = true;
            timerPause.disabled = false;
            startTicker();
        }
        else
        {
            // se acabó mientras la página estaba cerrada
            timerRemaining = 0;
            timerStart.disabled = false;
            timerPause.disabled = true;
            showTimerDone();
        }
    }
    else if (timerRemaining > 0)
    {
        timerStart.disabled = false;
        timerPause.disabled = true;
    }

    updateTimerDisplay();
}

timerStart.addEventListener('click', startTimer);
timerPause.addEventListener('click', pauseTimer);
timerReset.addEventListener('click', resetTimer);
timerSave.addEventListener('click', saveTimerSession);

// ============================================================
// Gráficos (SVG dibujado a mano, sin librerías)
// ============================================================

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const CHART_DAYS = 7;
const CHART_WEEKS = 8;
const CHART_MAX_TOPICS = 5;
const CHART_COLOR_COUNT = 6;

// --- Estado del gráfico de barras ---

// Desplazamiento de la ventana de días respecto a la de por defecto.
// 0 = los últimos 7 días hasta hoy. Cada botón mueve la ventana 7 días.
let chartDaysOffset = 0;

// Día seleccionado en el gráfico de barras (fecha "AAAA-MM-DD" o texto vacío)
let chartSelectedDay = '';

// Clave de sesiones del usuario que se está viendo. Si cambia (es decir, si
// entra o sale otro usuario), la ventana vuelve a la de por defecto y el
// detalle seleccionado se borra: no se mezclan datos de dos usuarios.
let chartSessionsKey = getSessionsKey();

// Botones para mover la ventana de días del gráfico de barras
const chartDaysPreviousButton = document.getElementById('chart-dias-anterior');
const chartDaysNextButton = document.getElementById('chart-dias-siguiente');

if (chartDaysPreviousButton)
{
    // Hacia atrás: los 7 días anteriores
    chartDaysPreviousButton.addEventListener('click', () => moveChartDays(CHART_DAYS));
}

if (chartDaysNextButton)
{
    // Hacia delante: los 7 días siguientes (sin llegar al futuro)
    chartDaysNextButton.addEventListener('click', () => moveChartDays(-CHART_DAYS));
}

// --- Utilidades para dibujar ---

// Crear un elemento del SVG con sus atributos
function createSvgElement(tag, attributes)
{
    const element = document.createElementNS(SVG_NAMESPACE, tag);

    for (const name in attributes)
    {
        if (!Object.prototype.hasOwnProperty.call(attributes, name))
        {
            continue;
        }

        const value = attributes[name];
        if (value === null || value === undefined)
        {
            continue;
        }

        element.setAttribute(name, String(value));
    }

    return element;
}

// Crear un texto dentro del SVG
function createSvgText(content, attributes)
{
    const text = createSvgElement('text', attributes);
    text.textContent = content;
    return text;
}

// Añadir el <title> que el navegador usa como tooltip al pasar el ratón
function addSvgTooltip(element, text)
{
    const title = createSvgElement('title', {});
    title.textContent = text;
    element.appendChild(title);
    return element;
}

// Minutos con decimales solo si hacen falta (coma decimal en español)
function formatChartMinutes(minutes)
{
    const value = Number(minutes);
    if (!isFinite(value)) return '0';

    if (Number.isInteger(value)) return String(value);

    return value.toFixed(1).replace('.', ',');
}

// Nombre corto del día de la semana ("mié")
function formatChartWeekday(date)
{
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
}

// Fecha corta ("21/10")
function formatChartDayNumber(date)
{
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

// Texto de una semana: "del 21/10 al 27/10"
function formatChartWeekRange(week)
{
    return 'del ' + formatChartDayNumber(week.monday) + ' al ' + formatChartDayNumber(week.sunday);
}

// Fecha larga de un día: "13 de octubre"
function formatChartDayLong(date)
{
    return date.getDate() + ' de ' + date.toLocaleDateString('es-ES', { month: 'long' });
}

// Nombre completo de un día: "Martes 13 de octubre"
function formatChartDayFullName(date)
{
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const weekdayName = weekday.charAt(0).toUpperCase() + weekday.slice(1);

    return weekdayName + ' ' + formatChartDayLong(date);
}

// Rango de días que se está viendo: "del 6 al 12 de octubre"
function formatChartDaysRange(firstDay, lastDay)
{
    const sameMonth = firstDay.getFullYear() === lastDay.getFullYear()
        && firstDay.getMonth() === lastDay.getMonth();

    if (sameMonth)
    {
        const month = lastDay.toLocaleDateString('es-ES', { month: 'long' });
        return 'del ' + firstDay.getDate() + ' al ' + lastDay.getDate() + ' de ' + month;
    }

    return 'del ' + formatChartDayLong(firstDay) + ' al ' + formatChartDayLong(lastDay);
}

// Nombre de un tema: si viene vacío se pone algo legible
function getTopicLabel(topic)
{
    const name = typeof topic === 'string' ? topic.trim() : '';
    return name !== '' ? topic : '(sin tema)';
}

// --- Datos de los gráficos ---

// Sesiones que se pueden dibujar: minutos válidos y fecha no futura,
// igual que los totales de la app (las fechas futuras no suman).
function getChartSessions()
{
    const sessions = loadSessions();
    const today = getTodayLocal();
    const usable = [];

    for (const session of sessions)
    {
        if (!session || typeof session.date !== 'string')
        {
            continue;
        }

        if (session.date > today)
        {
            continue;
        }

        const minutes = Number(session.minutes);
        if (!isFinite(minutes) || minutes < 0)
        {
            continue;
        }

        usable.push({ date: session.date, topic: session.topic, minutes: minutes });
    }

    return usable;
}

// Minutos y sesiones de cada tema, de más a menos minutos
function groupMinutesByTopic(sessions)
{
    const totals = new Map();

    for (const session of sessions)
    {
        const current = totals.get(session.topic);

        if (current)
        {
            current.minutes += session.minutes;
            current.sessions += 1;
        }
        else
        {
            totals.set(session.topic, { topic: session.topic, minutes: session.minutes, sessions: 1 });
        }
    }

    const groups = Array.from(totals.values());
    groups.sort((a, b) => b.minutes - a.minutes || a.topic.localeCompare(b.topic, 'es'));
    return groups;
}

// El lunes de la semana a la que pertenece una fecha
function getMondayOf(date)
{
    const monday = new Date(date.getTime());
    const daysSinceMonday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - daysSinceMonday);
    return monday;
}

// Minutos de cada uno de los 7 días que se están viendo.
// El desplazamiento mueve la ventana: 0 son los últimos 7 días hasta hoy,
// 7 son los 7 días anteriores, 14 los anteriores a esos...
// Los días sin sesiones se quedan a cero: así se ve la ausencia.
function getDailyMinutes(sessions, offset)
{
    const days = [];
    const today = parseLocalDate(getTodayLocal());

    for (let position = CHART_DAYS - 1; position >= 0; position--)
    {
        const date = new Date(today.getTime());
        date.setDate(date.getDate() - position - offset);
        days.push({ date: date, key: toLocalDateString(date), minutes: 0 });
    }

    for (const session of sessions)
    {
        for (const day of days)
        {
            if (day.key === session.date)
            {
                day.minutes += session.minutes;
                break;
            }
        }
    }

    return days;
}

// Minutos de cada una de las últimas 8 semanas (de lunes a domingo).
// Las semanas sin datos se quedan a cero.
function getWeeklyMinutes(sessions)
{
    const weeks = [];
    const currentMonday = getMondayOf(parseLocalDate(getTodayLocal()));

    for (let offset = CHART_WEEKS - 1; offset >= 0; offset--)
    {
        const monday = new Date(currentMonday.getTime());
        monday.setDate(monday.getDate() - offset * 7);

        const sunday = new Date(monday.getTime());
        sunday.setDate(sunday.getDate() + 6);

        weeks.push({
            monday: monday,
            sunday: sunday,
            key: toLocalDateString(monday),
            minutes: 0
        });
    }

    for (const session of sessions)
    {
        const key = toLocalDateString(getMondayOf(parseLocalDate(session.date)));

        for (const week of weeks)
        {
            if (week.key === key)
            {
                week.minutes += session.minutes;
                break;
            }
        }
    }

    return weeks;
}

// Reparto por tema: como mucho 5 temas y el resto agrupado en "Otros"
function getTopicSlices(sessions)
{
    const groups = groupMinutesByTopic(sessions);
    const withMinutes = groups.filter(group => group.minutes > 0);

    const slices = withMinutes.slice(0, CHART_MAX_TOPICS);
    const rest = withMinutes.slice(CHART_MAX_TOPICS);

    if (rest.length > 0)
    {
        let minutes = 0;
        let count = 0;

        for (const group of rest)
        {
            minutes += group.minutes;
            count += group.sessions;
        }

        slices.push({ topic: 'Otros', minutes: minutes, sessions: count });
    }

    return slices;
}

// --- Gráfico de barras: minutos por día ---

// Texto que se lee al llegar a una barra con el teclado
function formatChartDayAriaLabel(day)
{
    const minutes = day.minutes > 0
        ? formatChartMinutes(day.minutes) + ' minutos'
        : 'sin minutos registrados';

    return formatChartDayFullName(day.date) + ': ' + minutes + '. Ver el detalle del día';
}

function renderBarChart(container, days)
{
    container.textContent = '';

    const width = 320;
    const height = 210;
    const paddingLeft = 8;
    const paddingRight = 8;
    const topSpace = 24;
    const bottomSpace = 38;
    const plotHeight = height - topSpace - bottomSpace;
    const baseline = topSpace + plotHeight;
    const slot = (width - paddingLeft - paddingRight) / days.length;
    const barWidth = slot * 0.58;

    let maxMinutes = 0;
    for (const day of days)
    {
        if (day.minutes > maxMinutes)
        {
            maxMinutes = day.minutes;
        }
    }

    // El SVG no lleva role="img" porque ahora las barras se pueden pulsar:
    // con role="img" el navegador no expone el interior del dibujo.
    // Se usa role="group" para que cada barra conserve su nombre accesible.
    const svg = createSvgElement('svg', {
        'viewBox': '0 0 ' + width + ' ' + height,
        'role': 'group',
        'aria-label': 'Minutos estudiados por día'
    });
    addSvgTooltip(svg, 'Minutos estudiados por día');

    // Línea de la base
    svg.appendChild(createSvgElement('line', {
        'x1': paddingLeft,
        'y1': baseline,
        'x2': width - paddingRight,
        'y2': baseline,
        'class': 'chart-axis'
    }));

    for (let i = 0; i < days.length; i++)
    {
        const day = days[i];
        const centerX = paddingLeft + slot * i + slot / 2;
        const barHeight = maxMinutes > 0 ? (day.minutes / maxMinutes) * plotHeight : 0;
        const barX = centerX - barWidth / 2;
        const barY = baseline - barHeight;

        // Un <g> por día: se puede pulsar con el ratón y con el teclado
        // (Tab para llegar, Enter o Espacio para activar).
        const group = createSvgElement('g', {
            'class': 'chart-day' + (day.key === chartSelectedDay ? ' is-selected' : ''),
            'tabindex': '0',
            'role': 'button',
            'aria-label': formatChartDayAriaLabel(day),
            'data-chart-day': day.key
        });

        // El <title> va el primero: es el tooltip del ratón y el nombre accesible
        addSvgTooltip(group, formatChartWeekday(day.date) + ' ' + formatChartDayNumber(day.date)
            + ': ' + formatChartMinutes(day.minutes) + ' min');

        // Área sensible: ocupa toda la columna para que también se pueda pulsar
        // en los días sin sesiones (su barra tiene altura 0)
        group.appendChild(createSvgElement('rect', {
            'x': barX,
            'y': topSpace,
            'width': barWidth,
            'height': plotHeight,
            'class': 'chart-day-area'
        }));

        // La barra visible
        group.appendChild(createSvgElement('rect', {
            'x': barX,
            'y': barY,
            'width': barWidth,
            'height': barHeight,
            'rx': 3,
            'class': 'chart-bar'
        }));

        // Marca del día en la base: también aparece en los días sin sesiones
        group.appendChild(createSvgElement('rect', {
            'x': barX,
            'y': baseline,
            'width': barWidth,
            'height': 2,
            'class': 'chart-tick'
        }));

        // Minutos encima de la barra
        group.appendChild(createSvgText(formatChartMinutes(day.minutes), {
            'x': centerX,
            'y': barY - 6,
            'class': 'chart-value',
            'text-anchor': 'middle'
        }));

        // Etiqueta del día: nombre del día y fecha local
        group.appendChild(createSvgText(formatChartWeekday(day.date), {
            'x': centerX,
            'y': baseline + 16,
            'class': 'chart-label',
            'text-anchor': 'middle'
        }));
        group.appendChild(createSvgText(formatChartDayNumber(day.date), {
            'x': centerX,
            'y': baseline + 29,
            'class': 'chart-label',
            'text-anchor': 'middle'
        }));

        group.addEventListener('click', () => toggleChartDay(day.key));
        group.addEventListener('keydown', (event) =>
        {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar')
            {
                event.preventDefault();
                toggleChartDay(day.key);
            }
        });

        svg.appendChild(group);
    }

    container.appendChild(svg);
}

// --- Ventana de días y detalle del día ---

// Título del gráfico de barras: dice qué días se están viendo
function getChartDaysTitle(days)
{
    if (chartDaysOffset === 0)
    {
        return 'Minutos por día (últimos ' + CHART_DAYS + ' días)';
    }

    if (days.length === 0)
    {
        return 'Minutos por día';
    }

    return 'Minutos por día (' + formatChartDaysRange(days[0].date, days[days.length - 1].date) + ')';
}

// El botón de adelante se apaga cuando la ventana ya llega a hoy:
// así no se puede ver el futuro.
function updateChartNavButtons()
{
    if (!chartDaysNextButton) return;

    chartDaysNextButton.disabled = chartDaysOffset <= 0;
}

// Pinta debajo del gráfico qué se estudió el día seleccionado
function renderChartDetail(container, sessions)
{
    container.textContent = '';

    if (chartSelectedDay === '')
    {
        container.hidden = true;
        return;
    }

    const daySessions = sessions.filter(session => session.date === chartSelectedDay);

    const title = document.createElement('h4');
    title.className = 'chart-detail-title';
    title.textContent = formatChartDayFullName(parseLocalDate(chartSelectedDay));
    container.appendChild(title);

    if (daySessions.length === 0)
    {
        const empty = document.createElement('p');
        empty.className = 'chart-detail-empty';
        empty.textContent = 'Ese día no registraste ninguna sesión.';
        container.appendChild(empty);
        container.hidden = false;
        return;
    }

    const list = document.createElement('ul');
    list.className = 'chart-detail-list';

    let totalMinutes = 0;

    for (const session of daySessions)
    {
        totalMinutes += session.minutes;

        const item = document.createElement('li');
        item.className = 'chart-detail-item';

        const topic = document.createElement('span');
        topic.className = 'chart-detail-topic';
        topic.textContent = getTopicLabel(session.topic);

        const minutes = document.createElement('span');
        minutes.className = 'chart-detail-minutes';
        minutes.textContent = formatChartMinutes(session.minutes) + ' min';

        item.appendChild(topic);
        item.appendChild(minutes);
        list.appendChild(item);
    }

    container.appendChild(list);

    const total = document.createElement('p');
    total.className = 'chart-detail-total';
    total.textContent = 'Total de ese día: ' + formatChartMinutes(totalMinutes) + ' min';
    container.appendChild(total);

    container.hidden = false;
}

// Pinta el gráfico de barras: las barras, el título del rango que se está
// viendo, el detalle del día seleccionado y el estado de los botones.
function renderChartDays(sessions)
{
    const barContainer = document.getElementById('chart-barras');
    const titleElement = document.getElementById('chart-dias-titulo');
    const detailElement = document.getElementById('chart-detalle');

    if (!barContainer) return;

    const days = getDailyMinutes(sessions, chartDaysOffset);

    renderBarChart(barContainer, days);

    if (titleElement)
    {
        titleElement.textContent = getChartDaysTitle(days);
    }

    if (detailElement)
    {
        renderChartDetail(detailElement, sessions);
    }

    updateChartNavButtons();
}

// Cuando no hay nada que dibujar, el gráfico de barras se deja limpio
function clearChartDays()
{
    const titleElement = document.getElementById('chart-dias-titulo');
    const detailElement = document.getElementById('chart-detalle');

    if (titleElement)
    {
        titleElement.textContent = 'Minutos por día (últimos ' + CHART_DAYS + ' días)';
    }

    if (detailElement)
    {
        detailElement.textContent = '';
        detailElement.hidden = true;
    }

    updateChartNavButtons();
}

// Mover la ventana de días: hacia atrás (días positivos) o hacia delante
// (días negativos). La ventana nunca pasa de hoy.
function moveChartDays(days)
{
    let newOffset = chartDaysOffset + days;

    if (newOffset < 0)
    {
        newOffset = 0;
    }

    if (newOffset === chartDaysOffset)
    {
        return;
    }

    chartDaysOffset = newOffset;

    const sessions = getChartSessions();
    const visibleDays = getDailyMinutes(sessions, chartDaysOffset);

    // Si el día seleccionado ya no está en la ventana, el detalle se borra
    let sigueVisible = false;

    for (const day of visibleDays)
    {
        if (day.key === chartSelectedDay)
        {
            sigueVisible = true;
            break;
        }
    }

    if (!sigueVisible)
    {
        chartSelectedDay = '';
    }

    renderChartDays(sessions);
}

// Pulsar una barra muestra el detalle de ese día.
// Volver a pulsar la misma barra lo oculta.
function toggleChartDay(dayKey)
{
    chartSelectedDay = (chartSelectedDay === dayKey) ? '' : dayKey;

    renderChartDays(getChartSessions());

    // Al repintar el gráfico, el foco se pierde: se devuelve a la barra pulsada
    focusChartDay(dayKey);
}

// Devolver el foco a la barra de un día para poder seguir con el teclado
function focusChartDay(dayKey)
{
    const container = document.getElementById('chart-barras');

    if (!container) return;

    const group = container.querySelector('[data-chart-day="' + dayKey + '"]');

    if (group)
    {
        group.focus();
    }
}

// --- Gráfico circular: reparto por tema ---

// Un punto del círculo a partir de un ángulo (grados, sentido horario desde las 12)
function polarToPoint(centerX, centerY, radius, angle)
{
    const radians = (angle * Math.PI) / 180;

    return {
        x: centerX + radius * Math.sin(radians),
        y: centerY - radius * Math.cos(radians)
    };
}

// Camino SVG de una porción de pizza.
// El arco va del final al principio con la bandera "0" (antihorario) para que
// la porción se dibuje en el sentido correcto.
function describePieSlice(centerX, centerY, radius, startAngle, endAngle)
{
    const start = polarToPoint(centerX, centerY, radius, endAngle);
    const end = polarToPoint(centerX, centerY, radius, startAngle);
    const largeArc = (endAngle - startAngle) > 180 ? '1' : '0';

    return 'M ' + centerX + ' ' + centerY
        + ' L ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2)
        + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 0 '
        + end.x.toFixed(2) + ' ' + end.y.toFixed(2)
        + ' Z';
}

function renderPieChart(container, sessions)
{
    container.textContent = '';

    const slices = getTopicSlices(sessions);

    let total = 0;
    for (const slice of slices)
    {
        total += slice.minutes;
    }

    if (total <= 0)
    {
        const message = document.createElement('p');
        message.className = 'empty-message';
        message.textContent = 'Todavía no hay minutos que repartir por temas.';
        container.appendChild(message);
        return;
    }

    const width = 320;
    const height = 220;
    const centerX = width / 2;
    const centerY = 110;
    const radius = 90;

    const svg = createSvgElement('svg', {
        'viewBox': '0 0 ' + width + ' ' + height,
        'role': 'img'
    });
    addSvgTooltip(svg, 'Reparto de los minutos estudiados por tema');

    let angle = 0;

    for (let i = 0; i < slices.length; i++)
    {
        const slice = slices[i];
        const share = (slice.minutes / total) * 360;
        const startAngle = angle;
        const endAngle = angle + share;
        angle = endAngle;

        const colorClass = 'chart-color-' + Math.min(i + 1, CHART_COLOR_COUNT);
        let shape;

        if (share >= 359.999)
        {
            // Un solo tema ocupa toda la circunferencia: el arco sedegeneraría,
            // así que se dibuja un círculo entero.
            shape = createSvgElement('circle', {
                'cx': centerX,
                'cy': centerY,
                'r': radius,
                'class': 'chart-slice ' + colorClass
            });
        }
        else
        {
            shape = createSvgElement('path', {
                'd': describePieSlice(centerX, centerY, radius, startAngle, endAngle),
                'class': 'chart-slice ' + colorClass
            });
        }

        addSvgTooltip(shape, getTopicLabel(slice.topic) + ': ' + formatChartMinutes(slice.minutes) + ' min');
        svg.appendChild(shape);
    }

    container.appendChild(svg);

    // Leyenda: tema, minutos y porcentaje
    const legend = document.createElement('ul');
    legend.className = 'chart-legend';

    for (let i = 0; i < slices.length; i++)
    {
        const slice = slices[i];
        const percent = Math.round((slice.minutes / total) * 100);

        const item = document.createElement('li');
        item.className = 'chart-legend-item';

        const swatch = document.createElement('span');
        swatch.className = 'chart-swatch chart-color-' + Math.min(i + 1, CHART_COLOR_COUNT);

        const name = document.createElement('span');
        name.className = 'chart-legend-name';
        name.textContent = getTopicLabel(slice.topic);

        const value = document.createElement('span');
        value.className = 'chart-legend-value';
        value.textContent = formatChartMinutes(slice.minutes) + ' min · ' + percent + ' %';

        item.appendChild(swatch);
        item.appendChild(name);
        item.appendChild(value);
        legend.appendChild(item);
    }

    container.appendChild(legend);
}

// --- Gráfico de línea: minutos por semana ---

// Un techo "redondo" para el eje: 100 en vez de 87
function getNiceMax(value)
{
    if (!isFinite(value) || value <= 0) return 0;

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    let nice;

    if (normalized <= 1)
    {
        nice = 1;
    }
    else if (normalized <= 2)
    {
        nice = 2;
    }
    else if (normalized <= 5)
    {
        nice = 5;
    }
    else
    {
        nice = 10;
    }

    return nice * magnitude;
}

function renderLineChart(container, sessions)
{
    container.textContent = '';

    const weeks = getWeeklyMinutes(sessions);
    const width = 320;
    const height = 210;
    const paddingLeft = 36;
    const paddingRight = 20;
    const topSpace = 18;
    const bottomSpace = 38;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - topSpace - bottomSpace;
    const baseline = topSpace + plotHeight;

    let maxMinutes = 0;
    for (const week of weeks)
    {
        if (week.minutes > maxMinutes)
        {
            maxMinutes = week.minutes;
        }
    }

    const topValue = getNiceMax(maxMinutes);

    const svg = createSvgElement('svg', {
        'viewBox': '0 0 ' + width + ' ' + height,
        'role': 'img'
    });
    addSvgTooltip(svg, 'Minutos estudiados por semana en las últimas ' + CHART_WEEKS + ' semanas');

    // Rejilla y eje vertical
    const gridValues = topValue > 0 ? [0, topValue / 2, topValue] : [0];

    for (const value of gridValues)
    {
        const y = topValue > 0 ? baseline - (value / topValue) * plotHeight : baseline;

        svg.appendChild(createSvgElement('line', {
            'x1': paddingLeft,
            'y1': y,
            'x2': width - paddingRight,
            'y2': y,
            'class': 'chart-axis'
        }));
        svg.appendChild(createSvgText(formatChartMinutes(value), {
            'x': paddingLeft - 6,
            'y': y + 3,
            'class': 'chart-label',
            'text-anchor': 'end'
        }));
    }

    // Puntos: uno por semana
    const points = [];
    for (let i = 0; i < weeks.length; i++)
    {
        const x = paddingLeft + (plotWidth / (weeks.length - 1)) * i;
        const y = topValue > 0 ? baseline - (weeks[i].minutes / topValue) * plotHeight : baseline;
        points.push({ x: x, y: y });
    }

    const pathData = [];
    for (let i = 0; i < points.length; i++)
    {
        pathData.push((i === 0 ? 'M ' : 'L ') + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2));
    }

    svg.appendChild(createSvgElement('path', {
        'd': pathData.join(' '),
        'class': 'chart-line'
    }));

    for (let i = 0; i < weeks.length; i++)
    {
        const week = weeks[i];
        const point = points[i];

        const circle = createSvgElement('circle', {
            'cx': point.x,
            'cy': point.y,
            'r': 4,
            'class': 'chart-point'
        });
        addSvgTooltip(circle, 'Semana ' + formatChartWeekRange(week) + ': '
            + formatChartMinutes(week.minutes) + ' min');
        svg.appendChild(circle);

        svg.appendChild(createSvgText(formatChartMinutes(week.minutes), {
            'x': point.x,
            'y': point.y - 9,
            'class': 'chart-value',
            'text-anchor': 'middle'
        }));

        // Etiqueta de la semana: el lunes de esa semana.
        // La última va alineada a la derecha para no salirse del dibujo.
        const isLast = i === weeks.length - 1;

        svg.appendChild(createSvgText(formatChartDayNumber(week.monday), {
            'x': point.x,
            'y': baseline + 16,
            'class': 'chart-label',
            'text-anchor': isLast ? 'end' : 'middle'
        }));
    }

    container.appendChild(svg);
}

// --- Lista: temas más estudiados ---

function renderTopTopics(list, sessions)
{
    list.textContent = '';

    const groups = groupMinutesByTopic(sessions);

    if (groups.length === 0)
    {
        const empty = document.createElement('li');
        empty.className = 'empty-message';
        empty.textContent = 'Todavía no hay temas registrados.';
        list.appendChild(empty);
        return;
    }

    for (let i = 0; i < groups.length; i++)
    {
        const group = groups[i];

        const item = document.createElement('li');
        item.className = 'top-item';

        const rank = document.createElement('span');
        rank.className = 'top-rank';
        rank.textContent = (i + 1) + '.';

        const name = document.createElement('span');
        name.className = 'top-name';
        name.textContent = getTopicLabel(group.topic);

        const minutes = document.createElement('span');
        minutes.className = 'top-minutes';
        minutes.textContent = formatChartMinutes(group.minutes) + ' min';

        const count = document.createElement('span');
        count.className = 'top-sessions';
        count.textContent = group.sessions === 1 ? '1 sesión' : group.sessions + ' sesiones';

        item.appendChild(rank);
        item.appendChild(name);
        item.appendChild(minutes);
        item.appendChild(count);
        list.appendChild(item);
    }
}

// --- Pintar la pestaña de gráficos ---

function renderCharts()
{
    const emptyBox = document.getElementById('charts-empty');
    const barContainer = document.getElementById('chart-barras');
    const pieContainer = document.getElementById('chart-circular');
    const lineContainer = document.getElementById('chart-linea');
    const topList = document.getElementById('chart-top-temas');

    if (!barContainer || !pieContainer || !lineContainer || !topList)
    {
        return;
    }

    // Si ha cambiado el usuario de la app, la ventana de días vuelve a la de
    // por defecto y el detalle seleccionado se borra: no se mezclan datos
    // de dos usuarios.
    const currentKey = getSessionsKey();

    if (currentKey !== chartSessionsKey)
    {
        chartSessionsKey = currentKey;
        chartDaysOffset = 0;
        chartSelectedDay = '';
    }

    const sessions = getChartSessions();

    if (sessions.length === 0)
    {
        // Sin sesiones: se avisa y no se dibuja ningún gráfico
        if (emptyBox)
        {
            emptyBox.hidden = false;
        }

        barContainer.textContent = '';
        pieContainer.textContent = '';
        lineContainer.textContent = '';
        topList.textContent = '';
        clearChartDays();
        return;
    }

    if (emptyBox)
    {
        emptyBox.hidden = true;
    }

    renderChartDays(sessions);
    renderPieChart(pieContainer, sessions);
    renderLineChart(lineContainer, sessions);
    renderTopTopics(topList, sessions);
}

// Cuando otra pestaña del navegador guarda sesiones, esta se actualiza.
// Sin esto las dos pestañas del mismo diario muestran datos distintos.
// Ahora cada usuario tiene su propia clave, así que solo se actualiza esta
// pestaña si lo que ha cambiado es la clave del usuario que tiene abierto.
window.addEventListener('storage', (e) =>
{
    if (e.key === getSessionsKey())
    {
        refreshCurrentUserViews();
    }
});

// Inicializar
dateInput.value = getTodayLocal();
loadTheme();
// Las cuentas antiguas (con el hash débil) se desactivan antes de validar la sesión
purgeLegacyUsers();
// Si la sesión guardada no es válida (usuario inexistente o formato raro), se borra
validateSession();
renderAuthStatus();

// Un solo repintado: racha, mejor racha, total de la semana, lista y gráficos.
refreshCurrentUserViews();

renderAgents();
restoreTimer();
showTab('diario');

