(() => {
"use strict";

/* ========================= データ定義 ========================= */

const TODAY = new Date(2026, 3, 10); // 中央書類管理局における「本日」(固定)
TODAY.setHours(0, 0, 0, 0);

const SURNAMES = ["佐藤","鈴木","高橋","田中","伊藤","渡辺","山本","中村","小林","加藤",
  "吉田","山田","佐々木","山口","松本","井上","木村","林","斎藤","清水"];
const GIVEN_NAMES = ["一郎","二郎","三郎","花子","幸子","直樹","恵子","浩二","美穂","健一",
  "由美","誠","愛子","和也","真理","亮","千尋","大輔","久美子","俊介"];

const AVATAR_COLORS = ["#4a90d9","#e94b4b","#f5a623","#59b463","#a15fd1","#4bb6c9"];
const AVATAR_SHAPES = ["circle","square","triangle","hex"];
const AVATAR_ACCESSORIES = ["none","glasses","hat"];

const SEAL_COLORS = ["#b0342d","#8e2de2","#1c6f5c","#c9761d","#2c4ea3"];
const SEAL_SHAPES = ["circle","square","hex"];
const SEAL_DOTS = [1,2,3];

const RULES = [
  { id: "expiry",    day: 1, text: "有効期限が本日より前の身分証は却下する。" },
  { id: "nameMatch", day: 2, text: "申請書と身分証の氏名が一致しない場合は却下する。" },
  { id: "photoMatch",day: 3, text: "申請書と身分証の写真が一致しない場合は却下する。" },
  { id: "seal",      day: 4, text: "身分証の印影が本日の公式印影と一致しない場合は却下する。" },
  { id: "idFormat",  day: 5, text: "番号が「英字2桁+数字5桁」の形式でない場合は却下する。" },
  { id: "age",       day: 6, text: "生年月日から算出した満年齢が18歳未満の場合は却下する。" },
];

const FIELD_FLAG_MAP = {
  expiry: ["id-expiry"],
  nameMatch: ["app-name", "id-name"],
  photoMatch: ["app-photo", "id-photo"],
  seal: ["id-seal"],
  idFormat: ["id-number"],
  age: ["id-birth"],
};

/* ========================= 汎用ユーティリティ ========================= */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function pickOtherThan(arr, exclude) {
  const opts = arr.filter(v => v !== exclude);
  return opts.length ? pick(opts) : exclude;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}
function dateToStr(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
function ageAt(birthdate, atDate) {
  let age = atDate.getFullYear() - birthdate.getFullYear();
  const m = atDate.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && atDate.getDate() < birthdate.getDate())) age--;
  return age;
}

/* ========================= ランダム要素生成 ========================= */

function randomName() {
  const surname = pick(SURNAMES);
  const given = pick(GIVEN_NAMES);
  return { surname, given, full: surname + given };
}
function randomBirthdate(minAge, maxAge) {
  const age = randInt(minAge, maxAge);
  let d = new Date(TODAY);
  d.setFullYear(d.getFullYear() - age);
  d = addDays(d, randInt(-150, 150));
  if (d > TODAY) d = addDays(d, -365);
  return d;
}

function randomExpiry(valid) {
  return valid ? addDays(TODAY, randInt(30, 730)) : addDays(TODAY, randInt(-730, -1));
}

function randomAvatar() {
  return { shape: pick(AVATAR_SHAPES), color: pick(AVATAR_COLORS), accessory: pick(AVATAR_ACCESSORIES) };
}
function avatarsEqual(a, b) { return a.shape === b.shape && a.color === b.color && a.accessory === b.accessory; }
function mutateAvatar(base) {
  const prop = pick(["shape", "color", "accessory"]);
  const next = { ...base };
  if (prop === "shape") next.shape = pickOtherThan(AVATAR_SHAPES, base.shape);
  if (prop === "color") next.color = pickOtherThan(AVATAR_COLORS, base.color);
  if (prop === "accessory") next.accessory = pickOtherThan(AVATAR_ACCESSORIES, base.accessory);
  return next;
}

function randomSeal() {
  return { shape: pick(SEAL_SHAPES), color: pick(SEAL_COLORS), dots: pick(SEAL_DOTS) };
}
function sealsEqual(a, b) { return a.shape === b.shape && a.color === b.color && a.dots === b.dots; }
function mutateSeal(base) {
  const prop = pick(["shape", "color", "dots"]);
  const next = { ...base };
  if (prop === "shape") next.shape = pickOtherThan(SEAL_SHAPES, base.shape);
  if (prop === "color") next.color = pickOtherThan(SEAL_COLORS, base.color);
  if (prop === "dots") next.dots = pickOtherThan(SEAL_DOTS, base.dots);
  return next;
}

function randomIdNumber(valid) {
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letters = pick(LETTERS.split("")) + pick(LETTERS.split(""));
  const digits = String(randInt(0, 99999)).padStart(5, "0");
  if (valid) return letters + digits;
  const variant = randInt(0, 3);
  if (variant === 0) return letters.toLowerCase() + digits;
  if (variant === 1) return letters + digits.slice(0, 4);
  if (variant === 2) return letters + digits.slice(0, 3) + "-" + digits.slice(3);
  return digits + letters;
}

/* ========================= SVG描画 ========================= */

function shapeFill(shape, color) {
  if (shape === "circle") return `<circle cx="50" cy="50" r="42" fill="${color}"/>`;
  if (shape === "square") return `<rect x="10" y="10" width="80" height="80" rx="10" fill="${color}"/>`;
  if (shape === "triangle") return `<polygon points="50,8 92,88 8,88" fill="${color}"/>`;
  return `<polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="${color}"/>`;
}
function shapeOutline(shape, color) {
  if (shape === "circle") return `<circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="6"/>`;
  if (shape === "square") return `<rect x="12" y="12" width="76" height="76" rx="6" fill="none" stroke="${color}" stroke-width="6"/>`;
  return `<polygon points="50,8 88,29 88,71 50,92 12,71 12,29" fill="none" stroke="${color}" stroke-width="6"/>`;
}

function svgAvatar(av) {
  let extra = "";
  if (av.accessory === "glasses") {
    extra = `<circle cx="35" cy="46" r="10" fill="none" stroke="#222" stroke-width="4"/>
      <circle cx="65" cy="46" r="10" fill="none" stroke="#222" stroke-width="4"/>
      <line x1="45" y1="46" x2="55" y2="46" stroke="#222" stroke-width="4"/>`;
  } else if (av.accessory === "hat") {
    extra = `<polygon points="50,2 78,24 22,24" fill="#333"/><rect x="18" y="22" width="64" height="7" fill="#333"/>`;
  }
  const eyes = av.accessory === "glasses" ? "" :
    `<circle cx="35" cy="46" r="5" fill="#222"/><circle cx="65" cy="46" r="5" fill="#222"/>`;
  return `<svg viewBox="0 0 100 100">${shapeFill(av.shape, av.color)}${eyes}<path d="M32 66 Q50 78 68 66" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>${extra}</svg>`;
}

function svgSeal(seal) {
  const n = seal.dots;
  let dots = "";
  for (let i = 0; i < n; i++) {
    const cx = 50 + (i - (n - 1) / 2) * 18;
    dots += `<circle cx="${cx}" cy="50" r="6" fill="${seal.color}"/>`;
  }
  return `<svg viewBox="0 0 100 100">${shapeOutline(seal.shape, seal.color)}${dots}</svg>`;
}

/* ========================= 書類生成 ========================= */

function buildValidDocument(officialSeal) {
  const name = randomName();
  const photo = randomAvatar();
  const birthdate = randomBirthdate(19, 50);
  const expiry = randomExpiry(true);
  const idNumber = randomIdNumber(true);
  const seal = officialSeal ? { ...officialSeal } : randomSeal();
  return {
    app: { name: name.full, photo: { ...photo } },
    idcard: { name: name.full, birthdate, expiry, idNumber, photo: { ...photo }, seal },
    violations: [],
  };
}

function applyViolation(doc, ruleId, officialSeal) {
  if (ruleId === "expiry") doc.idcard.expiry = randomExpiry(false);
  else if (ruleId === "nameMatch") {
    const target = Math.random() < 0.5 ? "app" : "idcard";
    const other = target === "app" ? doc.idcard.name : doc.app.name;
    let altered;
    do { altered = randomName().full; } while (altered === other);
    doc[target].name = altered;
  } else if (ruleId === "photoMatch") {
    if (Math.random() < 0.5) doc.app.photo = mutateAvatar(doc.app.photo);
    else doc.idcard.photo = mutateAvatar(doc.idcard.photo);
  } else if (ruleId === "seal") {
    doc.idcard.seal = mutateSeal(officialSeal || doc.idcard.seal);
  } else if (ruleId === "idFormat") {
    doc.idcard.idNumber = randomIdNumber(false);
  } else if (ruleId === "age") {
    doc.idcard.birthdate = randomBirthdate(10, 17);
  }
  doc.violations.push(ruleId);
}

function generateDocument(activeRuleIds, officialSeal) {
  const doc = buildValidDocument(officialSeal);
  let violationCount;
  const roll = Math.random();
  if (activeRuleIds.length === 1) {
    violationCount = roll < 0.5 ? 0 : 1;
  } else {
    if (roll < 0.48) violationCount = 0;
    else if (roll < 0.85 || activeRuleIds.length < 2) violationCount = 1;
    else violationCount = 2;
  }
  violationCount = Math.min(violationCount, activeRuleIds.length);
  const pool = [...activeRuleIds].sort(() => Math.random() - 0.5).slice(0, violationCount);
  pool.forEach(ruleId => applyViolation(doc, ruleId, officialSeal));
  doc.correctAnswer = doc.violations.length > 0 ? "deny" : "approve";
  return doc;
}

/* ========================= ゲーム状態 ========================= */

const BEST_SCORE_KEY = "inspectorDeluxe_bestScore";
const BEST_DAY_KEY = "inspectorDeluxe_bestDay";
const SAVE_KEY = "inspectorDeluxe_save";
const NORMAL_LAST_DAY = 6;

const game = {
  day: 1,
  mode: "normal", // "normal" | "endless"
  totalScore: 0,
  officialSeal: null,
  pendingEnding: false,
};

let dayState = null;

function activeRulesForDay(day) { return RULES.filter(r => r.day <= day); }
function dayParams(day) {
  let timeLimit;
  if (day <= 6) timeLimit = 45 + day * 5;
  else timeLimit = Math.max(40, 75 - (day - 6) * 4);
  const quota = 6 + day * 2;
  return { timeLimit, quota };
}

function loadBest() {
  return {
    score: parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10),
    day: parseInt(localStorage.getItem(BEST_DAY_KEY) || "1", 10),
  };
}
function saveBestIfBetter(score, day) {
  const best = loadBest();
  if (score > best.score) localStorage.setItem(BEST_SCORE_KEY, String(score));
  if (day > best.day) localStorage.setItem(BEST_DAY_KEY, String(day));
}

