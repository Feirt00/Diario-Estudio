// Elementos del DOM
const form = document.getElementById('study-form');
const dateInput = document.getElementById('date');
const topicInput = document.getElementById('topic');
const minutesInput = document.getElementById('minutes');
const streakDisplay = document.getElementById('streak');
const bestStreakDisplay = document.getElementById('best-streak');
const weekMinutesDisplay = document.getElementById('week-minutes');
const sessionList = document.getElementById('session-list');
const themeToggle = document.getElementById('theme-toggle');
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
const STORAGE_KEY = 'diario-estudio-sesiones';
const THEME_KEY = 'diario-estudio-tema';
const USERS_KEY = 'diario-estudio-usuarios';
const SESSION_KEY = 'diario-estudio-sesion';
const ATTEMPTS_KEY = 'diario-estudio-login-intentos';

// Ajustes del acceso
const SALT = 'diario-estudio-v1';
const MAX_ATTEMPTS = 5;
const BLOCK_SECONDS = 30;
const MIN_PASSWORD = 6;
const MIN_USERNAME = 3;
const MAX_USERNAME = 20;

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

// Formatear fecha para mostrar
function formatDate(dateStr)
{
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

// Cargar sesiones desde localStorage
function loadSessions()
{
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Guardar sesiones en localStorage
function saveSessions(sessions)
{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
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
function calculateWeekMinutes(sessions)
{
    const weekStart = getWeekStart();
    const today = getTodayLocal();

    let total = 0;
    for (const session of sessions)
    {
        if (session.date >= weekStart && session.date <= today)
        {
            total += Number(session.minutes);
        }
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
    topic.textContent = session.topic;

    const minutes = document.createElement('span');
    minutes.className = 'session-minutes';
    minutes.textContent = session.minutes + ' min';

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

// Manejar envío del formulario
form.addEventListener('submit', (e) =>
{
    e.preventDefault();

    const date = dateInput.value;
    const topic = topicInput.value.trim();
    const minutes = parseInt(minutesInput.value);

    if (!date || !topic || !minutes || minutes <= 0)
    {
        alert('Por favor, completa todos los campos correctamente.');
        return;
    }

    const sessions = loadSessions();
    sessions.push({ date, topic, minutes });
    saveSessions(sessions);

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
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
}

// Cargar tema guardado
function loadTheme()
{
    const savedTheme = localStorage.getItem(THEME_KEY);
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

// Hash sencillo de la contraseña. No es criptografía real:
// solo evita que la contraseña se lea en claro al abrir el navegador.
function hashPassword(usernameKeyValue, password)
{
    const text = SALT + usernameKeyValue + password;
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++)
    {
        hash ^= text.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(16);
}

function loadUsers()
{
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveUsers(users)
{
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser()
{
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
}

function setSession(username)
{
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        username: username,
        loggedInAt: getTodayLocal()
    }));
}

function clearSession()
{
    localStorage.removeItem(SESSION_KEY);
}

// Intentos fallidos de acceso
function loadAttempts()
{
    const data = localStorage.getItem(ATTEMPTS_KEY);
    if (!data) return { count: 0, blockedUntil: 0 };
    return JSON.parse(data);
}

function saveAttempts(attempts)
{
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
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

// Mostrar el usuario conectado o el enlace de acceso
function renderAuthStatus()
{
    const user = getCurrentUser();
    if (user)
    {
        authStatus.innerHTML = '';
        const name = document.createElement('span');
        name.className = 'auth-username';
        name.textContent = user.username;
        const exit = document.createElement('span');
        exit.className = 'auth-link';
        exit.id = 'logout-link';
        exit.textContent = 'Cerrar sesión';
        authStatus.appendChild(name);
        authStatus.appendChild(exit);
    }
    else
    {
        authStatus.innerHTML = '<span class="auth-link" id="login-link">Iniciar sesión</span>';
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

function setAuthMode(mode)
{
    authMode = mode;
    setAuthMessage('');
    clearAuthForm();
    updateRateLimitUI();

    if (mode === 'login')
    {
        authTitle.textContent = 'Iniciar sesión';
        authSubmit.textContent = 'Entrar';
        authPassword.setAttribute('placeholder', 'Tu contraseña');
        authToggleText.textContent = '¿No tienes cuenta?';
        authToggleLink.textContent = 'Crear usuario';
    }
    else
    {
        authTitle.textContent = 'Crear usuario';
        authSubmit.textContent = 'Crear cuenta';
        authPassword.setAttribute('placeholder', 'Mínimo ' + MIN_PASSWORD + ' caracteres');
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

function openAuthModal(mode)
{
    authModal.hidden = false;
    setAuthMode(mode);
    authUsername.focus();
}

function closeAuthModal()
{
    authModal.hidden = true;
    setAuthMessage('');
}

// ---------- Acciones ----------

// Devuelve { ok, message }. Nunca lanza errores: siempre un mensaje para el usuario.
function registerUser(username, password)
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

    const users = loadUsers();
    const key = usernameKey(username);

    const exists = users.some(user => user.usernameKey === key);
    if (exists)
    {
        return { ok: false, message: 'Ese nombre de usuario ya existe.' };
    }

    users.push({
        username: username,
        usernameKey: key,
        passwordHash: hashPassword(key, password),
        createdAt: getTodayLocal()
    });
    saveUsers(users);
    setSession(username);
    return { ok: true, message: '¡Cuenta creada! Bienvenido, ' + username + '.' };
}

function loginUser(username, password)
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

    const users = loadUsers();
    const key = usernameKey(username);
    const user = users.find(item => item.usernameKey === key);

    // Mensaje genérico: no revela si el usuario existe
    const fail = { ok: false, message: 'Usuario o contraseña incorrectos.' };

    if (user && user.passwordHash === hashPassword(key, password))
    {
        clearAttempts();
        setSession(user.username);
        return { ok: true, message: 'Sesión iniciada.' };
    }

    registerFailedAttempt();
    return fail;
}

function logoutUser()
{
    clearSession();
    renderAuthStatus();
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

authForm.addEventListener('submit', (e) =>
{
    e.preventDefault();

    const result = authMode === 'register'
        ? registerUser(authUsername.value.trim(), authPassword.value)
        : loginUser(authUsername.value.trim(), authPassword.value);

    if (result.ok)
    {
        setAuthMessage(result.message, 'success');
        renderAuthStatus();
        setTimeout(closeAuthModal, 600);
    }
    else
    {
        setAuthMessage(result.message, 'error');
        updateRateLimitUI();
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

// Inicializar
dateInput.value = getTodayLocal();
loadTheme();
renderAuthStatus();
updateStreak();
updateBestStreak();
updateWeekTotal();
updateSessionList();

