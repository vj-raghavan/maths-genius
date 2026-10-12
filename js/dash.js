(function () {
  function animals() {
    const all = (window.MG_LIBRARY && MG_LIBRARY.animals) || [];
    const wanted = ["kangaroo", "koala", "dog", "cat", "horse", "penguin", "fox"];
    const picked = wanted.map(function (id) {
      return all.find(function (animal) { return animal.id === id; });
    }).filter(Boolean);
    return picked.length ? picked : all.slice(0, 7);
  }

  function mount(root, profile, go) {
    let raf = 0;
    let running = false;
    const body = MGUi.shell(root, {
      title: "Animal Dash",
      eyebrow: "Three lanes",
      profile: profile,
      back: function () { stop(); go("menu"); }
    });

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function choose() {
      stop();
      const list = animals();
      const current = list.some(function (animal) { return animal.id === profile.dash.animal; }) ? profile.dash.animal : (list[0] && list[0].id);
      body.innerHTML = '<p>Choose an animal. Switch lanes, jump and duck. Run through the lane with the right answer for bonus coins.</p>' +
        '<p class="note">Best score ' + (profile.dash.highScore || 0) + '</p><div class="animal-grid"></div>';
      const grid = body.querySelector(".animal-grid");
      list.forEach(function (animal) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "animal-pick" + (animal.id === current ? " on" : "");
        button.innerHTML = '<img src="' + MGUi.esc(animal.src) + '" alt=""><span>' + MGUi.esc(animal.name) + "</span>";
        button.addEventListener("click", function () {
          profile.dash.animal = animal.id;
          MGStorage.update(profile.id, function (draft) { draft.dash.animal = animal.id; });
          play(animal);
        });
        grid.appendChild(button);
      });
      if (!list.length) body.innerHTML += "<p>Animal pictures are still loading. You can still race with a coloured runner.</p>";
    }

    function play(animal) {
      stop();
      body.innerHTML = '<div class="round-meta"><span class="q-banner">Get ready</span><span class="score-pill">0</span></div>' +
        '<canvas class="stage-canvas" aria-label="Animal Dash track"></canvas>' +
        '<div class="dash-controls"><button type="button" class="btn ghost" data-act="left">Left</button>' +
        '<button type="button" class="btn secondary" data-act="jump">Jump</button>' +
        '<button type="button" class="btn secondary" data-act="duck">Duck</button>' +
        '<button type="button" class="btn ghost" data-act="right">Right</button></div>';
      const canvas = body.querySelector("canvas");
      const banner = body.querySelector(".q-banner");
      const scoreEl = body.querySelector(".score-pill");
      const ctx = canvas.getContext("2d");
      const images = {};
      function load(key, src) {
        if (!src) return;
        const image = new Image();
        image.src = src;
        images[key] = image;
      }
      load("hero", animal.src);
      const money = (window.MG_LIBRARY && MG_LIBRARY.money) || [];
      const coin = money.find(function (item) { return item.kind === "coin"; });
      if (coin) load("coin", coin.src);
      const props = (window.MG_LIBRARY && MG_LIBRARY.props) || {};
      if (props.rock) load("rock", props.rock);
      if (props.log) load("log", props.log);
      if (props.bird) load("bird", props.bird);

      const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
      const player = { lane: 1, jump: 0, duck: 0 };
      const objects = [];
      let distance = 0;
      let coins = 0;
      let spawnIn = 0.4;
      let gateIn = 5;
      let question = null;
      let alive = true;
      let last = performance.now();
      let seed = (Date.now() ^ 12345) >>> 0;
      running = true;

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.max(320, rect.width) * dpr;
        canvas.height = Math.max(420, rect.height) * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();

      function size() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        return { w: canvas.width / dpr, h: canvas.height / dpr };
      }

      function project(lane, z) {
        const box = size();
        const horizon = box.h * 0.28;
        const base = box.h * 0.82;
        const y = horizon + (base - horizon) * z;
        const spread = 24 + box.w * 0.22 * z;
        return { x: box.w / 2 + (lane - 1) * spread, y: y, s: 0.25 + 0.85 * z, box: box };
      }

      function jump() {
        if (player.jump > 0 || player.duck > 0) return;
        player.jump = 0.01;
      }
      function duck() {
        if (player.jump > 0) return;
        player.duck = 0.55;
      }
      function move(dir) {
        player.lane = Math.max(0, Math.min(2, player.lane + dir));
      }

      function onKey(event) {
        const key = event.key;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].indexOf(key) >= 0) event.preventDefault();
        if (!alive) return;
        if (key === "ArrowLeft" || key === "a") move(-1);
        if (key === "ArrowRight" || key === "d") move(1);
        if (key === "ArrowUp" || key === "w" || key === " ") jump();
        if (key === "ArrowDown" || key === "s") duck();
      }
      window.addEventListener("keydown", onKey);
      body.querySelectorAll("[data-act]").forEach(function (button) {
        button.addEventListener("click", function () {
          const act = button.dataset.act;
          if (act === "left") move(-1);
          if (act === "right") move(1);
          if (act === "jump") jump();
          if (act === "duck") duck();
        });
      });
      let touchX = 0;
      let touchY = 0;
      canvas.addEventListener("touchstart", function (event) {
        touchX = event.changedTouches[0].clientX;
        touchY = event.changedTouches[0].clientY;
      }, { passive: true });
      canvas.addEventListener("touchend", function (event) {
        const dx = event.changedTouches[0].clientX - touchX;
        const dy = event.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
        else if (dy < 0) jump();
        else duck();
      }, { passive: true });

      function spawnObstacle() {
        const kind = ["low", "high", "block"][Math.floor(Math.random() * 3)];
        const lane = Math.floor(Math.random() * 3);
        objects.push({ z: 0.05, lane: lane, kind: kind });
      }
      function spawnCoin() {
        objects.push({ z: 0.05, lane: Math.floor(Math.random() * 3), kind: "coin" });
      }
      function spawnGate() {
        seed = (seed + 17) >>> 0;
        question = MGQuestions.makeTimesQuestion(level, seed);
        const others = question.choices.filter(function (choice) { return choice !== question.answer; });
        const answers = [question.answer, others[0] || "0", others[1] || "1"];
        for (let i = answers.length - 1; i > 0; i -= 1) {
          const swap = Math.floor(Math.random() * (i + 1));
          const hold = answers[i];
          answers[i] = answers[swap];
          answers[swap] = hold;
        }
        objects.push({ z: 0.05, kind: "gate", answers: answers, resolved: false });
        banner.textContent = question.prompt;
      }

      function crash() {
        if (!alive) return;
        alive = false;
        running = false;
        const score = Math.floor(distance * 12) + coins;
        MGStorage.update(profile.id, function (draft) {
          draft.dash.highScore = Math.max(draft.dash.highScore, score);
          draft.dash.animal = animal.id;
        });
        const best = MGStorage.get(profile.id).dash.highScore;
        window.removeEventListener("keydown", onKey);
        body.insertAdjacentHTML("beforeend", '<div class="modal"><div class="summary"><h2>Run finished</h2><p class="big-score">' + score + "</p><p>Best score " + best + "</p>" +
          '<div class="row-actions"><button type="button" class="btn primary again">Run again</button><button type="button" class="btn ghost to-menu">Back to games</button></div></div></div>');
        body.querySelector(".again").addEventListener("click", function () { play(animal); });
        body.querySelector(".to-menu").addEventListener("click", function () { go("menu"); });
      }

      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        if (document.visibilityState !== "hidden") {
          const speed = 0.34 + Math.min(0.55, distance * 0.015) + level * 0.02;
          distance += dt * speed;
          if (player.jump > 0) {
            player.jump += dt / 0.7;
            if (player.jump >= 1) player.jump = 0;
          }
          if (player.duck > 0) player.duck = Math.max(0, player.duck - dt);
          spawnIn -= dt;
          gateIn -= dt;
          if (gateIn <= 0) {
            spawnGate();
            gateIn = 9;
            spawnIn = 1.3;
          } else if (spawnIn <= 0) {
            if (Math.random() < 0.3) spawnCoin();
            else spawnObstacle();
            spawnIn = Math.max(0.55, 1.15 - distance * 0.01);
          }
          objects.forEach(function (object) { object.z += dt * speed; });
          objects.forEach(function (object) {
            if (object.z < 0.9 || object.z > 1.08) return;
            if (object.kind === "gate" && !object.resolved) {
              object.resolved = true;
              const picked = object.answers[player.lane];
              if (MGQuestions.matches(question, picked)) {
                coins += 8;
                banner.textContent = "Bonus coins. " + question.worked;
              } else banner.textContent = "Not this time. " + question.worked;
              return;
            }
            if (object.kind === "coin" && !object.taken && object.lane === player.lane) {
              object.taken = true;
              coins += 1;
            }
            if (object.kind === "low" || object.kind === "high" || object.kind === "block") {
              if (object.lane !== player.lane || object.hit) return;
              const jumping = player.jump > 0.12 && player.jump < 0.88;
              if (object.kind === "low" && jumping) return;
              if (object.kind === "high" && player.duck > 0 && !jumping) return;
              object.hit = true;
              crash();
            }
          });
          for (let i = objects.length - 1; i >= 0; i -= 1) {
            if (objects[i].z > 1.2 || objects[i].taken) objects.splice(i, 1);
          }
        }
        draw();
        scoreEl.textContent = String(Math.floor(distance * 12) + coins);
        if (running) raf = requestAnimationFrame(frame);
      }

      function draw() {
        const box = size();
        ctx.clearRect(0, 0, box.w, box.h);
        const sky = ctx.createLinearGradient(0, 0, 0, box.h);
        sky.addColorStop(0, "#9fd4f5");
        sky.addColorStop(1, "#e7f6d8");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, box.w, box.h);
        ctx.fillStyle = "#c6a15a";
        ctx.beginPath();
        ctx.moveTo(box.w * 0.5, box.h * 0.28);
        ctx.lineTo(box.w * 0.08, box.h);
        ctx.lineTo(box.w * 0.92, box.h);
        ctx.closePath();
        ctx.fill();
        [0, 1, 2].forEach(function (lane) {
          const near = project(lane, 1);
          const far = project(lane, 0.02);
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(far.x, far.y);
          ctx.lineTo(near.x, box.h);
          ctx.stroke();
        });
        objects.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (object) {
          if (object.kind === "gate") {
            object.answers.forEach(function (answer, lane) {
              const point = project(lane, object.z);
              ctx.fillStyle = "#fffaf3";
              ctx.fillRect(point.x - 28 * point.s, point.y - 70 * point.s, 56 * point.s, 36 * point.s);
              ctx.fillStyle = "#1d2a24";
              ctx.font = "700 " + Math.round(18 * point.s) + "px Nunito, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(String(answer), point.x, point.y - 46 * point.s);
            });
            return;
          }
          const point = project(object.lane, object.z);
          const lift = 70 * point.s;
          if (object.kind === "coin" && !object.taken) {
            if (images.coin && images.coin.complete) ctx.drawImage(images.coin, point.x - 18 * point.s, point.y - lift, 36 * point.s, 36 * point.s);
            else {
              ctx.fillStyle = "#f0b429";
              ctx.beginPath();
              ctx.arc(point.x, point.y - lift, 14 * point.s, 0, Math.PI * 2);
              ctx.fill();
            }
            return;
          }
          const key = object.kind === "high" ? "bird" : object.kind === "low" ? "log" : "rock";
          const image = images[key];
          const w = 54 * point.s;
          const h = 40 * point.s;
          const y = object.kind === "high" ? point.y - 120 * point.s : point.y - h;
          if (image && image.complete && image.naturalWidth) ctx.drawImage(image, point.x - w / 2, y, w, h);
          else {
            ctx.fillStyle = object.kind === "high" ? "#3d6ea8" : object.kind === "low" ? "#8a5a32" : "#7d756c";
            ctx.fillRect(point.x - w / 2, y, w, h);
          }
        });
        const feet = project(player.lane, 1);
        const jumpLift = player.jump > 0 ? Math.sin(player.jump * Math.PI) * 90 : 0;
        const duckScale = player.duck > 0 ? 0.6 : 1;
        const pw = 78;
        const ph = 78 * duckScale;
        if (images.hero && images.hero.complete) ctx.drawImage(images.hero, feet.x - pw / 2, feet.y - ph - jumpLift, pw, ph);
        else {
          ctx.fillStyle = "#0e7c66";
          ctx.fillRect(feet.x - 24, feet.y - 60 - jumpLift, 48, 60 * duckScale);
        }
      }

      raf = requestAnimationFrame(frame);
      const onResize = function () { resize(); };
      window.addEventListener("resize", onResize);
      const previousDestroy = stop;
      stop = function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
        previousDestroy();
      };
    }

    choose();
    return { destroy: function () { stop(); } };
  }

  window.MGDash = { mount: mount };
})();