function saveProgress(day) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ day, totalScore: game.totalScore, mode: game.mode }));
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.day !== "number") return null;
    return data;
  } catch (e) {
    return null;
  }
}
function clearProgress() {
  localStorage.removeItem(SAVE_KEY);
}

/* ========================= DOM参照 ========================= */

const el = id => document.getElementById(id);
const screens = {
  title: el("title-screen"),
  howto: el("howto-screen"),
  dayIntro: el("day-intro-screen"),
  game: el("game-screen"),
  summary: el("summary-screen"),
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

/* ========================= 画面描画 ========================= */

function renderRuleList(container, rules) {
  container.innerHTML = "";
  rules.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.text;
    container.appendChild(li);
  });
}

function clearFieldFlags() {
  document.querySelectorAll(".field-flag").forEach(n => n.classList.remove("field-flag"));
}

function renderDocument(doc) {
  clearFieldFlags();
  el("app-name").textContent = doc.app.name;
  el("app-photo").innerHTML = svgAvatar(doc.app.photo);
  el("id-name").textContent = doc.idcard.name;
  el("id-birth").textContent = dateToStr(doc.idcard.birthdate);
  el("id-expiry").textContent = dateToStr(doc.idcard.expiry);
  el("id-number").textContent = doc.idcard.idNumber;
  el("id-photo").innerHTML = svgAvatar(doc.idcard.photo);
  el("id-seal").innerHTML = svgSeal(doc.idcard.seal);
}

