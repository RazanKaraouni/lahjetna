const ACCENTS = [
    { id: "beirut", name: "وسط بيروت", src: "assets/beirut.mp4" },
    { id: "ashrafieh", name: "الأشرفية", src: "assets/ashrafieh.mp4" },
    { id: "tareek", name: "طريق الجديدة", src: "assets/tareek-jdeede.mp4" },
    { id: "trablos", name: "طرابلس", src: "assets/trablos.mp4" },
    { id: "saida", name: "صيدا", src: "assets/saida.mp4" },
    { id: "srifa", name: "صريفا", src: "assets/srifa.mp4" },
    { id: "yatar", name: "ياطر", src: "assets/yatar.mp4" },
    { id: "baalbeck", name: "بعلبك", src: "assets/baalbeck.mp4" },
    { id: "hermel", name: "الهرمل", src: "assets/hermel.mp4" },
    { id: "kaserwen", name: "كسروان", src: "assets/kaserwen.mp4" },
    { id: "rashia", name: "راشيا", src: "assets/rashia.mp4" },
    { id: "labaya", name: "لبايا", src: "assets/labaya.mp4" }
];

const DISTRACTORS = [
    { id: "akkar", name: "عكار" },
    { id: "chouf", name: "الشوف" },
    { id: "aley", name: "عاليه" },
    { id: "maten", name: "المتن" },
    { id: "zahle", name: "زحلة" },
    { id: "sahmar", name: "سحمر" }
];

function isAllowedMediaSrc(src) {
    if (typeof src !== "string") return false;
    const trimmed = src.trim();
    if (!trimmed || trimmed.includes("\\") || trimmed.includes("..")) return false;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
    if (trimmed.startsWith("//") || trimmed.startsWith("/")) return false;
    return /^assets\/[A-Za-z0-9._-]+\.(mp4|mp3|wav|m4a|ogg)$/.test(trimmed);
}

function shuffle(list) {
    const items = list.slice();
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }
    return items;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + String(secs).padStart(2, "0");
}

