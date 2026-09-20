(() => {
  "use strict";

  const scroller = document.getElementById("magazine");
  const spreads = Array.from(document.querySelectorAll(".spread"));
  const counter = document.getElementById("spreadCounter");
  const rail = document.getElementById("rail");
  const prevBtn = document.getElementById("prevSpread");
  const nextBtn = document.getElementById("nextSpread");
  const backBtn = document.getElementById("backToCollections");

  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current = 0;
  let vw = scroller.clientWidth;

  // ---- rail ----
  const progress = document.createElement("div");
  progress.className = "rail-progress";
  progress.innerHTML = "<span></span>";
  const progressBar = progress.querySelector("span");
  spreads.forEach((_, i) => {
    const tick = document.createElement("button");
    tick.type = "button";
    tick.className = "rail-tick";
    tick.textContent = ROMAN[i] || i + 1;
    tick.setAttribute("aria-label", "Go to spread " + (i + 1));
    tick.addEventListener("click", () => goTo(i));
    rail.appendChild(tick);
  });
  rail.appendChild(progress);
  const ticks = Array.from(rail.querySelectorAll(".rail-tick"));

  function goTo(i, smooth = true) {
    i = Math.max(0, Math.min(spreads.length - 1, i));
    scroller.scrollTo({
      left: i * vw,
      behavior: smooth && !reduced ? "smooth" : "auto",
    });
  }

  function setActive(i) {
    if (i === current && spreads[i].classList.contains("is-active")) return;
    current = i;
    spreads.forEach((s, j) => s.classList.toggle("is-active", j === i));
    ticks.forEach((t, j) => {
      if (j === i) t.setAttribute("aria-current", "true");
      else t.removeAttribute("aria-current");
    });
    counter.textContent = (ROMAN[i] || i + 1) + " / " + ROMAN[spreads.length - 1];
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === spreads.length - 1;
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));
  backBtn.addEventListener("click", () => goTo(2));

  // ---- wheel: vertical input becomes page turns ----
  scroller.addEventListener(
    "wheel",
    (e) => {
      if (drag.active) return;
      e.preventDefault();
      const dominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vw : 1;
      const delta = dominant * scale;
      if (Math.abs(delta) > 2) {
        scroller.scrollLeft += Math.max(-120, Math.min(120, delta));
      }
    },
    { passive: false }
  );

  // ---- keyboard ----
  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        e.preventDefault();
        goTo(current + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        goTo(current - 1);
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(spreads.length - 1);
        break;
    }
  });

  // ---- drag to turn pages ----
  const drag = { active: false, startX: 0, startLeft: 0, moved: false };
  scroller.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag.active = true;
    drag.moved = false;
    drag.startX = e.clientX;
    drag.startLeft = scroller.scrollLeft;
    scroller.classList.add("dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag.active) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.moved) {
      scroller.scrollLeft = drag.startLeft - dx;
      e.preventDefault();
    }
  });
  window.addEventListener("pointerup", () => {
    if (!drag.active) return;
    drag.active = false;
    scroller.classList.remove("dragging");
    if (drag.moved) {
      const nearest = Math.round(scroller.scrollLeft / vw);
      goTo(nearest);
    }
  });

  // ---- scroll-linked page turn, parallax, reveals ----
  const parallaxEls = Array.from(document.querySelectorAll("[data-depth]")).map((el) => ({
    el,
    spread: el.closest(".spread"),
    depth: parseFloat(el.dataset.depth) || 0,
  }));
  const inners = spreads.map((s) => s.querySelector(".spread-inner"));

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const x = scroller.scrollLeft;
      const ratio = x / vw;
      const nearest = Math.max(0, Math.min(spreads.length - 1, Math.round(ratio)));
      setActive(nearest);
      progressBar.style.width =
        (spreads.length > 1 ? ratio / (spreads.length - 1) : 0) * 100 + "%";

      if (reduced) return;
      spreads.forEach((spread, i) => {
        const off = i - ratio; // -1 .. 1 relative to viewport
        const inner = inners[i];
        if (Math.abs(off) > 1.6) return;
        const tilt = Math.max(-1, Math.min(1, off)) * 7; // page-turn degrees
        inner.style.transform =
          "perspective(1800px) rotateY(" + tilt + "deg) scale(" + (1 - Math.abs(off) * 0.04) + ")";
      });
      for (const item of parallaxEls) {
        const idx = spreads.indexOf(item.spread);
        if (idx < 0) continue;
        const off = Math.max(-1.6, Math.min(1.6, idx - ratio));
        if (Math.abs(off) > 1.4) continue;
        item.el.style.translate = off * item.depth * -60 + "px";
      }
    });
  }
  scroller.addEventListener("scroll", onScroll, { passive: true });

  function onResize() {
    vw = scroller.clientWidth;
    goTo(current, false);
    onScroll();
  }
  window.addEventListener("resize", onResize);

  // ---- i18n: RU / EN ----
  const I18N = {
    title: {
      en: "State Hermitage Museum — Hermitage Review, Issue No. I",
      ru: "Государственный Эрмитаж — Hermitage Review, выпуск I",
    },
    description: {
      en: "An editorial atlas of the State Hermitage Museum: objects, stories, timelines and the global routes that carried them to the Neva. A horizontal, magazine-style reading experience.",
      ru: "Редакционный атлас Государственного Эрмитажа: предметы, истории, хронология и мировые маршруты, приведшие их на Неву. Горизонтальное чтение в духе журнала.",
    },
    ".mast-left": { en: "Hermitage Review", ru: "Эрмитажное обозрение" },
    ".mast-center": {
      en: "The Winter Palace Issue &middot; MMXXVI",
      ru: "Выпуск о Зимнем дворце &middot; MMXXVI",
    },
    // I · cover
    ".cover-kicker": {
      en: "An Editorial Atlas of Collections &middot; Issue No. I",
      ru: "Редакционный атлас коллекций &middot; Выпуск I",
    },
    ".cover-title span:nth-child(1)": { en: "State", ru: "Государственный" },
    ".cover-title-lg": { en: "Hermitage", ru: "Эрмитаж" },
    ".cover-title span:nth-child(3)": { en: "Museum", ru: "Санкт-Петербург" },
    ".cover-deck": {
      en: "Three million objects. Two hundred and sixty years.<br>One winter palace on the Neva.",
      ru: "Три миллиона предметов. Двести шестьдесят лет.<br>Один зимний дворец на Неве.",
    },
    ".plate--a figcaption": {
      en: "Plate 01 &middot; Gold of the steppe, 4th c. BCE",
      ru: "Табл. 01 &middot; Золото степи, IV в. до н. э.",
    },
    ".plate--b figcaption": {
      en: "Plate 02 &middot; Imperial porcelain, cobalt &amp; gilt",
      ru: "Табл. 02 &middot; Императорский фарфор, кобальт и позолота",
    },
    ".annot--clock p": {
      en: "<em>The Peacock Clock</em> &middot; London, c. 1780<br>James Cox, gilded bronze &amp; automata",
      ru: "<em>Часы «Павлин»</em> &middot; Лондон, ок. 1780<br>Джеймс Кокс, золочёная бронза и автоматы",
    },
    ".annot--edge p": {
      en: "Folio I &middot; the bird winds itself at dusk;<br>the empire, once, did not.",
      ru: "Лист I &middot; птица заводится сама на закате;<br>империя — когда-то — нет.",
    },
    ".turn-cue-label": {
      en: "Turn the page — scroll, drag, or press &rarr;",
      ru: "Переверните страницу — прокрутка, перетаскивание или &rarr;",
    },
    // II · the invitation
    ".note-photo-cap": {
      en: "The Pavilion Hall, where the Peacock Clock keeps its silence between hours.",
      ru: "Павильонный зал, где часы «Павлин» хранят молчание между ударами.",
    },
    "#spread-2 .kicker": { en: "Folio II &middot; The Invitation", ru: "Лист II &middot; Приглашение" },
    "#spread-2 h2": {
      en: "A museum that was<br>first a palace, then<br>an empire&rsquo;s wardrobe.",
      ru: "Музей, который был<br>сначала дворцом, а потом —<br>гардеробом империи.",
    },
    ".note-body p:nth-of-type(1)": {
      en: "There is a building on the Neva that was designed to outshine winter itself. Rastrelli raised it in the 1750s &mdash; mint-green, white, gold, baroque to the point of insolence &mdash; and Catherine the Great filled it so completely that her own apartments shrank to make room for pictures.",
      ru: "На Неве стоит здание, спроектированное так, чтобы затмить саму зиму. Растрелли возвёл его в 1750-х — мятно-зелёное с белым и золотом барокко, дерзкое до неприличия, — а Екатерина II наполнила его так плотно, что её собственные покои съёжились, уступая место картинам.",
    },
    ".note-body p:nth-of-type(2)": {
      en: "This issue is not a guidebook. It is a reading of the Hermitage through its objects: the automaton peacock that still turns at the hour, the steppe gold pulled from frozen burial mounds, the canvases that travelled from Parisian salons into revolution and snow.",
      ru: "Этот выпуск — не путеводитель. Это прочтение Эрмитажа через его предметы: заводного павлина, что до сих пор поворачивается в свой час; золото степи, извлечённое из мёрзлых курганов; полотна, проделавшие путь из парижских салонов — сквозь революцию и снег.",
    },
    ".note-body p:nth-of-type(3)": {
      en: "Turn each spread as you would a folio. The pages move sideways here, the way collections do &mdash; across borders, centuries, and the long routes on the map further in.",
      ru: "Переворачивайте каждый разворот, как страницу фолианта. Здесь страницы движутся вбок — как сами коллекции: через границы, века и долгие маршруты на карте в глубине выпуска.",
    },
    ".note-marginalia": {
      en: "<div><b>1764</b><span>Founded with 225 paintings bought in Berlin</span></div><div><b>c. 400</b><span>halls across six linked buildings</span></div><div><b>3M+</b><span>objects, from Scythian gold to Matisse</span></div>",
      ru: "<div><b>1764</b><span>Основан: 225 картин, купленных в Берлине</span></div><div><b>ок. 400</b><span>залов в шести связанных зданиях</span></div><div><b>3 млн+</b><span>предметов: от скифского золота до Матисса</span></div>",
    },
    ".note-sign": { en: "&mdash; The Editors", ru: "&mdash; Редакция" },
    // III · collections
    "#spread-3 .kicker": {
      en: "Folio III &middot; Featured Collections",
      ru: "Лист III &middot; Избранные коллекции",
    },
    "#spread-3 h2": { en: "Six galleries,<br>six obsessions", ru: "Шесть галерей,<br>шесть страстей" },
    ".coll-sub": {
      en: "A working museum collects like a magpie with a state budget. These are the veins of obsession that run through the building.",
      ru: "Действующий музей коллекционирует как сорока с государственным бюджетом. Вот жилы этой одержимости, пронизывающие здание.",
    },
    ".coll-card:nth-child(1) .coll-meta span": { en: "01 &middot; Old Masters", ru: "01 &middot; Старые мастера" },
    ".coll-card:nth-child(1) .coll-meta p": {
      en: "The Dutch rooms hold one of the deepest Rembrandt collections outside Amsterdam &mdash; faces varnished to the colour of candlelight.",
      ru: "Голландские залы хранят одно из самых глубоких собраний Рембрандта за пределами Амстердама — лица под лаком цвета свечного света.",
    },
    ".coll-card:nth-child(2) .coll-meta span": { en: "02 &middot; Antiquity", ru: "02 &middot; Античность" },
    ".coll-card:nth-child(2) .coll-meta p": {
      en: "Red-figure clay from Athenian workshops, still carrying chariots into the dark.",
      ru: "Краснофигурная глина афинских мастерских — колесницы всё так же несутся в темноту.",
    },
    ".coll-card:nth-child(3) .coll-meta span": { en: "03 &middot; Gold of the Steppe", ru: "03 &middot; Золото степи" },
    ".coll-card:nth-child(3) .coll-meta p": {
      en: "Fourth-century BCE gold from the barrows &mdash; horses, stags and warriors worked finer than coinage.",
      ru: "Золото IV в. до н. э. из курганов — кони, олени и воины, проработанные тоньше любой чеканки.",
    },
    ".coll-card:nth-child(4) .coll-meta span": { en: "04 &middot; Modern Colour", ru: "04 &middot; Новый цвет" },
    ".coll-card:nth-child(4) .coll-meta p": {
      en: "The Paris that arrived late and stayed: canvases collected by Moscow merchants, nationalised by revolution, hung by the Neva.",
      ru: "Париж, который приехал поздно и остался: полотна, собранные московскими купцами, национализированные революцией и повешенные на Неве.",
    },
    ".coll-card:nth-child(5) .coll-meta span": { en: "05 &middot; Arms &amp; Armour", ru: "05 &middot; Оружие и доспехи" },
    ".coll-card:nth-child(5) .coll-meta p": {
      en: "Parade steel etched in gilt &mdash; weaponry designed for corridors, never for war.",
      ru: "Парадная сталь с золочёной гравировкой — оружие для коридоров, а не для войны.",
    },
    ".coll-card:nth-child(6) .coll-meta span": { en: "06 &middot; Stone &amp; Fire", ru: "06 &middot; Камень и огонь" },
    ".coll-card:nth-child(6) .coll-meta p": {
      en: "Malachite urns and jasper columns: the Ural mountains, cut into furniture.",
      ru: "Малахитовые вазы и яшмовые колонны: Уральские горы, нарезанные мебелью.",
    },
    // IV · curatorial note
    ".closeup-main figcaption": {
      en: "Studied under raking light: the craquelure is a second painting, made by time.",
      ru: "Изучено в скользящем свете: кракелюр — вторая картина, написанная временем.",
    },
    "#spread-4 .kicker": { en: "Folio IV &middot; Curatorial Note", ru: "Лист IV &middot; Заметка куратора" },
    "#spread-4 h2": {
      en: "Collecting is a form of statecraft",
      ru: "Коллекционирование — форма государственного управления",
    },
    ".closeup-text div p:nth-of-type(1)": {
      en: "In 1764 Catherine bought a Berlin merchant&rsquo;s entire picture cabinet &mdash; 225 canvases, sight unseen &mdash; and stored them in palace rooms the court nicknamed <em>l&rsquo;Ermitage</em>: the hermitage. The museum began, quite literally, as one woman&rsquo;s refusal to be seen reading alone.",
      ru: "В 1764 году Екатерина выкупила весь картинный кабинет берлинского купца — 225 полотен, не глядя, — и разместила его во дворцовых комнатах, которые двор прозвал <em>l&rsquo;Ermitage</em>: «пустынь, уединение». Музей начался, буквально, с того, что одна женщина отказалась читать в одиночестве у всех на виду.",
    },
    ".closeup-text div p:nth-of-type(2)": {
      en: "Every great holding here arrived with an argument attached. The antiquities justified an empire&rsquo;s claim to Greek inheritance; the Old Masters announced that Russia could judge Europe better than Europe judged Russia; the Impressionists, seized and re-hung after 1917, became an accidental avant-garde museum decades before Paris built one.",
      ru: "Каждое большое собрание здесь прибыло со своим аргументом. Античность оправдывала притязания империи на греческое наследие; старые мастера объявляли, что Россия судит Европу лучше, чем Европа судит Россию; импрессионисты, изъятые и перевешанные после 1917-го, стали случайным музеем авангарда — за десятилетия до того, как Париж построил свой.",
    },
    ".pullquote": {
      en: "&ldquo;A palace collects to impress. A museum collects to remember. The Hermitage had the misfortune and the glory of being both.&rdquo;",
      ru: "«Дворец коллекционирует, чтобы впечатлять. Музей коллекционирует, чтобы помнить. Эрмитажу выпало несчастье и слава быть и тем и другим».",
    },
    ".closeup-inset figcaption": {
      en: "Inset &middot; malachite urn, Ural stone, bronze-gilt mounts",
      ru: "Вклейка &middot; малахитовая ваза, уральский камень, золочёная бронза",
    },
    // V · timeline
    "#spread-5 .kicker": { en: "Folio V &middot; The Long Ledger", ru: "Лист V &middot; Долгая ведомость" },
    "#spread-5 h2": {
      en: "Two hundred and sixty years, abridged",
      ru: "Двести шестьдесят лет, кратко",
    },
    ".tl-node:nth-child(2) p": {
      en: "Rastrelli begins the Winter Palace; baroque raised to the scale of an empire.",
      ru: "Растрелли начинает Зимний дворец; барокко в масштабе империи.",
    },
    ".tl-node:nth-child(3) p": {
      en: "Catherine acquires 225 paintings from Berlin. The hermitage begins as a private cabinet.",
      ru: "Екатерина приобретает 225 картин в Берлине. Эрмитаж начинается как частный кабинет.",
    },
    ".tl-node:nth-child(4) p": {
      en: "The Imperial Hermitage opens its doors to the public for the first time.",
      ru: "Императорский Эрмитаж впервые открывает двери публике.",
    },
    ".tl-node:nth-child(5) p": {
      en: "Revolution. The palace is nationalised; private collections are folded into the state&rsquo;s.",
      ru: "Революция. Дворец национализирован; частные коллекции вливаются в государственные.",
    },
    ".tl-node:nth-child(6) p": {
      en: "The siege. A million objects travel east to Sverdlovsk; the building stays and is shelled.",
      ru: "Блокада. Миллион предметов эвакуирован на восток, в Свердловск; здание остаётся и принимает обстрел.",
    },
    ".tl-node:nth-child(7) b": { en: "Today", ru: "Сегодня" },
    ".tl-node:nth-child(7) p": {
      en: "Three million objects, six buildings, and a peacock that still turns on the hour.",
      ru: "Три миллиона предметов, шесть зданий и павлин, который всё ещё поворачивается в свой час.",
    },
    // VI · routes
    "#spread-6 .kicker": {
      en: "Folio VI &middot; Routes &amp; Provenance",
      ru: "Лист VI &middot; Маршруты и провенанс",
    },
    "#spread-6 h2": {
      en: "Everything here travelled.<br>The lines show how.",
      ru: "Здесь всё путешествовало.<br>Линии показывают — как.",
    },
    ".rt-pin--london b": { en: "London &rarr; the Neva", ru: "Лондон &rarr; Нева" },
    ".rt-pin--london p": {
      en: "Mechanic&rsquo;s gold: James Cox&rsquo;s automata, built for export, bought by a prince for an empress.",
      ru: "Золото механиков: автоматы Джеймса Кокса, созданные на экспорт, купленные князем для императрицы.",
    },
    ".rt-pin--berlin b": { en: "Berlin &rarr; the Neva", ru: "Берлин &rarr; Нева" },
    ".rt-pin--berlin p": {
      en: "The founding cargo, 1764: a merchant&rsquo;s picture cabinet purchased whole, unseen.",
      ru: "Основной груз, 1764: картинный кабинет купца, выкупленный целиком, не глядя.",
    },
    ".rt-pin--paris b": { en: "Paris &rarr; the Neva", ru: "Париж &rarr; Нева" },
    ".rt-pin--paris p": {
      en: "Shchukin&rsquo;s Matisses and Morozov&rsquo;s Cézannes &mdash; collected privately, kept publicly by revolution.",
      ru: "Матиссы Щукина и Сезанны Морозова — собраны частным образом, сохранены революцией, открыты всем.",
    },
    ".rt-pin--rome b": { en: "Rome &amp; Athens &rarr; the Neva", ru: "Рим и Афины &rarr; Нева" },
    ".rt-pin--rome p": {
      en: "Cameos, marbles and red-figure clay, bought from Italian cabinets and excavations alike.",
      ru: "Камеи, мрамор и краснофигурная глина — из итальянских кабинетов и археологических раскопок.",
    },
    ".rt-pin--steppe b": { en: "The Steppe &rarr; the Neva", ru: "Степь &rarr; Нева" },
    ".rt-pin--steppe p": {
      en: "Barrow gold unearthed from Siberia to the Black Sea, carried west in tsarist expeditions&rsquo; crates.",
      ru: "Курганное золото от Сибири до Чёрного моря, увезённое на запад в ящиках царских экспедиций.",
    },
    // VII · closing
    "#spread-7 .kicker": { en: "Folio VII &middot; The Last Spread", ru: "Лист VII &middot; Последний разворот" },
    "#spread-7 h2": {
      en: "The next page<br>is the staircase.",
      ru: "Следующая страница —<br>лестница.",
    },
    ".close-deck": {
      en: "This issue ends where every visit begins: at the foot of the Jordan Staircase, gilded, marble, and slightly absurd in the best possible way.",
      ru: "Этот выпуск заканчивается там, где начинается каждый визит: у подножия Иорданской лестницы — позолоченной, мраморной и слегка нелепой в самом лучшем смысле.",
    },
    ".btn--primary": { en: "Plan a visit", ru: "Запланировать визит" },
    ".btn--ghost": { en: "Re-read the collections", ru: "Перечитать коллекции" },
    ".colophon p:nth-of-type(1)": {
      en: "Hermitage Review &middot; Issue No. I &middot; The Winter Palace Issue",
      ru: "Эрмитажное обозрение &middot; Выпуск I &middot; Зимний дворец",
    },
    ".colophon p:nth-of-type(2)": {
      en: "Editorial atlas &middot; plates AI-rendered in the museum&rsquo;s palette of ink, bronze, oxblood &amp; parchment",
      ru: "Редакционный атлас &middot; иллюстрации созданы ИИ в палитре музея: чернила, бронза, бордо и пергамент",
    },
    ".colophon-finis": { en: "&#10087; Finis &#10087;", ru: "&#10087; Конец &#10087;" },
  };

  const langButtons = Array.from(document.querySelectorAll(".lang-toggle button"));
  let lang = localStorage.getItem("hermitage-lang");
  if (lang !== "ru" && lang !== "en") {
    lang = navigator.language && navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    document.title = I18N.title[next];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", I18N.description[next]);
    for (const key of Object.keys(I18N)) {
      if (key === "title" || key === "description") continue;
      const el = document.querySelector(key);
      if (el) el.innerHTML = I18N[key][next];
    }
    langButtons.forEach((b) => {
      const on = b.dataset.lang === next;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    localStorage.setItem("hermitage-lang", next);
  }

  langButtons.forEach((b) => b.addEventListener("click", () => applyLang(b.dataset.lang)));
  applyLang(lang);

  // ---- init ----
  setActive(0);
  spreads[0].classList.add("is-active");
  onScroll();
})();