function flagViolatedFields(doc) {
  doc.violations.forEach(ruleId => {
    (FIELD_FLAG_MAP[ruleId] || []).forEach(fieldId => {
      const node = el(fieldId);
      if (node) node.classList.add("field-flag");
    });
  });
}

/* ========================= フロー制御 ========================= */

function modeLabel(mode) { return mode === "endless" ? "エンドレス" : "通常"; }

function goTitle() {
  const best = loadBest();
  el("best-score-val").textContent = best.score;
  el("best-day-val").textContent = best.day;

  const save = loadProgress();
  const continueBtn = el("continue-btn");
  if (save) {
    continueBtn.classList.remove("hidden");
    continueBtn.textContent = `続きから(DAY${save.day}・${modeLabel(save.mode)}モード)`;
  } else {
    continueBtn.classList.add("hidden");
  }

  showScreen("title");
}

function resetGameState(mode, startDayNum) {
  game.mode = mode;
  game.day = startDayNum;
  game.totalScore = 0;
  game.officialSeal = null;
  game.pendingEnding = false;
}

function startNewGame(mode) {
  const save = loadProgress();
  if (save && !confirm(`保存中の記録(DAY${save.day}・${modeLabel(save.mode)}モード)があります。新しく始めると上書きされますが、よろしいですか？`)) {
    return;
  }
  clearProgress();
  resetGameState(mode, mode === "endless" ? NORMAL_LAST_DAY + 1 : 1);
  startDay(game.day);
}

