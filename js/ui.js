/* Shared drawing and question controls. */
(function () {
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function starRow(filled, total) {
    const count = total || 3;
    let html = '<span class="star-row" aria-label="' + filled + " of " + count + ' stars">';
    for (let i = 0; i < count; i += 1) {
      html += '<svg class="star' + (i < filled ? " on" : "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8L6.7 19l1-6L3.4 8.7l6-.9z"/></svg>';
    }
    html += "</span>";
    return html;
  }

  function clockSvg(hour, minute) {
    const h = ((hour % 12) + minute / 60) * 30;
    const m = minute * 6;
    function hand(angle, length, width) {
      const rad = angle * Math.PI / 180;
      const x = 100 + Math.sin(rad) * length;
      const y = 100 - Math.cos(rad) * length;
      return '<line x1="100" y1="100" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#1d2a24" stroke-width="' + width + '" stroke-linecap="round"/>';
    }
    let ticks = "";
    for (let n = 1; n <= 12; n += 1) {
      const rad = n * 30 * Math.PI / 180;
      const x = 100 + Math.sin(rad) * 68;
      const y = 100 - Math.cos(rad) * 68;
      ticks += '<text x="' + x.toFixed(1) + '" y="' + (y + 6).toFixed(1) + '" text-anchor="middle" font-size="16" font-family="Nunito, sans-serif" fill="#1d2a24">' + n + "</text>";
    }
    return '<svg class="clock" viewBox="0 0 200 200" role="img" aria-label="Clock">' +
      '<circle cx="100" cy="100" r="92" fill="#fffaf3" stroke="#1d2a24" stroke-width="6"/>' +
      '<circle cx="100" cy="100" r="4" fill="#1d2a24"/>' +
      ticks + hand(h, 46, 7) + hand(m, 68, 4) + "</svg>";
  }

  function visualHtml(visual) {
    if (!visual) return "";
    if (visual.type === "clock") return '<div class="visual">' + clockSvg(visual.hour, visual.minute) + "</div>";
    if (visual.type === "money") {
      const coins = visual.items.map(function (item) {
        return '<figure class="coin"><img src="' + esc(item.src) + '" alt="' + esc(item.alt) + '"><figcaption>' + esc(item.alt) + "</figcaption></figure>";
      }).join("");
      return '<div class="visual money-row">' + coins + "</div>";
    }
    if (visual.type === "skip") {
      const parts = visual.parts.map(function (part) {
        return '<span class="skip-num' + (part === "?" ? " missing" : "") + '">' + esc(part) + "</span>";
      }).join("");
      return '<div class="visual skip-row">' + parts + "</div>";
    }
    return "";
  }

  function portrait(profile, className) {
    const avatar = profile.avatar || MGStorage.blankProfile().avatar;
    const klass = className || "portrait";
    let inner;
    if (avatar.mode === "animal") {
      const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
      const found = animals.find(function (animal) { return animal.id === avatar.animal; }) || animals[0];
      inner = found
        ? '<img class="' + klass + '" src="' + esc(found.src) + '" alt="' + esc(found.name) + '">'
        : '<span class="' + klass + ' portrait-fallback"></span>';
    } else inner = '<span class="' + klass + ' portrait-svg">' + MGAvatar.svg(avatar.custom) + "</span>";
    const wearing = profile.outfit && profile.outfit.wearing;
    const extra = MGAvatar.accessories ? MGAvatar.accessories(wearing) : "";
    if (!extra) return inner;
    return '<span class="portrait-wrap">' + inner + extra + "</span>";
  }

  function loadScript(src) {
    const existing = document.querySelector('script[data-mg="' + src + '"]');
    if (existing && existing.dataset.ready === "yes") return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const script = existing || document.createElement("script");
      script.src = src;
      script.dataset.mg = src;
      script.onload = function () {
        script.dataset.ready = "yes";
        resolve();
      };
      script.onerror = function () {
        reject(new Error("Could not load " + src));
      };
      if (!existing) document.body.appendChild(script);
    });
  }

  function shell(root, options) {
    const player = options.profile ? portrait(options.profile, "portrait tiny") : "";
    const who = options.profile ? '<div class="who">' + player + "<span>" + esc(MGStorage.firstName(options.profile.name)) + "</span></div>" : "";
    root.innerHTML = '<section class="screen">' +
      '<header class="topbar">' +
      (options.back ? '<button type="button" class="btn ghost back-btn">Back</button>' : '<span></span>') +
      "<div><p class=\"eyebrow\">" + esc(options.eyebrow || "Maths Genius") + "</p><h1>" + esc(options.title) + "</h1></div>" +
      who + "</header>" +
      '<div class="screen-body"></div></section>';
    const back = root.querySelector(".back-btn");
    if (back) back.addEventListener("click", options.back);
    return root.querySelector(".screen-body");
  }

  function fillQuestion(container, question, onPick) {
    container.innerHTML = "";
    const title = document.createElement("h2");
    title.className = "prompt";
    title.textContent = question.prompt;
    container.appendChild(title);
    if (question.visual) {
      const wrap = document.createElement("div");
      wrap.innerHTML = visualHtml(question.visual);
      while (wrap.firstChild) container.appendChild(wrap.firstChild);
    }
    let locked = false;
    function choose(value, button) {
      if (locked) return;
      locked = true;
      const correct = MGQuestions.matches(question, value);
      container.querySelectorAll("button").forEach(function (item) { item.disabled = true; });
      if (button) button.classList.add(correct ? "good" : "bad");
      if (correct) {
        const pop = document.createElement("div");
        pop.className = "cheer";
        pop.innerHTML = '<img src="assets/characters/star-1.svg" alt="">';
        document.body.appendChild(pop);
        window.setTimeout(function () { pop.remove(); }, 900);
      }
      if (!correct) {
        container.querySelectorAll("button").forEach(function (item) {
          if (MGQuestions.matches(question, item.dataset.value || item.textContent)) item.classList.add("good");
        });
      }
      onPick({ correct: correct, value: value });
    }
    if (question.choices && question.choices.length) {
      const grid = document.createElement("div");
      grid.className = "choices";
      question.choices.forEach(function (choice) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "choice";
        button.textContent = choice;
        button.dataset.value = choice;
        button.addEventListener("click", function () { choose(choice, button); });
        grid.appendChild(button);
      });
      container.appendChild(grid);
      return;
    }
    const form = document.createElement("form");
    form.className = "typed";
    form.innerHTML = '<label class="sr-only" for="answer-box">Your answer</label>' +
      '<input id="answer-box" class="answer-box" inputmode="numeric" autocomplete="off" maxlength="8">' +
      '<div class="pad"></div>' +
      '<button type="submit" class="btn primary wide">Check</button>';
    const input = form.querySelector("input");
    const pad = form.querySelector(".pad");
    "1234567890".split("").forEach(function (digit) {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key";
      key.textContent = digit;
      key.addEventListener("click", function () {
        if (input.value.length < 8) input.value += digit;
        input.focus();
      });
      pad.appendChild(key);
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "key";
    clear.textContent = "Clear";
    clear.addEventListener("click", function () { input.value = ""; });
    pad.appendChild(clear);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      choose(input.value, null);
    });
    container.appendChild(form);
    input.focus();
  }

  function searchCharacters(list, query) {
    return MGQuestions.searchCharacters(list, query);
  }

  window.MGUi = {
    esc: esc,
    starRow: starRow,
    clockSvg: clockSvg,
    visualHtml: visualHtml,
    portrait: portrait,
    loadScript: loadScript,
    shell: shell,
    fillQuestion: fillQuestion,
    searchCharacters: searchCharacters
  };
})();
