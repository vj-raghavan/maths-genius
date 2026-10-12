(function () {
  function mount(root, profile, go) {
    const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
    const tables = MGQuestions.tablesForLevel(level);
    const chosen = tables.slice(0, Math.min(3, tables.length));
    const body = MGUi.shell(root, {
      title: "Speed Escape",
      eyebrow: "Stay ahead",
      profile: profile,
      back: function () { go("menu"); }
    });
    let raf = 0;
    let running = false;

    function foxSrc() {
      const animals = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
      const fox = animals.find(function (animal) { return animal.id === "fox"; }) || animals[0];
      return fox ? fox.src : "";
    }

    function setup() {
      running = false;
      cancelAnimationFrame(raf);
      body.innerHTML = '<div class="panel"><p>Answer times tables quickly to stay ahead of the fox. The fox runs faster as time goes on. Choose which tables to practise.</p>' +
        '<div class="chip-row tables"></div><p class="note best"></p><button type="button" class="btn primary start">Start the escape</button></div>';
      const best = profile.escape || { bestScore: 0, bestTime: 0 };
      body.querySelector(".best").textContent = "Best score " + best.bestScore + " · longest escape " + best.bestTime + " seconds";
      const selected = new Set(chosen);
      const wrap = body.querySelector(".tables");
      tables.forEach(function (table) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chip" + (selected.has(table) ? " on" : "");
        button.textContent = table + " times table";
        button.addEventListener("click", function () {
          if (selected.has(table)) selected.delete(table);
          else selected.add(table);
          if (!selected.size) selected.add(table);
          button.classList.toggle("on", selected.has(table));
        });
        wrap.appendChild(button);
      });
      body.querySelector(".start").addEventListener("click", function () {
        play(Array.from(selected));
      });
    }

    function play(useTables) {
      const path = (window.MG_LIBRARY && MG_LIBRARY.props && MG_LIBRARY.props.path) || "";
      body.innerHTML = '<div class="race"></div><div class="lead-track" aria-hidden="true"><span></span></div>' +
        '<div class="round-meta"><span class="time">0 seconds</span><span class="score-pill">0 points</span></div>' +
        '<div class="qbox"></div><p class="feedback" aria-live="polite"></p>';
      const race = body.querySelector(".race");
      if (path) race.style.backgroundImage = "url('" + path.replace(/'/g, "") + "')";
      const runner = document.createElement("div");
      runner.className = "runner";
      runner.innerHTML = MGUi.portrait(profile, "portrait");
      runner.style.position = "absolute";
      const chaser = document.createElement("img");
      chaser.className = "chaser";
      chaser.alt = "Fox";
      chaser.src = foxSrc();
      race.appendChild(chaser);
      race.appendChild(runner);
      const bar = body.querySelector(".lead-track span");
      const timeEl = body.querySelector(".time");
      const scoreEl = body.querySelector(".score-pill");
      const feedback = body.querySelector(".feedback");
      let lead = 0.62;
      let score = 0;
      let elapsed = 0;
      let askedAt = performance.now();
      let alive = true;
      let last = performance.now();
      let seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
      running = true;

      function place() {
        const runnerLeft = 12 + lead * 58;
        runner.style.left = runnerLeft + "%";
        chaser.style.left = Math.max(2, runnerLeft - 22) + "%";
        bar.style.width = Math.round(lead * 100) + "%";
      }

      function nextQuestion() {
        seed = (seed + 1) >>> 0;
        const question = MGQuestions.makeTimesQuestion(level, seed, useTables);
        askedAt = performance.now();
        MGUi.fillQuestion(body.querySelector(".qbox"), question, function (result) {
          if (!alive) return;
          const quick = Math.max(0, 1 - (performance.now() - askedAt) / 4000);
          if (result.correct) {
            lead = Math.min(0.96, lead + 0.13 + quick * 0.08);
            score += 10 + Math.round(quick * 10);
            feedback.textContent = quick > 0.6 ? "Quick! You surge ahead." : "Correct. Keep going.";
            feedback.className = "feedback good";
          } else {
            lead = Math.max(0.04, lead - 0.16);
            feedback.textContent = "Good try. " + question.worked;
            feedback.className = "feedback bad";
          }
          scoreEl.textContent = score + " points";
          if (lead >= 0.95) {
            score += 25;
            lead = 0.68;
            feedback.textContent = "You pulled ahead. The fox speeds up.";
          }
          place();
          nextQuestion();
        });
      }

      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (document.visibilityState === "hidden") {
          raf = requestAnimationFrame(frame);
          return;
        }
        elapsed += dt;
        const creep = 0.035 + elapsed * 0.004 + level * 0.004;
        lead -= creep * dt;
        timeEl.textContent = Math.floor(elapsed) + " seconds";
        place();
        if (lead <= 0.03) {
          alive = false;
          running = false;
          finish(score, elapsed);
          return;
        }
        raf = requestAnimationFrame(frame);
      }

      place();
      nextQuestion();
      raf = requestAnimationFrame(frame);
    }

    function finish(score, elapsed) {
      cancelAnimationFrame(raf);
      const seconds = Math.floor(elapsed);
      MGStorage.update(profile.id, function (draft) {
        draft.escape.bestScore = Math.max(draft.escape.bestScore, score);
        draft.escape.bestTime = Math.max(draft.escape.bestTime, seconds);
      });
      const saved = MGStorage.get(profile.id);
      body.innerHTML = '<div class="summary"><h2>The fox caught up</h2><p class="big-score">' + score + " points</p>" +
        "<p>You stayed ahead for " + seconds + " seconds.</p>" +
        "<p>Best score " + saved.escape.bestScore + " · longest escape " + saved.escape.bestTime + " seconds.</p>" +
        '<div class="row-actions"><button type="button" class="btn primary again">Try again</button><button type="button" class="btn ghost to-menu">Back to games</button></div></div>';
      body.querySelector(".again").addEventListener("click", function () {
        mount(root, MGStorage.get(profile.id), go);
      });
      body.querySelector(".to-menu").addEventListener("click", function () { go("menu"); });
    }

    setup();
    return { destroy: function () { running = false; cancelAnimationFrame(raf); } };
  }

  window.MGEscape = { mount: mount };
})();
