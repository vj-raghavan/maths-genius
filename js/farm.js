(function () {
  const CROPS = {
    carrot: { name: "Carrot", cost: 4, reward: 8 },
    tomato: { name: "Tomato", cost: 6, reward: 12 },
    strawberry: { name: "Strawberry", cost: 8, reward: 16 },
    sunflower: { name: "Sunflower", cost: 5, reward: 11 },
    corn: { name: "Corn", cost: 7, reward: 15 }
  };
  const STAGE = ["Seed", "Sprout", "Plant", "Ready to harvest"];

  function props() {
    return (window.MG_LIBRARY && MG_LIBRARY.props) || {};
  }

  function cropSrc(id) {
    const crops = (window.MG_LIBRARY && MG_LIBRARY.crops) || [];
    const found = crops.find(function (crop) { return crop.id === id; });
    return found ? found.src : "";
  }

  function mount(root, profile, go) {
    let timer = 0;
    const body = MGUi.shell(root, {
      title: "Grow a Farm",
      eyebrow: "Plant, water, harvest",
      profile: profile,
      back: function () { go("menu"); }
    });
    body.innerHTML = '<div class="farm-layout"><div><div class="coin-count"></div><p class="note">Water a plant by answering a question. It then grows: seed, sprout, plant, ready to harvest. Growth keeps going if you leave this page.</p><div class="plot-grid"></div></div><aside class="panel shop"></aside></div><div class="gate"></div>';
    const grid = body.querySelector(".plot-grid");
    const shop = body.querySelector(".shop");
    const coins = body.querySelector(".coin-count");
    const gate = body.querySelector(".gate");

    function fresh() {
      const current = MGStorage.get(profile.id);
      current.farm = MGStorage.advanceFarm(current.farm, Date.now());
      MGStorage.save(current);
      return current;
    }

    function picture(plot) {
      const library = props();
      if (plot.stage === 0 && library.seed) return { src: library.seed, className: "sprout", alt: "Seed" };
      if (plot.stage === 1 && library.sprout) return { src: library.sprout, className: "sprout", alt: "Sprout" };
      const src = cropSrc(plot.crop);
      return { src: src, className: "", alt: CROPS[plot.crop].name };
    }

    function progress(plot) {
      if (!plot.crop || plot.stage >= 3 || !plot.waterAt) return 0;
      const need = MGStorage.STAGE_MS[plot.stage] || 1;
      return Math.max(0, Math.min(1, (Date.now() - plot.waterAt) / need));
    }

    let askToken = 0;
    function ask(prompt, onYes) {
      const token = ++askToken;
      const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
      const question = MGQuestions.generateRound(level, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, 1)[0];
      gate.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="panel"><p class="note"></p><div class="qbox"></div><p class="feedback" aria-live="polite"></p><button type="button" class="btn ghost close-gate">Not now</button></div></div>';
      gate.querySelector(".note").textContent = prompt;
      const feedback = gate.querySelector(".feedback");
      gate.querySelector(".close-gate").addEventListener("click", function () { askToken += 1; gate.innerHTML = ""; });
      MGUi.fillQuestion(gate.querySelector(".qbox"), question, function (result) {
        if (result.correct) {
          feedback.textContent = "Correct. " + question.worked;
          feedback.className = "feedback good";
          onYes();
          setTimeout(function () { if (token !== askToken) return; gate.innerHTML = ""; render(); }, 700);
        } else {
          feedback.textContent = "Good try. " + question.worked + " Have another go.";
          feedback.className = "feedback bad";
          setTimeout(function () { if (token === askToken) ask(prompt, onYes); }, 900);
        }
      });
    }

    function render() {
      const current = fresh();
      const farm = current.farm;
      const coinSrc = ((window.MG_LIBRARY && MG_LIBRARY.money) || []).find(function (item) { return item.kind === "coin"; });
      coins.innerHTML = (coinSrc ? '<img src="' + MGUi.esc(coinSrc.src) + '" alt="">' : "") + "<span>" + farm.coins + " coins</span>";
      grid.innerHTML = "";
      farm.plots.forEach(function (plot, index) {
        const card = document.createElement("article");
        card.className = "plot";
        if (!plot.crop) {
          card.innerHTML = "<h3>Empty plot</h3><p>Choose a seed and plant it here.</p>";
          const pick = document.createElement("div");
          pick.className = "chip-row";
          MGStorage.CROP_IDS.forEach(function (cropId) {
            if (!farm.seeds[cropId]) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "chip";
            button.textContent = "Plant " + CROPS[cropId].name + " (" + farm.seeds[cropId] + ")";
            button.addEventListener("click", function () {
              MGStorage.update(profile.id, function (draft) {
                if (draft.farm.seeds[cropId] < 1 || draft.farm.plots[index].crop) return;
                draft.farm.seeds[cropId] -= 1;
                draft.farm.plots[index] = { crop: cropId, stage: 0, waterAt: 0 };
              });
              render();
            });
            pick.appendChild(button);
          });
          if (!pick.children.length) {
            const empty = document.createElement("p");
            empty.textContent = "Buy seeds from the shop.";
            card.appendChild(empty);
          }
          card.appendChild(pick);
        } else {
          const photo = picture(plot);
          const thirsty = plot.stage < 3 && !plot.waterAt;
          card.innerHTML = "<h3>" + MGUi.esc(CROPS[plot.crop].name) + "</h3>" +
            (photo.src ? '<img class="' + photo.className + '" src="' + MGUi.esc(photo.src) + '" alt="' + MGUi.esc(photo.alt) + '">' : "") +
            "<p>" + STAGE[plot.stage] + (thirsty ? " · needs water" : "") + "</p>" +
            '<div class="bar" aria-hidden="true"><span style="width:' + Math.round(progress(plot) * 100) + '%"></span></div>';
          const action = document.createElement("button");
          action.type = "button";
          action.className = "btn primary";
          if (plot.stage >= 3) {
            action.textContent = "Harvest for " + CROPS[plot.crop].reward + " coins";
            action.addEventListener("click", function () {
              const reward = CROPS[plot.crop].reward;
              let before = 0;
              MGStorage.update(profile.id, function (draft) {
                before = draft.farm.coins;
                draft.farm.coins += reward;
                draft.farm.plots[index] = { crop: null, stage: 0, waterAt: 0 };
              });
              gate.innerHTML = '<div class="modal"><div class="panel"><p class="prompt">' + before + " + " + reward + " = " + (before + reward) + " coins</p><button type='button' class='btn primary close-gate'>Lovely</button></div></div>";
              gate.querySelector(".close-gate").addEventListener("click", function () { gate.innerHTML = ""; render(); });
            });
          } else if (thirsty) {
            action.textContent = "Answer to water";
            action.addEventListener("click", function () {
              ask("Answer this to water the " + CROPS[plot.crop].name.toLowerCase() + ".", function () {
                MGStorage.update(profile.id, function (draft) {
                  const target = draft.farm.plots[index];
                  if (target.crop && target.stage < 3) target.waterAt = Date.now();
                });
              });
            });
          } else {
            action.textContent = "Growing";
            action.disabled = true;
          }
          card.appendChild(action);
        }
        grid.appendChild(card);
      });
      shop.innerHTML = "<h2>Seed shop</h2>";
      MGStorage.CROP_IDS.forEach(function (cropId) {
        const row = document.createElement("div");
        row.className = "shop-item";
        const info = document.createElement("div");
        info.innerHTML = "<strong>" + CROPS[cropId].name + "</strong><div>" + CROPS[cropId].cost + " coins · you have " + farm.seeds[cropId] + "</div>";
        const buy = document.createElement("button");
        buy.type = "button";
        buy.className = "btn secondary";
        buy.textContent = "Buy";
        buy.addEventListener("click", function () {
          const latest = MGStorage.get(profile.id);
          if (latest.farm.coins < CROPS[cropId].cost) {
            gate.innerHTML = '<div class="modal"><div class="panel"><p>You need ' + CROPS[cropId].cost + " coins. You have " + latest.farm.coins + '.</p><button type="button" class="btn primary close-gate">OK</button></div></div>';
            gate.querySelector(".close-gate").addEventListener("click", function () { gate.innerHTML = ""; });
            return;
          }
          ask("Answer this to buy " + CROPS[cropId].name.toLowerCase() + " seeds for " + CROPS[cropId].cost + " coins.", function () {
            MGStorage.update(profile.id, function (draft) {
              if (draft.farm.coins < CROPS[cropId].cost) return;
              const before = draft.farm.coins;
              draft.farm.coins -= CROPS[cropId].cost;
              draft.farm.seeds[cropId] += 1;
              draft.farm.lastSum = before + " − " + CROPS[cropId].cost + " = " + draft.farm.coins;
            });
          });
        });
        row.appendChild(info);
        row.appendChild(buy);
        shop.appendChild(row);
      });
      const latest = MGStorage.get(profile.id);
      if (latest.farm.lastSum) {
        const sum = document.createElement("p");
        sum.className = "note";
        sum.textContent = "Last purchase: " + latest.farm.lastSum + " coins.";
        shop.appendChild(sum);
      }
    }

    render();
    timer = window.setInterval(function () {
      if (gate.innerHTML) return;
      const before = JSON.stringify(MGStorage.get(profile.id).farm.plots);
      const current = MGStorage.advanceFarm(MGStorage.get(profile.id).farm, Date.now());
      const after = JSON.stringify(current.plots);
      if (before !== after) {
        MGStorage.update(profile.id, function (draft) { draft.farm = current; });
        render();
        return;
      }
      current.plots.forEach(function (plot, index) {
        const bar = grid.children[index] && grid.children[index].querySelector(".bar span");
        if (bar) bar.style.width = Math.round(progress(plot) * 100) + "%";
      });
    }, 1000);
    return { destroy: function () { window.clearInterval(timer); gate.innerHTML = ""; } };
  }

  window.MGFarm = { mount: mount, CROPS: CROPS };
})();
