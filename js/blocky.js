(function () {
  function library() {
    return (window.MG_LIBRARY && MG_LIBRARY.characters) || [];
  }

  function findCharacter(id) {
    return library().find(function (item) { return item.id === id; }) || null;
  }

  function mount(root, profile, go) {
    let raf = 0;
    let running = false;
    const body = MGUi.shell(root, {
      title: "Blocky Multiplication",
      eyebrow: "Grow to clear the course",
      profile: profile,
      back: function () { running = false; cancelAnimationFrame(raf); go("menu"); }
    });

    function picker() {
      running = false;
      cancelAnimationFrame(raf);
      const chosen = findCharacter(profile.blocky.characterId);
      body.innerHTML = '<p>Search for someone to play as, then answer times tables so you can grow blocks and clear the walls.</p>' +
        '<p class="note">Best score ' + (profile.blocky.highScore || 0) + (chosen ? " · playing as " + chosen.title : "") + "</p>" +
        '<label class="field">Search<input class="search-input" type="search" placeholder="Try dragon, robot or unicorn" autocomplete="off"></label>' +
        '<p class="search-msg" aria-live="polite"></p><div class="search-grid"></div>' +
        '<div class="row-actions"><button type="button" class="btn primary play" ' + (chosen ? "" : "disabled") + ">Start</button></div>";
      const input = body.querySelector(".search-input");
      const message = body.querySelector(".search-msg");
      const grid = body.querySelector(".search-grid");
      const play = body.querySelector(".play");
      function draw(results) {
        grid.innerHTML = "";
        results.forEach(function (item) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "search-card" + (item.id === profile.blocky.characterId ? " on" : "");
          button.innerHTML = '<img src="' + MGUi.esc(item.src) + '" alt=""><span>' + MGUi.esc(item.title) + "</span>";
          button.addEventListener("click", function () {
            profile.blocky.characterId = item.id;
            MGStorage.update(profile.id, function (draft) { draft.blocky.characterId = item.id; });
            play.disabled = false;
            draw(results);
          });
          grid.appendChild(button);
        });
      }
      input.addEventListener("input", function () {
        const found = MGUi.searchCharacters(library(), input.value);
        if (found.status === "short") {
          message.textContent = "Type a word to search the picture library.";
          grid.innerHTML = "";
          return;
        }
        if (found.status === "none") {
          message.textContent = "Nothing matched that word. Try another word, like dragon, robot or unicorn.";
          grid.innerHTML = "";
          return;
        }
        message.textContent = found.results.length + " pictures.";
        draw(found.results);
      });
      if (chosen) {
        message.textContent = "Your character is ready. You can search for a different one.";
        draw([chosen]);
      }
      play.addEventListener("click", function () {
        const character = findCharacter(profile.blocky.characterId);
        if (character) run(character);
      });
    }

    function run(character) {
      running = false;
      cancelAnimationFrame(raf);
      const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
      const tables = MGQuestions.tablesForLevel(level);
      body.innerHTML = '<div class="round-meta"><span class="q-banner">Answer, then tap Grow</span><span class="score-pill">0</span></div>' +
        '<canvas class="stage-canvas" aria-label="Block course"></canvas>' +
        '<div class="qbox"></div><div class="dash-controls">' +
        '<button type="button" class="btn primary grow">Grow</button><button type="button" class="btn ghost shrink">Shrink</button></div>';
      const canvas = body.querySelector("canvas");
      const ctx = canvas.getContext("2d");
      const banner = body.querySelector(".q-banner");
      const scoreEl = body.querySelector(".score-pill");
      const hero = new Image();
      hero.src = character.src;
      const colours = ["#e15d3a", "#2f7dd1", "#f0b429", "#2e9b5b", "#7d5cc6", "#14919b"];
      let blocks = 1;
      let distance = 0;
      let armed = false;
      let correctCount = 0;
      let alive = true;
      let last = performance.now();
      let seed = (Date.now() ^ 99) >>> 0;
      const obstacles = [];
      let nextAt = 680;
      running = true;

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.max(320, rect.width) * dpr;
        canvas.height = Math.max(360, rect.height) * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      function view() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        return { w: canvas.width / dpr, h: canvas.height / dpr };
      }

      function ask() {
        seed = (seed + 13) >>> 0;
        const question = MGQuestions.makeTimesQuestion(level, seed, tables);
        banner.textContent = armed ? "Tap Grow before the wall" : "Answer to grow";
        MGUi.fillQuestion(body.querySelector(".qbox"), question, function (result) {
          if (!alive) return;
          if (result.correct) {
            armed = true;
            correctCount += 1;
            banner.textContent = "Correct. Tap Grow. " + question.worked;
          } else {
            banner.textContent = "Good try. " + question.worked;
          }
          setTimeout(function () { if (alive) ask(); }, 350);
        });
      }

      function grow() {
        if (!armed || blocks >= 6) return;
        blocks += 1;
        armed = false;
        banner.textContent = "You grew to " + blocks + (blocks === 1 ? " block." : " blocks.");
      }
      function shrink() {
        blocks = Math.max(1, blocks - 1);
      }
      body.querySelector(".grow").addEventListener("click", grow);
      body.querySelector(".shrink").addEventListener("click", shrink);
      canvas.addEventListener("pointerdown", grow);
      function onKey(event) {
        if (event.key === "ArrowUp" || event.key === " ") { event.preventDefault(); grow(); }
        if (event.key === "ArrowDown") { event.preventDefault(); shrink(); }
      }
      window.addEventListener("keydown", onKey);

      function spawn() {
        const hard = distance > 800 ? 3 : 2;
        const height = 1 + Math.floor(Math.random() * hard);
        const tunnel = distance > 500 && Math.random() < 0.3;
        obstacles.push({ x: distance + view().w + 80, height: height, tunnel: tunnel });
        nextAt = 460 + Math.random() * 180;
      }
      spawn();

      function over() {
        if (!alive) return;
        alive = false;
        running = false;
        const score = Math.floor(distance / 8) + correctCount * 20;
        MGStorage.update(profile.id, function (draft) {
          draft.blocky.highScore = Math.max(draft.blocky.highScore, score);
          draft.blocky.characterId = character.id;
          MGStorage.earn(draft, correctCount);
        });
        const best = MGStorage.get(profile.id).blocky.highScore;
        window.removeEventListener("keydown", onKey);
        body.insertAdjacentHTML("beforeend", '<div class="modal"><div class="summary"><h2>The blocks stopped</h2><p>' + banner.textContent + '</p><p class="big-score">' + score + "</p><p>Best score " + best + "</p>" +
          '<div class="row-actions"><button type="button" class="btn primary again">Play again</button><button type="button" class="btn ghost to-menu">Back to games</button></div></div></div>');
        body.querySelector(".again").addEventListener("click", function () { run(character); });
        body.querySelector(".to-menu").addEventListener("click", function () { go("menu"); });
      }

      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        const box = view();
        const speed = 120 + Math.min(180, distance / 12) + level * 8;
        if (document.visibilityState !== "hidden") {
          distance += speed * dt;
          nextAt -= speed * dt;
          if (nextAt <= 0) spawn();
          const playerX = 130;
          const bh = 42;
          const ground = box.h - 70;
          obstacles.forEach(function (item) {
            const screen = item.x - distance;
            if (item.done) return;
            if (screen < playerX + 36 && screen + 46 > playerX) {
              item.done = true;
              if (item.tunnel && blocks > item.height) {
                banner.textContent = "Too tall for the gap. Shrink next time.";
                over();
              } else if (!item.tunnel && blocks < item.height) {
                banner.textContent = "The wall was taller than your blocks.";
                over();
              }
            }
          });
        }
        draw();
        scoreEl.textContent = String(Math.floor(distance / 8) + correctCount * 20);
        if (running) raf = requestAnimationFrame(frame);
      }

      function draw() {
        const box = view();
        const bh = 42;
        const ground = box.h - 70;
        ctx.clearRect(0, 0, box.w, box.h);
        ctx.fillStyle = "#bfe6fb";
        ctx.fillRect(0, 0, box.w, box.h);
        ctx.fillStyle = "#d8efbf";
        ctx.fillRect(0, ground, box.w, box.h - ground);
        ctx.fillStyle = "#7dba6a";
        ctx.fillRect(0, ground, box.w, 8);
        obstacles.forEach(function (item) {
          const screen = item.x - distance;
          if (screen < -80 || screen > box.w + 80) return;
          ctx.fillStyle = item.tunnel ? "#6b4a32" : "#c47b4a";
          if (item.tunnel) {
            ctx.fillRect(screen, 0, 48, ground - item.height * bh);
          } else {
            ctx.fillRect(screen, ground - item.height * bh, 48, item.height * bh);
          }
        });
        for (let i = 0; i < blocks; i += 1) {
          ctx.fillStyle = colours[i % colours.length];
          ctx.fillRect(108, ground - (i + 1) * bh, 48, bh - 4);
        }
        const top = ground - blocks * bh - 64;
        if (hero.complete && hero.naturalWidth) ctx.drawImage(hero, 96, top, 72, 64);
        else {
          ctx.fillStyle = "#1d2a24";
          ctx.fillRect(112, top + 10, 40, 40);
        }
      }

      ask();
      raf = requestAnimationFrame(frame);
      window.addEventListener("resize", resize);
    }

    picker();
    return {
      destroy: function () {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
  }

  window.MGBlocky = { mount: mount };
})();
