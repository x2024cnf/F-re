(function () {
  "use strict";

  const mapGroup = document.getElementById("trail-lines");
  const runSelect = document.getElementById("report-run");
  let selectedRunId = RUNS[0].id;

  function getRun(id) {
    return RUNS.find(function (run) { return run.id === id; }) || RUNS[0];
  }

  function relativeAge(minutes) {
    return minutes < 1 ? "just now" : minutes + " min ago";
  }

  function renderMap() {
    mapGroup.replaceChildren();
    RUNS.forEach(function (run) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "trail-target condition-" + run.condition + (run.id === selectedRunId ? " is-selected" : ""));
      group.setAttribute("data-run-id", run.id);
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.setAttribute("aria-label", run.name + ", " + CONDITIONS[run.condition].label + ", Chatter Score " + run.score);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "trail-stroke");
      path.setAttribute("d", run.path);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", "trail-label");
      label.setAttribute("x", run.labelX);
      label.setAttribute("y", run.labelY);
      label.textContent = run.name;
      group.append(path, label);
      mapGroup.append(group);
    });
  }

  function renderRunDetails() {
    const run = getRun(selectedRunId);
    document.getElementById("run-name").textContent = run.name;
    document.getElementById("run-meta").textContent = run.difficulty + " · " + run.length;
    document.getElementById("run-condition").textContent = CONDITIONS[run.condition].label;
    document.getElementById("run-confidence").textContent = run.confidence + "% confidence";
    document.getElementById("run-score").textContent = run.score;
    document.getElementById("run-meter").style.width = run.score + "%";
    document.getElementById("run-reports").textContent = run.reports;
    document.getElementById("run-updated").textContent = "Updated " + relativeAge(run.age);
    document.getElementById("run-swatch").className = "condition-swatch " + run.condition;
    runSelect.value = run.id;
    document.getElementById("report-run-hint").textContent = "Reporting for " + run.name + " · " + run.reports + " rider reports this hour";
  }

  function selectRun(id) {
    selectedRunId = id;
    renderMap();
    renderRunDetails();
    document.getElementById("report-feedback").textContent = "Pick the closest match. That’s your whole report.";
  }

  function updateRunCondition(condition) {
    const run = getRun(runSelect.value);
    run.condition = condition;
    run.score = Math.round(run.score * 0.72 + CONDITIONS[condition].score * 0.28);
    run.confidence = Math.min(99, run.confidence + 3);
    run.reports += 1;
    run.age = 0;
    selectedRunId = run.id;
    renderMap();
    renderRunDetails();
    document.getElementById("report-feedback").textContent = "Report added for " + run.name + ". The map now reflects your read.";
    document.querySelectorAll(".condition-option").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.condition === condition ? "true" : "false");
    });
  }

  mapGroup.addEventListener("click", function (event) {
    const target = event.target.closest("[data-run-id]");
    if (target) selectRun(target.dataset.runId);
  });
  mapGroup.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-run-id]")) {
      event.preventDefault();
      selectRun(event.target.dataset.runId);
    }
  });

  RUNS.forEach(function (run) {
    const option = document.createElement("option");
    option.value = run.id;
    option.textContent = run.name + " · " + CONDITIONS[run.condition].label;
    runSelect.append(option);
  });
  runSelect.addEventListener("change", function () { selectRun(runSelect.value); });
  document.querySelectorAll(".condition-option").forEach(function (button) {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", function () { updateRunCondition(button.dataset.condition); });
  });

  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) {
      return view.id === requested;
    });
    const current = exists ? requested : "home";

    views.forEach(function (view) {
      view.hidden = view.id !== current;
    });

    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", showView);

  const riderSlider = document.getElementById("rider-slider");
  function updateNetwork() {
    const riders = Number(riderSlider.value);
    const coverage = Math.min(RUNS.length, Math.max(1, Math.round(RUNS.length * (1 - Math.exp(-riders / 400)))));
    const accuracy = Math.round(52 + 42 * (1 - Math.exp(-riders / 500)));
    const age = Math.max(3, Math.round(44 * Math.exp(-riders / 600)));
    document.getElementById("rider-count").textContent = riders.toLocaleString();
    document.getElementById("coverage-value").innerHTML = coverage + " <small>/ 12</small>";
    document.getElementById("coverage-bar").style.width = (coverage / RUNS.length * 100) + "%";
    document.getElementById("accuracy-value").innerHTML = accuracy + "<small>%</small>";
    document.getElementById("accuracy-bar").style.width = accuracy + "%";
    document.getElementById("age-value").innerHTML = age + "<small> min</small>";
    document.getElementById("age-bar").style.width = (100 - age / 54 * 100) + "%";
    document.getElementById("network-context").textContent = riders < 180
      ? "At " + riders.toLocaleString() + " riders, the busiest runs start to come into focus."
      : riders > 1300
        ? "At " + riders.toLocaleString() + " riders, fresh signals reach nearly every run."
        : "At " + riders.toLocaleString() + " riders, nearly every run has a fresh read.";
  }
  riderSlider.addEventListener("input", updateNetwork);

  document.getElementById("sync-button").addEventListener("click", function () {
    document.getElementById("sync-label").textContent = "Synced just now";
    this.classList.add("is-synced");
    this.setAttribute("aria-label", "Rides synced just now");
  });

  renderMap();
  renderRunDetails();
  updateNetwork();
  showView();
})();
