(function () {
  const cheers = ["Well done!", "Spot on!", "You have got this!", "Nice calculating!", "Brilliant!"];

  function mount(root, profile, go) {
    const level = MGQuestions.playingLevel(profile.grade, profile.maths.adjust);
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const questions = MGQuestions.generateRound(level, seed, 10);
    let index = 0;
    let correct = 0;
    let busy = false;
    const body = MGUi.shell(root, {
      title: "Maths Genius",
      eyebrow: MGQuestions.describeLevel(level),
      profile: profile,
      back: function () { go("menu"); }
    });
    body.innerHTML = '<div class="round-meta"><span class="count"></span><span class="score-pill"></span></div>' +
      '<div class="qbox"></div><p class="feedback" aria-live="polite"></p>' +
      '<button type="button" class="btn primary next-btn hidden">Next question</button><div class="summary hidden"></div>';
    const count = body.querySelector(".count");
    const score = body.querySelector(".score-pill");
    const qbox = body.querySelector(".qbox");
    const feedback = body.querySelector(".feedback");
    const next = body.querySelector(".next-btn");
    const summary = body.querySelector(".summary");

    function paint() {
      count.textContent = "Question " + Math.min(index + 1, questions.length) + " of " + questions.length;
      score.textContent = correct + " correct";
    }

    function show() {
      busy = false;
      feedback.textContent = "";
      feedback.className = "feedback";
      next.classList.add("hidden");
      paint();
      MGUi.fillQuestion(qbox, questions[index], function (result) {
        if (busy) return;
        busy = true;
        if (result.correct) {
          correct += 1;
          feedback.textContent = cheers[index % cheers.length];
          feedback.classList.add("good");
        } else {
          feedback.textContent = "Good try. " + questions[index].worked;
          feedback.classList.add("bad");
        }
        paint();
        next.textContent = index === questions.length - 1 ? "See my stars" : "Next question";
        next.classList.remove("hidden");
        next.focus();
      });
    }

    next.addEventListener("click", function () {
      index += 1;
      if (index >= questions.length) finish();
      else show();
    });

    function finish() {
      qbox.innerHTML = "";
      next.classList.add("hidden");
      feedback.textContent = "";
      const stars = MGQuestions.starsFor(correct);
      const before = profile.maths.adjust || 0;
      const adjust = MGQuestions.nextAdjust(before, correct);
      MGStorage.update(profile.id, function (draft) {
        draft.maths.stars += stars;
        draft.maths.best = Math.max(draft.maths.best, correct);
        draft.maths.rounds += 1;
        draft.maths.correct += correct;
        draft.maths.answered += questions.length;
        draft.maths.adjust = adjust;
      });
      let note = "The next round stays at this challenge.";
      if (adjust > before) note = "Next time the questions will be a little harder.";
      if (adjust < before) note = "Next time the questions will be a little gentler.";
      const nextLevel = MGQuestions.playingLevel(profile.grade, adjust);
      summary.classList.remove("hidden");
      summary.innerHTML = "<h2>Round complete</h2><p class='big-score'>" + correct + " out of " + questions.length + "</p>" +
        MGUi.starRow(stars, 3) + "<p>" + note + "</p><p>Playing level: " + MGUi.esc(MGQuestions.describeLevel(nextLevel)) + ".</p>" +
        "<div class='row-actions'><button type='button' class='btn primary again'>Play another round</button>" +
        "<button type='button' class='btn ghost to-menu'>Back to games</button></div>";
      summary.querySelector(".again").addEventListener("click", function () {
        mount(root, MGStorage.get(profile.id), go);
      });
      summary.querySelector(".to-menu").addEventListener("click", function () { go("menu"); });
      count.textContent = "Finished";
    }

    show();
    return { destroy: function () {} };
  }

  window.MGMaths = { mount: mount };
})();
