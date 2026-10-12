(function () {
  function clock(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (minutes <= 0) return seconds + " seconds";
    return minutes + " min " + (rest < 10 ? "0" : "") + rest;
  }

  function mount(root, profile, go) {
    let tab = "shop";
    let qty = {};
    let timer = 0;
    const body = MGUi.shell(root, {
      title: "Grow a Farm",
      eyebrow: "Your garden",
      profile: profile,
      back: function () { go("menu"); }
    });
    body.innerHTML = '<div class="coin-count"></div><p class="note">Plant your own garden. The seed shop restocks on a timer, even while you are away. Some plants keep making fruit. A ripe crop is sometimes golden or rainbow, and those sell for more.</p><p class="sprinkler-note"></p><div class="farm-layout"><div><div class="plot-grid"></div><div class="expand-row"></div></div><aside class="panel"><div class="chip-row farm-tabs"></div><div class="shop-body"></div></aside></div><div class="gate"></div>';
    const grid = body.querySelector(".plot-grid");
    const shop = body.querySelector(".shop-body");
    const coins = body.querySelector(".coin-count");
    const gate = body.querySelector(".gate");
    const tabs = body.querySelector(".farm-tabs");
    const expandRow = body.querySelector(".expand-row");
    const sprinkleNote = body.querySelector(".sprinkler-note");

    function fresh(now) {
      const current = MGStorage.get(profile.id);
      const next = MGStorage.advanceFarm(current.farm, now);
      if (JSON.stringify(current.farm) !== JSON.stringify(next)) {
        return MGStorage.update(profile.id, function (draft) { draft.farm = next; });
      }
      return current;
    }

    let askToken = 0;
    function ask(question, onYes) {
      const token = ++askToken;
      gate.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="panel"><div class="qbox"></div><p class="feedback" aria-live="polite"></p><button type="button" class="btn ghost close-gate">Not now</button></div></div>';
      const feedback = gate.querySelector(".feedback");
      gate.querySelector(".close-gate").addEventListener("click", function () { askToken += 1; gate.innerHTML = ""; });
      MGUi.fillQuestion(gate.querySelector(".qbox"), question, function (result) {
        if (result.correct) {
          feedback.textContent = "Correct. " + question.worked;
          feedback.className = "feedback good";
          onYes();
          setTimeout(function () { if (token !== askToken) return; gate.innerHTML = ""; render(); }, 600);
        } else {
          feedback.textContent = "Good try. " + question.worked + " Have another go.";
          feedback.className = "feedback bad";
          setTimeout(function () { if (token === askToken) ask(question, onYes); }, 900);
        }
      });
    }

    function level() {
      const current = MGStorage.get(profile.id);
      return MGQuestions.playingLevel(current.grade, current.maths.adjust);
    }

    function picture(plot, ratio) {
      const props = (window.MG_LIBRARY && MG_LIBRARY.props) || {};
      const crops = (window.MG_LIBRARY && MG_LIBRARY.crops) || [];
      const found = crops.find(function (crop) { return crop.id === plot.crop; });
      if (ratio < 0.34 && props.seed) return { src: props.seed, className: "sprout", alt: "Seed" };
      if (ratio < 0.7 && props.sprout) return { src: props.sprout, className: "sprout", alt: "Sprout" };
      return { src: found ? found.src : "", className: "crop", alt: MGStorage.CROPS[plot.crop].name };
    }

    function render() {
      const now = Date.now();
      const current = fresh(now);
      const farm = current.farm;
      const coinSrc = ((window.MG_LIBRARY && MG_LIBRARY.money) || []).find(function (item) { return item.kind === "coin"; });
      coins.innerHTML = (coinSrc ? '<img src="' + MGUi.esc(coinSrc.src) + '" alt="">' : "") + "<span>" + farm.coins + " coins</span>";
      const left = farm.sprinklerUntil - now;
      sprinkleNote.textContent = left > 0 ? "The sprinkler is on for " + clock(left) + ". Plants grow faster." : "";
      grid.innerHTML = "";
      farm.plots.forEach(function (plot, index) {
        const card = document.createElement("article");
        card.className = "plot";
        if (!plot.crop) {
          card.innerHTML = "<h3>Empty plot</h3><p>Plant a seed you own.</p>";
          const pick = document.createElement("div");
          pick.className = "chip-row";
          MGStorage.CROP_IDS.forEach(function (cropId) {
            if (!farm.seeds[cropId]) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "chip";
            button.textContent = "Plant " + MGStorage.CROPS[cropId].name + " (" + farm.seeds[cropId] + ")";
            button.addEventListener("click", function () {
              MGStorage.update(profile.id, function (draft) { MGStorage.plantSeed(draft.farm, index, cropId, Date.now()); });
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
          const ready = MGStorage.isReady(plot, now, farm);
          const ratio = Math.max(0, Math.min(1, MGStorage.elapsedMs(plot, now, farm) / MGStorage.needMs(plot)));
          const photo = picture(plot, ready ? 1 : ratio);
          const mutation = ready ? (MGStorage.MUTATIONS[plot.mutation] || MGStorage.MUTATIONS.normal) : null;
          if (mutation && plot.mutation !== "normal") card.classList.add(plot.mutation);
          const crop = MGStorage.CROPS[plot.crop];
          card.innerHTML = "<h3></h3>" + (photo.src ? '<img class="' + photo.className + '" src="' + MGUi.esc(photo.src) + '" alt="' + MGUi.esc(photo.alt) + '">' : "") + "<p class='status'></p><div class='bar' aria-hidden='true'><span></span></div>";
          card.querySelector("h3").textContent = crop.name;
          const status = card.querySelector(".status");
          if (ready) {
            const value = MGStorage.fruitValue(plot.crop, plot.mutation);
            status.textContent = (mutation && plot.mutation !== "normal" ? mutation.name + " · " : "") + "Ready · sells for " + value + " coins" + (crop.multi ? " · keeps fruiting" : "");
          } else {
            const remain = MGStorage.needMs(plot) - MGStorage.elapsedMs(plot, now, farm);
            status.textContent = "Ready in " + clock(remain) + (crop.multi && plot.harvests > 0 ? " · next fruit" : "");
          }
          card.querySelector(".bar span").style.width = Math.round((ready ? 1 : ratio) * 100) + "%";
          const actions = document.createElement("div");
          actions.className = "chip-row";
          if (ready) {
            const pick = document.createElement("button");
            pick.type = "button";
            pick.className = "btn primary";
            pick.textContent = "Pick fruit";
            pick.addEventListener("click", function () {
              MGStorage.update(profile.id, function (draft) { MGStorage.pickFruit(draft.farm, index, Date.now()); });
              render();
            });
            actions.appendChild(pick);
          } else {
            const boost = document.createElement("button");
            boost.type = "button";
            boost.className = "btn secondary";
            boost.textContent = "Growth boost";
            boost.addEventListener("click", function () {
              const question = MGQuestions.generateRound(level(), (Date.now() ^ index) >>> 0, 1)[0];
              ask(question, function () {
                MGStorage.update(profile.id, function (draft) { MGStorage.grantBoost(draft.farm, index, Date.now()); });
              });
            });
            const can = document.createElement("button");
            can.type = "button";
            can.className = "btn ghost";
            can.textContent = "Watering can (" + farm.canUses + ")";
            can.disabled = farm.canUses < 1;
            can.addEventListener("click", function () {
              MGStorage.update(profile.id, function (draft) { MGStorage.useCan(draft.farm, index, Date.now()); });
              render();
            });
            actions.appendChild(boost);
            actions.appendChild(can);
          }
          card.appendChild(actions);
        }
        grid.appendChild(card);
      });
      expandRow.innerHTML = "";
      const cost = MGStorage.expandCost(farm.plotsOpen);
      if (cost) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn secondary";
        button.textContent = "Open 3 more plots for " + cost + " coins";
        button.addEventListener("click", function () {
          const latest = MGStorage.get(profile.id);
          if (latest.farm.coins < cost) {
            gate.innerHTML = '<div class="modal"><div class="panel"><p>You need ' + cost + " coins. You have " + latest.farm.coins + '.</p><button type="button" class="btn primary close-gate">OK</button></div></div>';
            gate.querySelector(".close-gate").addEventListener("click", function () { gate.innerHTML = ""; });
            return;
          }
          const pay = MGStorage.tenderFor(cost);
          ask(MGQuestions.priceQuestion("change", { total: cost, pay: pay, price: cost, qty: 1, level: level() }, Date.now()), function () {
            MGStorage.update(profile.id, function (draft) { MGStorage.expandGarden(draft.farm); });
          });
        });
        expandRow.appendChild(button);
      }
      tabs.innerHTML = "";
      [["shop", "Seed shop"], ["stand", "Sell stand"], ["tools", "Tools"]].forEach(function (item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chip" + (tab === item[0] ? " on" : "");
        button.textContent = item[1] + (item[0] === "stand" && farm.basket.length ? " (" + farm.basket.length + ")" : "");
        button.addEventListener("click", function () { tab = item[0]; render(); });
        tabs.appendChild(button);
      });
      shop.innerHTML = "";
      if (tab === "shop") renderShop(farm);
      else if (tab === "stand") renderStand(farm);
      else renderTools(farm);
    }

    function renderShop(farm) {
      const wait = document.createElement("p");
      wait.className = "note restock";
      shop.appendChild(wait);
      MGStorage.CROP_IDS.forEach(function (cropId) {
        const crop = MGStorage.CROPS[cropId];
        const row = document.createElement("div");
        row.className = "shop-item";
        const stock = farm.stock[cropId] || 0;
        const info = document.createElement("div");
        info.innerHTML = "<strong></strong><div class='note'></div>";
        info.querySelector("strong").textContent = crop.name + " · " + crop.rarity;
        info.querySelector(".note").textContent = crop.cost + " coins · " + (stock ? stock + " in the shop" : "Sold out") + " · you own " + (farm.seeds[cropId] || 0) + (crop.multi ? " · keeps fruiting" : "");
        row.appendChild(info);
        if (stock) {
          const amount = Math.max(1, Math.min(qty[cropId] || 1, stock, level() <= 2 ? 4 : 6));
          qty[cropId] = amount;
          const controls = document.createElement("div");
          controls.className = "chip-row";
          const minus = document.createElement("button");
          minus.type = "button";
          minus.className = "btn ghost";
          minus.textContent = "Less";
          minus.addEventListener("click", function () { qty[cropId] = Math.max(1, amount - 1); render(); });
          const label = document.createElement("span");
          label.textContent = String(amount);
          const plus = document.createElement("button");
          plus.type = "button";
          plus.className = "btn ghost";
          plus.textContent = "More";
          plus.addEventListener("click", function () { qty[cropId] = amount + 1; render(); });
          const buy = document.createElement("button");
          buy.type = "button";
          buy.className = "btn secondary";
          buy.textContent = "Buy";
          buy.addEventListener("click", function () { buySeeds(cropId, amount); });
          controls.appendChild(minus);
          controls.appendChild(label);
          controls.appendChild(plus);
          controls.appendChild(buy);
          row.appendChild(controls);
        }
        shop.appendChild(row);
      });
      paintClocks();
    }

    function buySeeds(cropId, amount) {
      const latest = MGStorage.get(profile.id);
      const crop = MGStorage.CROPS[cropId];
      const total = crop.cost * amount;
      if ((latest.farm.stock[cropId] || 0) < amount) return;
      if (latest.farm.coins < total) {
        gate.innerHTML = '<div class="modal"><div class="panel"><p>You need ' + total + " coins. You have " + latest.farm.coins + ".</p><button type='button' class='btn primary close-gate'>OK</button></div></div>";
        gate.querySelector(".close-gate").addEventListener("click", function () { gate.innerHTML = ""; });
        return;
      }
      const question = amount === 1
        ? MGQuestions.priceQuestion("change", { total: total, pay: MGStorage.tenderFor(total), price: crop.cost, qty: 1, level: level() }, Date.now())
        : MGQuestions.priceQuestion("total", { price: crop.cost, qty: amount, level: level() }, Date.now());
      ask(question, function () {
        MGStorage.update(profile.id, function (draft) { MGStorage.buySeed(draft.farm, cropId, amount); });
      });
    }

    function renderStand(farm) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = "Golden fruit sells for 3 times as much. Rainbow fruit sells for 5 times as much.";
      shop.appendChild(note);
      if (!farm.basket.length) {
        const empty = document.createElement("p");
        empty.textContent = "Pick ripe fruit, then sell it here.";
        shop.appendChild(empty);
        return;
      }
      const parts = farm.basket.map(function (item) { return MGStorage.fruitValue(item.crop, item.mutation); });
      const total = parts.reduce(function (sum, value) { return sum + value; }, 0);
      farm.basket.forEach(function (item) {
        const line = document.createElement("p");
        const mutation = item.mutation === "normal" ? "" : MGStorage.MUTATIONS[item.mutation].name + " ";
        line.textContent = mutation + MGStorage.CROPS[item.crop].name + " · " + MGStorage.fruitValue(item.crop, item.mutation) + " coins";
        shop.appendChild(line);
      });
      const sum = document.createElement("p");
      sum.textContent = parts.join(" + ") + " = " + total + " coins";
      shop.appendChild(sum);
      const sell = document.createElement("button");
      sell.type = "button";
      sell.className = "btn primary";
      sell.textContent = "Sell all";
      sell.addEventListener("click", function () {
        MGStorage.update(profile.id, function (draft) { MGStorage.sellBasket(draft.farm); });
        render();
      });
      shop.appendChild(sell);
    }

    function renderTools(farm) {
      addTool("Watering can", MGStorage.CAN_COST + " coins for " + MGStorage.CAN_USES + " uses. Each use skips " + Math.round(MGStorage.CAN_SKIP_MS / 1000) + " seconds. You have " + farm.canUses + ".", MGStorage.CAN_COST, function (target) {
        return MGStorage.buyCan(target);
      });
      addTool("Garden sprinkler", MGStorage.SPRINKLER_COST + " coins. The whole garden grows faster for " + Math.round(MGStorage.SPRINKLER_MS / 1000) + " seconds.", MGStorage.SPRINKLER_COST, function (target) {
        return MGStorage.buySprinkler(target, Date.now());
      });
    }

    function addTool(name, detail, cost, buy) {
      const row = document.createElement("div");
      row.className = "shop-item";
      const info = document.createElement("div");
      info.innerHTML = "<strong></strong><div class='note'></div>";
      info.querySelector("strong").textContent = name;
      info.querySelector(".note").textContent = detail;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn secondary";
      button.textContent = "Buy";
      button.addEventListener("click", function () {
        const latest = MGStorage.get(profile.id);
        if (latest.farm.coins < cost) {
          gate.innerHTML = '<div class="modal"><div class="panel"><p>You need ' + cost + " coins. You have " + latest.farm.coins + '.</p><button type="button" class="btn primary close-gate">OK</button></div></div>';
          gate.querySelector(".close-gate").addEventListener("click", function () { gate.innerHTML = ""; });
          return;
        }
        ask(MGQuestions.priceQuestion("change", { total: cost, pay: MGStorage.tenderFor(cost), price: cost, qty: 1, level: level() }, Date.now()), function () {
          MGStorage.update(profile.id, function (draft) { buy(draft.farm); });
        });
      });
      row.appendChild(info);
      row.appendChild(button);
      shop.appendChild(row);
    }

    function paintClocks() {
      const farm = MGStorage.get(profile.id).farm;
      const node = body.querySelector(".restock");
      if (node) node.textContent = "New seeds in " + clock(farm.shopAt + MGStorage.RESTOCK_MS - Date.now()) + ". Unsold shop stock is replaced.";
      const now = Date.now();
      farm.plots.forEach(function (plot, index) {
        const card = grid.children[index];
        if (!card || !plot.crop) return;
        const ready = MGStorage.isReady(plot, now, farm);
        const bar = card.querySelector(".bar span");
        if (bar && !ready) {
          const ratio = MGStorage.elapsedMs(plot, now, farm) / MGStorage.needMs(plot);
          bar.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
        }
      });
    }

    render();
    timer = window.setInterval(function () {
      const now = Date.now();
      const current = MGStorage.get(profile.id);
      const next = MGStorage.advanceFarm(current.farm, now);
      const changed = JSON.stringify(current.farm) !== JSON.stringify(next);
      if (changed) MGStorage.update(profile.id, function (draft) { draft.farm = next; });
      if (gate.innerHTML) return;
      if (changed) render();
      else paintClocks();
    }, 1000);
    return { destroy: function () { window.clearInterval(timer); gate.innerHTML = ""; } };
  }

  window.MGFarm = { mount: mount };
})();
