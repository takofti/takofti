const DISCORD_ID = "934876024305496084";

async function updateDiscordStatus() {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const json = await res.json();
    const data = json.data;

    // Аватар
    const avatarUrl = `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png`;
    document.getElementById("discord-avatar").src = avatarUrl;

    // Имя пользователя
    document.getElementById("discord-username").textContent = data.discord_user.username;

    // Статус (online, idle, dnd, offline) — подставляем нужную картинку
    // положи в папку status/ рядом с index.html файлы:
    // status/online.webp, status/idle.webp, status/dnd.webp, status/offline.webp
    document.getElementById("status-indicator").src = `status/${data.discord_status}.webp`;

    // Активность (игра, музыка и т.д.)
    const activity = data.activities.find(a => a.type === 0); // type 0 = играет в игру

    if (activity) {
        let html = `Playing <span class="playing-label">${activity.name}</span>`;

        if (activity.details) {
            html += `<br><span class="activity-details">${activity.details}</span>`;
        }

        if (activity.state) {
            html += `<br><span class="activity-state">${activity.state}</span>`;
        }

        document.getElementById("discord-activity").innerHTML = html;

        // Картинка активности
        if (activity.assets && activity.assets.large_image) {
            const img = activity.assets.large_image;
            let imageUrl;
            if (img.startsWith("mp:external/")) {
                imageUrl = `https://media.discordapp.net/external/${img.replace("mp:external/", "")}`;
            } else {
                imageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
            }
            document.getElementById("activity-image").src = imageUrl;
            document.getElementById("activity-image").style.display = "block";
        } else {
            document.getElementById("activity-image").style.display = "none";
        }
    } else {
        document.getElementById("discord-activity").innerHTML = "No activities";
        document.getElementById("activity-image").style.display = "none";
    }
}

updateDiscordStatus();
setInterval(updateDiscordStatus, 5000); // обновление каждые 5 секунд

// --- Музыка ---
const music = document.getElementById("bg-music");
const musicToggle = document.getElementById("music-toggle");
const iconOn = document.getElementById("icon-volume-on");
const iconOff = document.getElementById("icon-volume-off");
const volumeSlider = document.getElementById("volume-slider");

const DEFAULT_VOLUME = 50; // 0-100
music.volume = DEFAULT_VOLUME / 100;
volumeSlider.value = DEFAULT_VOLUME;
updateSliderFill(DEFAULT_VOLUME);

function updateSliderFill(value) {
    volumeSlider.style.background =
        `linear-gradient(to right, #ffffff ${value}%, rgba(255,255,255,0.25) ${value}%)`;
}

function setMutedUI(muted) {
    iconOn.style.display = muted ? "none" : "block";
    iconOff.style.display = muted ? "block" : "none";
    musicToggle.setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
}

// Пытаемся включить музыку сразу при заходе на сайт.
// Браузеры блокируют автоплей со звуком без действия пользователя —
// в этом случае запускаем по первому клику/тачу по странице.
function tryAutoplay() {
    const playPromise = music.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            const startOnInteract = () => {
                music.play().catch((e) => console.error("Не удалось запустить музыку:", e));
                document.removeEventListener("click", startOnInteract);
                document.removeEventListener("touchstart", startOnInteract);
            };
            document.addEventListener("click", startOnInteract, { once: true });
            document.addEventListener("touchstart", startOnInteract, { once: true });
        });
    }
}

music.addEventListener("error", () => {
    console.error("Файл музыки не загрузился. Проверь, что music.mp3 лежит рядом с index.html.");
});

// Клик по кнопке = mute/unmute, картинка иконки меняется местами
musicToggle.addEventListener("click", () => {
    music.muted = !music.muted;
    setMutedUI(music.muted);
});

// Перетаскивание ползунка = громкость; если дотащил до 0, считаем что замьючено
volumeSlider.addEventListener("input", () => {
    const value = Number(volumeSlider.value);
    music.volume = value / 100;
    music.muted = value === 0;
    setMutedUI(music.muted);
    updateSliderFill(value);
});

tryAutoplay();

// --- Переключение разделов ---
const sectionsWrapper = document.getElementById("sections-wrapper");
const sectionToggle = document.getElementById("section-toggle");

let isSecondActive = false;
let isAnimating = false;
const ANIMATION_LOCK_MS = 650; // чуть больше длительности transition в CSS

function goToSection(showSecond) {
    if (isAnimating || showSecond === isSecondActive) return;
    isAnimating = true;
    isSecondActive = showSecond;

    sectionsWrapper.classList.toggle("active-second", isSecondActive);
    sectionToggle.classList.toggle("rotated", isSecondActive);
    sectionToggle.setAttribute(
        "aria-label",
        isSecondActive ? "Вернуться назад" : "Открыть следующий раздел"
    );

    setTimeout(() => { isAnimating = false; }, ANIMATION_LOCK_MS);
}

// Клик по стрелке — переключает раздел туда-обратно
sectionToggle.addEventListener("click", () => {
    goToSection(!isSecondActive);
});

// Скролл колёсиком мыши — вниз открывает второй раздел, вверх возвращает на первый
sectionsWrapper.addEventListener(
    "wheel",
    (e) => {
        e.preventDefault();
        if (e.deltaY > 0) {
            goToSection(true);
        } else if (e.deltaY < 0) {
            goToSection(false);
        }
    },
    { passive: false }
);

// Свайп на тач-устройствах — так же вниз/вверх
let touchStartY = null;
const SWIPE_THRESHOLD = 40;

sectionsWrapper.addEventListener(
    "touchstart",
    (e) => {
        touchStartY = e.touches[0].clientY;
    },
    { passive: true }
);

sectionsWrapper.addEventListener(
    "touchend",
    (e) => {
        if (touchStartY === null) return;
        const deltaY = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
            goToSection(deltaY > 0); // свайп вверх (палец идёт вверх) = открыть второй раздел
        }
        touchStartY = null;
    },
    { passive: true }
);

// --- Счётчик просмотров ---
// Namespace/key должны быть уникальными для твоего сайта, чтобы счётчик не путался с чужими.
// Если хочешь сменить — поменяй COUNTER_NAMESPACE на что-то своё.
const COUNTER_NAMESPACE = "takofti-guns-lol-site";
const COUNTER_KEY = "views";
const VISITED_FLAG = "takofti_has_visited";
const viewsCountEl = document.getElementById("views-count");

async function updateViewsCounter() {
    try {
        const alreadyVisited = localStorage.getItem(VISITED_FLAG);
        const url = alreadyVisited
            ? `https://api.countapi.xyz/get/${COUNTER_NAMESPACE}/${COUNTER_KEY}`
            : `https://api.countapi.xyz/hit/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        viewsCountEl.textContent = data.value;

        if (!alreadyVisited) {
            localStorage.setItem(VISITED_FLAG, "1");
        }
    } catch (err) {
        console.error("Не удалось загрузить счётчик просмотров:", err);
        viewsCountEl.textContent = "—";
    }
}

updateViewsCounter();

document.addEventListener("contextmenu", e => e.preventDefault());

document.addEventListener("keydown", function(e) {
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "U")
    ) {
        e.preventDefault();
    }
});

document.addEventListener("copy", e => {
    e.preventDefault();
});
