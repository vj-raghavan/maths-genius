/* Tic tac toe. Marks are the letters X and O. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MGTic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function winner(board) {
    for (let i = 0; i < LINES.length; i += 1) {
      const line = LINES[i];
      const mark = board[line[0]];
      if (mark && mark === board[line[1]] && mark === board[line[2]]) return { mark: mark, line: line };
    }
    if (board.every(function (cell) { return cell; })) return { mark: "draw", line: [] };
    return null;
  }

  function empty(board) {
    const spots = [];
    board.forEach(function (cell, index) { if (!cell) spots.push(index); });
    return spots;
  }

  function findWin(board, mark) {
    const spots = empty(board);
    for (let i = 0; i < spots.length; i += 1) {
      board[spots[i]] = mark;
      const won = winner(board);
      board[spots[i]] = "";
      if (won && won.mark === mark) return spots[i];
    }
    return -1;
  }

  function minimax(board, mark, ai) {
    const result = winner(board);
    if (result && result.mark === ai) return { score: 1, index: -1 };
    if (result && result.mark === "draw") return { score: 0, index: -1 };
    if (result) return { score: -1, index: -1 };
    const spots = empty(board);
    let best = null;
    spots.forEach(function (index) {
      board[index] = mark;
      const next = minimax(board, mark === "X" ? "O" : "X", ai);
      board[index] = "";
      if (!best || (mark === ai ? next.score > best.score : next.score < best.score)) best = { score: next.score, index: index };
    });
    return best || { score: 0, index: -1 };
  }

  function chooseMove(board, mark, difficulty, rng) {
    const random = rng || Math.random;
    const spots = empty(board);
    if (!spots.length) return -1;
    function pick(list) { return list[Math.floor(random() * list.length)]; }
    const other = mark === "X" ? "O" : "X";
    const win = findWin(board, mark);
    if (win >= 0) return win;
    if (difficulty === "hard") return minimax(board.slice(), mark, mark).index;
    if (difficulty === "easy") {
      if (random() < 0.25) {
        const block = findWin(board, other);
        if (block >= 0) return block;
      }
      return pick(spots);
    }
    if (random() > 0.22) {
      const block = findWin(board, other);
      if (block >= 0) return block;
    }
    if (!board[4]) return 4;
    const corners = spots.filter(function (index) { return index === 0 || index === 2 || index === 6 || index === 8; });
    if (corners.length) return pick(corners);
    return pick(spots);
  }

  function record(profile, outcome) {
    if (!profile || outcome === "watch") return;
    MGStorage.update(profile.id, function (draft) {
      if (outcome === "win") draft.tictactoe.wins += 1;
      else if (outcome === "loss") draft.tictactoe.losses += 1;
      else draft.tictactoe.draws += 1;
      if (outcome === "win") MGStorage.earn(draft, 4);
    });
  }

  function attachShared(stage, options) {
    const board = ["", "", "", "", "", "", "", "", ""];
    let turn = "X";
    let over = false;
    let finished = false;
    stage.innerHTML = "<p class='note status'></p><div class='xo-grid'></div><p class='feedback' aria-live='polite'></p><button type='button' class='btn ghost back-room'>Back to room</button>";
    const grid = stage.querySelector(".xo-grid");
    const status = stage.querySelector(".status");
    const feedback = stage.querySelector(".feedback");
    const cells = [];
    for (let i = 0; i < 9; i += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "xo-cell";
      button.setAttribute("aria-label", "Empty square");
      button.addEventListener("click", function () { intent(i); });
      grid.appendChild(button);
      cells.push(button);
    }
    stage.querySelector(".back-room").addEventListener("click", function () { if (options.onLeave) options.onLeave(); });

    function paint() {
      const result = winner(board);
      cells.forEach(function (button, index) {
        button.textContent = board[index];
        button.className = "xo-cell" + (board[index] ? " " + board[index] : "");
        button.disabled = over || !!board[index] || options.role !== turn;
        button.setAttribute("aria-label", board[index] || "Empty square");
        if (result && result.line && result.line.indexOf(index) >= 0) button.classList.add("win");
      });
      if (result) {
        over = true;
        if (result.mark === "draw") status.textContent = "It's a draw.";
        else status.textContent = result.mark + " wins.";
        if (!finished) {
          finished = true;
          const mine = options.role;
          const outcome = mine === "watch" ? "watch" : result.mark === "draw" ? "draw" : result.mark === mine ? "win" : "loss";
          if (options.onFinish) options.onFinish(outcome);
        }
        return;
      }
      const who = turn === options.role ? "Your turn." : turn === "X" ? (options.xName || "X") + " to play." : (options.oName || "O") + " to play.";
      status.textContent = options.role === "watch" ? "You are watching. " + who : who + (options.maths ? " Answer a question to claim a square." : "");
    }

    function intent(index) {
      if (over || board[index] || options.role !== turn) return;
      if (!options.maths) {
        options.onIntent(index);
        return;
      }
      const question = MGQuestions.generateRound(options.level || 2, (Date.now() ^ index) >>> 0, 1)[0];
      feedback.textContent = "";
      const box = document.createElement("div");
      stage.appendChild(box);
      MGUi.fillQuestion(box, question, function (result) {
        box.remove();
        if (result.correct) options.onIntent(index);
        else feedback.textContent = "Good try. " + question.worked + " The turn passes.";
        if (!result.correct && options.onPass) options.onPass();
      });
    }

    function applyMove(index, mark) {
      if (over || board[index] || mark !== turn) return false;
      board[index] = mark;
      turn = mark === "X" ? "O" : "X";
      paint();
      return true;
    }

    function sync(nextBoard, nextTurn) {
      for (let i = 0; i < 9; i += 1) board[i] = nextBoard && (nextBoard[i] === "X" || nextBoard[i] === "O") ? nextBoard[i] : "";
      turn = nextTurn === "O" ? "O" : "X";
      over = false;
      finished = !!winner(board);
      paint();
    }

    paint();
    return {
      applyMove: applyMove,
      sync: sync,
      board: function () { return board.slice(); },
      turn: function () { return turn; }
    };
  }

  function mount(root, profile, go) {
    let cpuTimer = 0;
    const body = MGUi.shell(root, {
      title: "Tic Tac Toe",
      eyebrow: "X and O",
      profile: profile,
      back: function () { window.clearTimeout(cpuTimer); go("menu"); }
    });
    const recordLine = profile.tictactoe.wins + " wins · " + profile.tictactoe.losses + " losses · " + profile.tictactoe.draws + " draws";

    function menu() {
      window.clearTimeout(cpuTimer);
      body.innerHTML = "<p class='note'></p><div class='chip-row'></div><p class='field'><label><input class='maths-toggle' type='checkbox' checked> Answer a question to claim a square</label></p><div class='row-actions'><button type='button' class='btn secondary online'>Play in a room</button></div>";
      body.querySelector(".note").textContent = recordLine + ". You are X. A friend on this device, or the computer, is O.";
      const row = body.querySelector(".chip-row");
      [["easy", "Easy computer"], ["medium", "Medium computer"], ["hard", "Hard computer"], ["local", "Two players"]].forEach(function (item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn primary";
        button.textContent = item[1];
        button.addEventListener("click", function () {
          play({ mode: item[0] === "local" ? "local" : "cpu", difficulty: item[0], maths: body.querySelector(".maths-toggle").checked });
        });
        row.appendChild(button);
      });
      body.querySelector(".online").addEventListener("click", function () { go("together"); });
    }

    function play(settings) {
      window.clearTimeout(cpuTimer);
      const board = ["", "", "", "", "", "", "", "", ""];
      let turn = "X";
      let over = false;
      let saved = false;
      body.innerHTML = "<p class='note status'></p><div class='xo-grid'></div><p class='feedback' aria-live='polite'></p>";
      const grid = body.querySelector(".xo-grid");
      const status = body.querySelector(".status");
      const feedback = body.querySelector(".feedback");
      const buttons = [];
      for (let i = 0; i < 9; i += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "xo-cell";
        button.addEventListener("click", function () { human(i); });
        grid.appendChild(button);
        buttons.push(button);
      }

      function paint() {
        const result = winner(board);
        buttons.forEach(function (button, index) {
          button.textContent = board[index];
          button.className = "xo-cell" + (board[index] ? " " + board[index] : "");
          button.disabled = over || !!board[index] || (settings.mode === "cpu" && turn === "O");
          if (result && result.line && result.line.indexOf(index) >= 0) button.classList.add("win");
        });
        if (result) {
          over = true;
          if (!saved) {
            saved = true;
            const outcome = result.mark === "draw" ? "draw" : (settings.mode === "local" ? (result.mark === "X" ? "win" : "loss") : (result.mark === "X" ? "win" : "loss"));
            record(profile, outcome);
          }
          status.textContent = result.mark === "draw" ? "It's a draw." : (result.mark === "X" ? profile.name : settings.mode === "local" ? "Friend" : "Computer") + " wins.";
          const again = document.createElement("button");
          again.type = "button";
          again.className = "btn primary";
          again.textContent = "Play again";
          again.addEventListener("click", menu);
          body.appendChild(again);
          return;
        }
        if (settings.mode === "local") status.textContent = (turn === "X" ? profile.name : "Friend") + " to play." + (settings.maths ? " Answer to claim the square." : " Pass the device.");
        else status.textContent = turn === "X" ? "Your turn." : "Computer is thinking.";
      }

      function place(index, mark) {
        if (over || board[index] || mark !== turn) return;
        board[index] = mark;
        turn = mark === "X" ? "O" : "X";
        paint();
        if (!over && settings.mode === "cpu" && turn === "O") {
          cpuTimer = window.setTimeout(function () {
            const move = chooseMove(board, "O", settings.difficulty, Math.random);
            if (move >= 0) place(move, "O");
          }, 450);
        }
      }

      function human(index) {
        if (over || board[index]) return;
        if (settings.mode === "cpu" && turn !== "X") return;
        const mark = turn;
        if (!settings.maths) {
          place(index, mark);
          return;
        }
        const question = MGQuestions.generateRound(MGQuestions.playingLevel(profile.grade, profile.maths.adjust), (Date.now() ^ index) >>> 0, 1)[0];
        const box = document.createElement("div");
        body.appendChild(box);
        buttons.forEach(function (button) { button.disabled = true; });
        MGUi.fillQuestion(box, question, function (result) {
          box.remove();
          if (result.correct) place(index, mark);
          else {
            feedback.textContent = "Good try. " + question.worked + " The turn passes.";
            turn = mark === "X" ? "O" : "X";
            paint();
            if (settings.mode === "cpu" && turn === "O") {
              cpuTimer = window.setTimeout(function () {
                const move = chooseMove(board, "O", settings.difficulty, Math.random);
                if (move >= 0) place(move, "O");
              }, 450);
            }
          }
        });
      }

      paint();
    }

    menu();
    return { destroy: function () { window.clearTimeout(cpuTimer); } };
  }

  return { mount: mount, winner: winner, chooseMove: chooseMove, attachShared: attachShared, record: record, LINES: LINES };
});