function resumeGame() {
  const save = loadProgress();
  if (!save) return;
  game.mode = save.mode;
  game.day = save.day;
  game.totalScore = save.totalScore;
  game.officialSeal = null;
  game.pendingEnding = false;
  startDay(game.day);
}

function chooseEndlessContinue() {
  game.mode = "endless";
  game.day = NORMAL_LAST_DAY + 1;
  game.pendingEnding = false;
  saveProgress(game.day);
  startDay(game.day);
}

function finishNormalRun() {
  clearProgress();
  goTitle();
}

function startDay(day) {
  game.day = day;
  const activeRules = activeRulesForDay(day);
  const params = dayParams(day);
  if (day >= 4) game.officialSeal = randomSeal();

  el("intro-day-num").textContent = day + (game.mode === "endless" ? " (エンドレス)" : "");
  const newRule = RULES.find(r => r.day === day);
  const introBox = el("intro-new-rule");
  if (newRule) {
    introBox.classList.remove("hidden");
    el("intro-new-rule-text").textContent = newRule.text;
  } else {
    introBox.classList.add("hidden");
  }
  renderRuleList(el("intro-rule-list"), activeRules);

  const sealBox = el("intro-seal-box");
  if (day >= 4) {
    sealBox.classList.remove("hidden");
    el("intro-official-seal").innerHTML = svgSeal(game.officialSeal);
  } else {
    sealBox.classList.add("hidden");
  }

  el("intro-time-limit").textContent = params.timeLimit;
  el("intro-quota").textContent = params.quota;

  showScreen("dayIntro");
}

function beginDayPlay() {
  const day = game.day;
  const activeRules = activeRulesForDay(day);
  const params = dayParams(day);

  dayState = {
    activeRuleIds: activeRules.map(r => r.id),
    quota: params.quota,
    timeLimit: params.timeLimit,
    timeLeft: params.timeLimit,
    processed: 0,
    correct: 0,
    mistakes: 0,
    score: 0,
    answered: false,
    ended: false,
    currentDoc: null,
    timerId: null,
  };

  el("hud-day").textContent = day + (game.mode === "endless" ? "(EX)" : "");
  el("hud-quota").textContent = params.quota;
  el("hud-processed").textContent = 0;
  el("hud-score").textContent = 0;
  el("hud-mistakes").textContent = 0;
  el("hud-time-num").textContent = params.timeLimit;
  el("timer-bar").style.width = "100%";

  renderRuleList(el("active-rule-list"), activeRules);
  const sidebarSeal = el("official-seal-sidebar");
  if (day >= 4) {
    sidebarSeal.classList.remove("hidden");
    el("sidebar-official-seal").innerHTML = svgSeal(game.officialSeal);
  } else {
    sidebarSeal.classList.add("hidden");
  }

  showScreen("game");
  setStampButtonsEnabled(true);
  spawnDocument();

  dayState.timerId = setInterval(() => {
    dayState.timeLeft -= 0.1;
    if (dayState.timeLeft <= 0) {
      dayState.timeLeft = 0;
      updateTimerUI();
      clearInterval(dayState.timerId);
      setStampButtonsEnabled(false);
      dayState.ended = true;
      setTimeout(endDay, 500);
      return;
    }
    updateTimerUI();
  }, 100);
}

function updateTimerUI() {
  el("hud-time-num").textContent = Math.ceil(dayState.timeLeft);
  const pct = Math.max(0, (dayState.timeLeft / dayState.timeLimit) * 100);
  el("timer-bar").style.width = pct + "%";
}

function setStampButtonsEnabled(enabled) {
  el("approve-btn").disabled = !enabled;
  el("deny-btn").disabled = !enabled;
}

function spawnDocument() {
  if (dayState.ended) return;
  dayState.answered = false;
  dayState.currentDoc = generateDocument(dayState.activeRuleIds, game.officialSeal);
  renderDocument(dayState.currentDoc);
  const banner = el("feedback-banner");
  banner.classList.remove("show", "correct", "wrong");
  banner.classList.add("hidden");
  setStampButtonsEnabled(true);
}