function resultCopy(score, total) {
    if (total === 0) {
        return { title: "ما في أسئلة", message: "ما لقينا تسجيلات جاهزة للعب." };
    }
    const ratio = score / total;
    if (ratio === 1) {
        return { title: "لهججي أصيل!", message: "عرفت كل اللكنات. أذنك ذهب." };
    }
    if (ratio >= 0.7) {
        return { title: "ممتاز!", message: "واضح إنك متعوّد تسمع لهجات لبنان." };
    }
    if (ratio >= 0.4) {
        return { title: "مش بطّال", message: "قرّب، جرّب مرة تانية بعد ما تسمع شوي من الخريطة." };
    }
    return { title: "كمّل سماع", message: "استكشف الخريطة واسمع اللكنات، بعدين ارجع احزر." };
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

document.addEventListener("DOMContentLoaded", () => {
    const roundsEl = document.getElementById("rounds");
    const scoreText = document.getElementById("scoreText");
    const progressText = document.getElementById("progressText");
    const progressBar = document.getElementById("progressBar");
    const summaryEl = document.getElementById("guessSummary");
    const resultTitle = document.getElementById("resultTitle");
    const resultScore = document.getElementById("resultScore");
    const resultMessage = document.getElementById("resultMessage");
    const replayBtn = document.getElementById("replayBtn");

    const clips = [];
    let answers = [];

    function pauseOthers(exceptClip) {
        clips.forEach((clip) => {
            if (clip !== exceptClip) clip.pause();
        });
    }

    function updateScore() {
        const answered = answers.filter((item) => item != null).length;
        const score = answers.filter((item) => item === true).length;
        const total = answers.length;
        scoreText.textContent = "النقاط: " + score + " / " + total;
        progressText.textContent = answered === total
            ? "خلصت كل التسجيلات"
            : "جاوبت " + answered + " من " + total;
        progressBar.style.width = total ? ((answered / total) * 100) + "%" : "0%";

        if (answered === total && total > 0) {
            const copy = resultCopy(score, total);
            resultTitle.textContent = copy.title;
            resultScore.textContent = score + " / " + total;
            resultMessage.textContent = copy.message;
            summaryEl.hidden = false;
        } else {
            summaryEl.hidden = true;
        }
    }

    function bindPlayer(round, clip, playBtn) {
        let seeking = false;
        const seekBar = round.querySelector(".guess-seek");
        const currentTimeEl = round.querySelector(".guess-current");
        const durationTimeEl = round.querySelector(".guess-duration");

        function setPlaying(playing) {
            round.classList.toggle("is-playing", playing);
            playBtn.classList.toggle("is-playing", playing);
            playBtn.setAttribute("aria-label", playing ? "إيقاف التسجيل" : "تشغيل التسجيل");
            playBtn.replaceChildren();
            const icon = el("i", playing ? "fas fa-pause" : "fas fa-play");
            icon.setAttribute("aria-hidden", "true");
            playBtn.appendChild(icon);
        }

        playBtn.addEventListener("click", () => {
            if (clip.paused) {
                pauseOthers(clip);
                clip.play().catch(() => {});
            } else {
                clip.pause();
            }
        });

        round.querySelector(".guess-replay").addEventListener("click", () => {
            pauseOthers(clip);
            clip.currentTime = 0;
            clip.play().catch(() => {});
        });

        clip.addEventListener("play", () => setPlaying(true));
        clip.addEventListener("pause", () => setPlaying(false));
        clip.addEventListener("ended", () => setPlaying(false));
        clip.addEventListener("loadedmetadata", () => {
            durationTimeEl.textContent = formatTime(clip.duration);
        });
        clip.addEventListener("timeupdate", () => {
            if (seeking || !clip.duration) return;
            seekBar.value = String((clip.currentTime / clip.duration) * 100);
            currentTimeEl.textContent = formatTime(clip.currentTime);
        });
        seekBar.addEventListener("input", () => {
            seeking = true;
            if (!clip.duration) return;
            clip.currentTime = (Number(seekBar.value) / 100) * clip.duration;
            currentTimeEl.textContent = formatTime(clip.currentTime);
        });
        seekBar.addEventListener("change", () => {
            seeking = false;
        });
    }

    function createRound(accent, roundIndex) {
        const round = el("article", "guess-card guess-round");
        round.dataset.roundIndex = String(roundIndex);

        const heading = el("p", "guess-prompt", "التسجيل " + (roundIndex + 1));
        const player = el("div", "guess-player");
        const clip = document.createElement("video");
        clip.playsInline = true;
        clip.preload = "metadata";
        if (isAllowedMediaSrc(accent.src)) clip.src = accent.src;

        const playBtn = el("button", "guess-play");
        playBtn.type = "button";
        playBtn.setAttribute("aria-label", "تشغيل التسجيل");
        const playIcon = el("i", "fas fa-play");
        playIcon.setAttribute("aria-hidden", "true");
        playBtn.appendChild(playIcon);

        const waves = el("div", "guess-waves");
        waves.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 5; i += 1) waves.appendChild(document.createElement("span"));

        const timeRow = el("div", "guess-time-row");
        const currentTimeEl = el("span", "guess-current", "0:00");
        const seekBar = document.createElement("input");
        seekBar.type = "range";
        seekBar.className = "guess-seek";
        seekBar.min = "0";
        seekBar.max = "100";
        seekBar.value = "0";
        seekBar.step = "0.1";
        seekBar.setAttribute("aria-label", "تقدم التسجيل");
        const durationTimeEl = el("span", "guess-duration", "0:00");
        timeRow.append(currentTimeEl, seekBar, durationTimeEl);

        const replayBtn = el("button", "guess-replay");
        replayBtn.type = "button";
        const replayIcon = el("i", "fas fa-rotate-right");
        replayIcon.setAttribute("aria-hidden", "true");
        replayBtn.append(replayIcon, document.createTextNode(" إعادة السماع"));

        player.append(clip, playBtn, waves, timeRow, replayBtn);

        const choicesEl = el("div", "guess-choices");
        choicesEl.setAttribute("role", "group");
        choicesEl.setAttribute("aria-label", "خيارات اللكنة");
        const pool = ACCENTS.concat(DISTRACTORS).filter((item) => item.id !== accent.id);
        const options = shuffle([accent].concat(shuffle(pool).slice(0, 3)));
        options.forEach((option) => {
            const btn = el("button", "guess-choice", option.name);
            btn.type = "button";
            btn.dataset.optionId = option.id;
            btn.addEventListener("click", () => {
                if (answers[roundIndex] != null) return;
                clip.pause();
                const correct = option.id === accent.id;
                answers[roundIndex] = correct;
                Array.from(choicesEl.children).forEach((choiceBtn) => {
                    choiceBtn.disabled = true;
                    if (choiceBtn.dataset.optionId === accent.id) {
                        choiceBtn.classList.add("is-correct");
                    }
                });
                if (!correct) btn.classList.add("is-wrong");
                feedback.textContent = correct
                    ? "صحيح! هيدي لكنة " + accent.name
                    : "غلط… الصح " + accent.name;
                feedback.className = "guess-feedback " + (correct ? "is-correct" : "is-wrong");
                updateScore();
            });
            choicesEl.appendChild(btn);
        });

        const feedback = el("p", "guess-feedback");
        feedback.setAttribute("role", "status");
        round.append(heading, player, choicesEl, feedback);
        clips.push(clip);
        bindPlayer(round, clip, playBtn);
        return round;
    }

    function renderGame() {
        clips.length = 0;
        answers = ACCENTS.map(() => null);
        roundsEl.replaceChildren();
        summaryEl.hidden = true;
        ACCENTS.forEach((accent, index) => {
            roundsEl.appendChild(createRound(accent, index));
        });
        updateScore();
    }

    replayBtn.addEventListener("click", () => {
        pauseOthers(null);
        renderGame();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const subscribeForm = document.getElementById("footerSubscribe");
    const subscribeMsg = document.getElementById("footerSubscribeMsg");
    subscribeForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = document.getElementById("footerEmail");
        if (email instanceof HTMLInputElement) email.value = "";
        if (subscribeMsg) subscribeMsg.hidden = false;
    });

    renderGame();
});