function handleStamp(choice) {
  if (!dayState || dayState.answered || dayState.ended) return;
  dayState.answered = true;
  setStampButtonsEnabled(false);

  const doc = dayState.currentDoc;
  const isCorrect = choice === doc.correctAnswer;
  dayState.processed++;

  if (isCorrect) {
    dayState.correct++;
    dayState.score += 10;
  } else {
    dayState.mistakes++;
    dayState.score = Math.max(0, dayState.score - 5);
    flagViolatedFields(doc);
  }

  el("hud-processed").textContent = dayState.processed;
  el("hud-score").textContent = dayState.score;
  el("hud-mistakes").textContent = dayState.mistakes;

  const banner = el("feedback-banner");
  banner.textContent = isCorrect ? "正解" : "ミス";
  banner.classList.remove("hidden", "show", "correct", "wrong");
  void banner.offsetWidth;
  banner.classList.add("show", isCorrect ? "correct" : "wrong");

  setTimeout(() => {
    if (dayState.ended) return;
    spawnDocument();
  }, isCorrect ? 700 : 1300);
}

function bossComment(accuracy, mistakes) {
  let msg;
  if (accuracy >= 95) msg = "素晴らしい仕事だ。この調子で頼む。";
  else if (accuracy >= 80) msg = "まずまずだな。次はもっと集中してくれ。";
  else if (accuracy >= 60) msg = "ミスが目立つ。規則をもう一度確認しろ。";
  else msg = "話にならない…書類を見直せ。";
  if (mistakes >= 6) msg += "本部から正式な注意勧告が出ている。";
  return msg;
}

function endDay() {
  if (dayState.timerId) clearInterval(dayState.timerId);
  const accuracy = dayState.processed > 0 ? Math.round((dayState.correct / dayState.processed) * 100) : 0;
  game.totalScore += dayState.score;

  const isEnding = game.mode === "normal" && game.day === NORMAL_LAST_DAY;
  game.pendingEnding = isEnding;

  el("summary-day-num").textContent = game.day + (game.mode === "endless" ? " (エンドレス)" : "");
  let comment = bossComment(accuracy, dayState.mistakes);
  if (isEnding) comment += " ひとまず通常業務はここまでだ。このまま終えるか、エンドレスモードでさらに続けるか選んでくれ。";
  el("summary-boss-comment").textContent = comment;
  el("summary-processed").textContent = dayState.processed;
  el("summary-correct").textContent = dayState.correct;
  el("summary-mistakes").textContent = dayState.mistakes;
  el("summary-accuracy").textContent = accuracy + "%";
  el("summary-score").textContent = dayState.score;
  el("summary-total-score").textContent = game.totalScore;

  saveBestIfBetter(game.totalScore, game.day);

  if (isEnding) {
    clearProgress();
    el("next-day-btn").textContent = "エンドレスモードに挑戦";
    el("quit-btn").textContent = "終了して退勤する";
  } else {
    saveProgress(game.day + 1);
    el("next-day-btn").textContent = "翌日へ";
    el("quit-btn").textContent = "本日で退勤する";
  }

  showScreen("summary");
}

function nextDay() {
  startDay(game.day + 1);
}

/* ========================= イベント登録 ========================= */

el("start-btn").addEventListener("click", () => startNewGame("normal"));
el("endless-btn").addEventListener("click", () => startNewGame("endless"));
el("continue-btn").addEventListener("click", resumeGame);
el("howto-btn").addEventListener("click", () => showScreen("howto"));
el("back-title-btn").addEventListener("click", goTitle);
el("day-start-btn").addEventListener("click", beginDayPlay);
el("approve-btn").addEventListener("click", () => handleStamp("approve"));
el("deny-btn").addEventListener("click", () => handleStamp("deny"));
el("next-day-btn").addEventListener("click", () => {
  if (game.pendingEnding) chooseEndlessContinue();
  else nextDay();
});
el("quit-btn").addEventListener("click", () => {
  if (game.pendingEnding) finishNormalRun();
  else goTitle();
});

document.addEventListener("keydown", (e) => {
  if (screens.game.classList.contains("hidden")) return;
  if (e.key === "ArrowLeft" || e.key === "a") handleStamp("approve");
  if (e.key === "ArrowRight" || e.key === "d") handleStamp("deny");
});

goTitle();
})();
