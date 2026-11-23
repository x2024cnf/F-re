(function () {
  "use strict";

  const STORAGE = {
    resort: "fore.selectedResort.v1",
    selectedRun: "fore.selectedRun.v1",
    reports: "fore.reports.v1",
    pendingSync: "fore.pendingSync.v1",
    scenario: "fore.weatherScenario.v1",
    time: "fore.timeMinutes.v1",
    profile: "fore.riderProfile.v1"
  };

  function readStorage(key, fallback) {
    try {
      const saved = window.localStorage.getItem(key);
      return saved === null ? fallback : JSON.parse(saved);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setAnimatedNumber(element, target, suffix) {
    if (!element) return;
    const formattedTarget = Number(target).toLocaleString();
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof window.requestAnimationFrame !== "function") {
      element.innerHTML = formattedTarget + (suffix || "");
      return;
    }
    if (element.__foreAnimationFrame && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(element.__foreAnimationFrame);
    }
    const match = String(element.textContent).match(/[\d,]+/);
    const startValue = match ? Number(match[0].replace(/,/g, "")) : 0;
    const endValue = Number(target);
    if (startValue === endValue) {
      element.innerHTML = formattedTarget + (suffix || "");
      return;
    }
    const startedAt = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / 360);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.innerHTML = Math.round(startValue + (endValue - startValue) * eased).toLocaleString() + (suffix || "");
      if (progress < 1) element.__foreAnimationFrame = window.requestAnimationFrame(tick);
      else element.__foreAnimationFrame = 0;
    }
    element.__foreAnimationFrame = window.requestAnimationFrame(tick);
  }

  function collectElements(container, ids) {
    const elements = Object.create(null);
    for (const id of ids) {
      const element = container.querySelector("#" + id);
      if (!element) {
        console.error("[Føre] Required element #" + id + " is missing.");
        return null;
      }
      elements[id] = element;
    }
    return elements;
  }

  function isKnownResort(id) {
    return RESORTS.some(function (resort) { return resort.id === id; });
  }

  function isKnownScenario(id) {
    return Object.prototype.hasOwnProperty.call(WEATHER_SCENARIOS, id);
  }

  const savedResortId = readStorage(STORAGE.resort, FORE_DEFAULTS.resortId);
  const savedPendingSync = Number(readStorage(STORAGE.pendingSync, FORE_DEFAULTS.pendingSyncRuns));
  const savedProfile = readStorage(STORAGE.profile, null);
  const profile = Object.assign({}, RIDER_PROFILE, savedProfile && typeof savedProfile === "object" ? savedProfile : {});
  profile.seasonHistory = Array.isArray(profile.seasonHistory) ? profile.seasonHistory : RIDER_PROFILE.seasonHistory.slice();
  const initialResort = RESORTS.find(function (resort) { return resort.id === savedResortId; }) || RESORTS[0];
  const state = {
    resortId: initialResort.id,
    scenarioId: FORE_DEFAULTS.scenarioId,
    timeMinutes: FORE_DEFAULTS.timeMinutes,
    selectedRunId: FORE_DEFAULTS.selectedRunId,
    activeRiders: initialResort.activeRiders,
    networkRiders: NETWORK_CONFIG.homeRiderCount,
    pendingSyncRuns: Number.isFinite(savedPendingSync) ? Math.max(0, savedPendingSync) : FORE_DEFAULTS.pendingSyncRuns,
    selectedReportCondition: null,
    mapMode: "condition",
    mapHasRendered: false,
    riderProfile: profile
  };
  const renderers = { home: null, map: null, report: null, network: null, resorts: null, pricing: null, profile: null };

  function currentResort() {
    return RESORTS.find(function (resort) { return resort.id === state.resortId; }) || RESORTS[0];
  }

  function currentRuns() {
    return currentResort().runs;
  }

  function getRun(id) {
    return currentRuns().find(function (run) { return run.id === id; }) || currentRuns()[0] || null;
  }

  function getWeather() {
    const resort = currentResort();
    return resort.weather[state.scenarioId] || resort.weather[FORE_DEFAULTS.scenarioId];
  }

  function formatTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = String(minutes % 60).padStart(2, "0");
    return (hour % 12 || 12) + ":" + minute + (hour >= 12 ? " PM" : " AM");
  }

  function formatTemperature(value) {
    return (value < 0 ? "−" : "") + Math.abs(value) + "°";
  }

  function temperatureAt(weather, time) {
    if (time <= 870) {
      const progress = clamp((time - 510) / 360, 0, 1);
      return Math.round(weather.morningTempC + (weather.highTempC - weather.morningTempC) * progress);
    }
    const progress = clamp((time - 870) / 90, 0, 1);
    return Math.round(weather.highTempC + (weather.closingTempC - weather.highTempC) * progress);
  }

  function evaluateRun(run) {
    const weather = getWeather();
    const elapsedHours = Math.max(0, (state.timeMinutes - 510) / 60);
    const freshSnow = weather.snowfallCm >= 5 && !run.groomedTonight;
    let score = run.baseScore;
    let why = "Ungroomed snow is settling under the day’s traffic.";

    if (freshSnow) {
      const trackRate = run.nearLift ? 0.18 : 0.07;
      const trackedOut = clamp(elapsedHours * run.popularity * trackRate, 0, 1);
      const depthBonus = clamp(weather.snowfallCm / 30, 0.5, 1.3);
      score = 8 + trackedOut * 51 - (depthBonus - 1) * 7 + Math.max(0, run.averagePitchDeg - 20) * 0.25;
      why = trackedOut > 0.55
        ? "Fresh snow is tracked out faster here because this run is popular and lift-close."
        : "Overnight snow on an ungroomed run is still soft and untracked.";
    } else if (run.groomedTonight) {
      const traffic = Math.round(elapsedHours * run.popularity * (run.nearLift ? 42 : 19));
      score = 27 + elapsedHours * run.popularity * (run.nearLift ? 4.5 : 2.4);
      why = traffic > 40
        ? "Groomed overnight, but about " + traffic + " riders since opening have scraped the surface."
        : "Groomed overnight; early traffic has left a smooth surface.";
    } else {
      const overnightCold = weather.morningTempC <= -12;
      score = Math.max(48, run.baseScore) + (overnightCold ? 25 : 7) + Math.max(0, run.averagePitchDeg - 25) * 0.45;
      why = overnightCold
        ? "Overnight cold with no grooming has left this face firm."
        : "Ungroomed snow is firming under overnight cold.";
    }

    const sunByAspect = { N: 0.12, NE: 0.24, E: 0.5, SE: 0.72, S: 1, SW: 0.95, W: 0.82, NW: 0.34 };
    const skyFactor = { bluebird: 1, cloudy: 0.48, "flat light": 0.2, snowing: 0.24 }[weather.sky];
    const sunHours = clamp((state.timeMinutes - 630) / 240, 0, 1);
    const warmth = clamp((weather.highTempC - weather.morningTempC) / 15, 0.25, 1.25);
    const softening = sunHours * sunByAspect[run.aspect] * skyFactor * warmth * 30;
    if (!freshSnow && softening > 5) {
      score -= softening;
      why = run.aspect === "N" || run.aspect === "NE"
        ? "North-facing terrain gets little sun and stays firm and cold."
        : run.aspect + "-facing snow is softening in the sun.";
    }

    if (state.timeMinutes > 870 && weather.closingTempC < weather.highTempC) {
      const refreeze = clamp((state.timeMinutes - 870) / 90, 0, 1) * (weather.highTempC - weather.closingTempC) * 2.7;
      score += refreeze;
      if (refreeze > 4) why = "Afternoon cooling is starting a refreeze on this exposed pitch.";
    }

    if (run.elevationBand === "alpine" && weather.windKph >= 30) {
      score += Math.min(18, (weather.windKph - 25) * 0.35);
      why = "Alpine wind is packing the exposed snow.";
    }

    score = Math.round(clamp(score, 0, 100));
    let condition;
    if (freshSnow && elapsedHours * run.popularity * (run.nearLift ? 0.18 : 0.07) < 0.55) condition = "powder";
    else if (run.elevationBand === "alpine" && weather.windKph >= 30 && score < 90) condition = "wind-packed";
    else if (score >= 78) condition = "icy";
    else if (run.groomedTonight && score < 48) condition = "groomed";
    else if (run.terrainType === "moguls" && score >= 35) condition = "moguls";
    else if (score >= 43) condition = "crud";
    else condition = run.groomedTonight ? "groomed" : "crud";

    const confidenceGain = Math.min(4, Math.floor(elapsedHours / 1.5));
    const windPenalty = weather.windKph >= 48 ? 5 : weather.windKph >= 30 ? 2 : 0;
    const skyPenalty = weather.sky === "flat light" ? 2 : 0;
    let confidence = clamp(run.confidence + confidenceGain - windPenalty - skyPenalty, 50, 99);
    const report = run.latestReport;
    if (report && report.scenarioId === state.scenarioId && Math.abs(report.time - state.timeMinutes) <= 30) {
      score = Math.round(score * 0.7 + CONDITIONS[report.condition].score * 0.3);
      condition = report.condition;
      why = "A rider just reported " + CONDITIONS[condition].label.toLowerCase() + " on this run.";
    }
    return { score: Math.round(clamp(score, 0, 100)), confidence: confidence, condition: condition, why: why };
  }

  function networkMetrics(riders) {
    return {
      riders: riders,
      covered: Math.min(NETWORK_CONFIG.mappedRunCount, Math.max(1, Math.round(NETWORK_CONFIG.mappedRunCount * (1 - Math.exp(-riders / NETWORK_CONFIG.coverageScale))))),
      accuracy: Math.round(NETWORK_CONFIG.accuracyBase + NETWORK_CONFIG.accuracyGain * (1 - Math.exp(-riders / NETWORK_CONFIG.accuracyScale))),
      age: Math.max(NETWORK_CONFIG.minimumDataAgeMinutes, Math.round(NETWORK_CONFIG.dataAgeBaseMinutes * Math.exp(-riders / NETWORK_CONFIG.dataAgeScale)))
    };
  }

  function getResortSnapshot(resort) {
    const previousResortId = state.resortId;
    state.resortId = resort.id;
    const forecasts = resort.runs.map(function (run) { return evaluateRun(run); });
    state.resortId = previousResortId;
    const averages = RESORTS.map(function (candidate) {
      const previousId = state.resortId;
      state.resortId = candidate.id;
      const candidateAverage = Math.round(candidate.runs.map(function (run) { return evaluateRun(run).score; }).reduce(function (total, score) { return total + score; }, 0) / candidate.runs.length);
      state.resortId = previousId;
      return { id: candidate.id, average: candidateAverage };
    });
    const ranked = averages.slice().sort(function (a, b) { return a.average - b.average; });
    const rankById = {};
    ranked.forEach(function (item, index) { rankById[item.id] = index; });
    const averageScore = averages.find(function (item) { return item.id === resort.id; }).average;
    const metrics = networkMetrics(resort.activeRiders);
    const resortRank = rankById[resort.id];
    let verdict = resortRank === 0
      ? "Softest snow today"
      : resortRank === 2
        ? "Firm — go early"
        : "Mixed conditions";
    return {
      averageScore: averageScore,
      freshPercent: Math.round(metrics.covered / NETWORK_CONFIG.mappedRunCount * 100),
      activeRiders: resort.activeRiders,
      verdict: verdict
    };
  }

  function persistRiderProfile() {
    writeStorage(STORAGE.profile, state.riderProfile);
  }

  function showDemoMessage() {
    const toast = document.getElementById("demo-toast");
    if (!toast) return;
    toast.hidden = false;
    if (showDemoMessage.timer) window.clearTimeout(showDemoMessage.timer);
    showDemoMessage.timer = window.setTimeout(function () { toast.hidden = true; }, 3200);
  }

  function bindDemoButtons(page) {
    if (!page) return;
    page.querySelectorAll(".demo-only").forEach(function (button) {
      button.addEventListener("click", showDemoMessage);
    });
  }

  function saveReports() {
    const records = {};
    RESORTS.forEach(function (resort) {
      resort.runs.forEach(function (run) {
        records[run.id] = { reports: run.reports, confidence: run.confidence, latestReport: run.latestReport };
      });
    });
    writeStorage(STORAGE.reports, records);
  }

  function restoreReports() {
    const records = readStorage(STORAGE.reports, {});
    if (!records || typeof records !== "object" || Array.isArray(records)) return;
    RESORTS.forEach(function (resort) {
      resort.runs.forEach(function (run) {
        const saved = records[run.id];
        if (!saved || typeof saved !== "object") return;
        if (Number.isFinite(Number(saved.reports))) run.reports = Math.max(0, Number(saved.reports));
        if (Number.isFinite(Number(saved.confidence))) run.confidence = clamp(Number(saved.confidence), 0, 99);
        const report = saved.latestReport;
        if (report && CONDITIONS[report.condition] && Number.isFinite(Number(report.time)) && isKnownScenario(report.scenarioId)) {
          run.latestReport = { condition: report.condition, time: Number(report.time), scenarioId: report.scenarioId };
        }
      });
    });
  }

  function renderAll() {
    ["home", "map", "report", "network", "resorts", "pricing", "profile"].forEach(function (name) {
      if (!renderers[name]) return;
      try {
        renderers[name]();
      } catch (error) {
        console.error("[Føre] " + name + " render failed:", error);
      }
    });
  }

  function renderMountainShape(shapeGroup, treeGroup, resort) {
    if (!shapeGroup || !treeGroup) return;
    shapeGroup.replaceChildren();
    treeGroup.replaceChildren();

    const ns = "http://www.w3.org/2000/svg";
    const paths = {
      "mount-halvard": [
        "M30 650 L75 610 L118 622 L164 548 L205 556 L268 438 L316 447 L378 278 L421 290 L474 118 L512 126 L548 220 L586 238 L620 350 L678 340 L728 202 L768 214 L820 132 L856 144 L912 286 L958 278 L1010 410 L1060 398 L1122 530 L1170 650Z",
        "M474 118 L512 126 L548 220 L586 238 L620 350 L678 340 L728 202 L768 214 L820 132 L856 144 L912 286 L958 278 L1010 410 L1060 398 L1122 530 L1170 650Z",
        "M620 350 C600 390 562 420 530 438 C500 454 470 472 438 500 C505 512 574 532 640 566 C706 530 772 502 828 478 C748 450 684 392 620 350Z"
      ],
      "sableback-ridge": [
        "M30 650 L104 588 L168 596 L238 520 L300 532 L365 402 L430 414 L488 286 L548 302 L608 178 L660 194 L716 112 L756 126 L805 246 L854 238 L912 330 L972 318 L1034 448 L1088 440 L1138 548 L1170 650Z",
        "M716 112 L756 126 L805 246 L854 238 L912 330 L972 318 L1034 448 L1088 440 L1138 548 L1170 650Z"
      ],
      "pineglass-mountain": [
        "M30 650 L82 612 L126 578 L176 586 L220 520 L268 528 L318 408 L370 420 L420 318 L470 330 L526 214 L572 230 L626 118 L666 134 L718 252 L766 238 L820 338 L872 326 L928 430 L980 418 L1034 520 L1084 512 L1140 600 L1170 650Z",
        "M526 214 L572 230 L626 118 L666 134 L718 252 L766 238 L820 338 L872 326 L928 430 L980 418 L1034 520 L1084 512 L1140 600 L1170 650Z",
        "M318 408 C350 444 390 470 438 490 C488 512 520 550 548 650 L240 650Z",
        "M820 338 C860 380 896 420 924 462 C954 506 978 570 1002 650 L710 650Z"
      ]
    };
    (paths[resort.id] || paths["mount-halvard"]).forEach(function (data, index) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", data);
      path.setAttribute("class", index === 0 ? "mountain-base" : "mountain-snow");
      shapeGroup.append(path);
    });
    const clipPath = document.getElementById("mountain-clip-path");
    if (clipPath) clipPath.setAttribute("d", paths[resort.id][0]);

    const treePositions = resort.id === "pineglass-mountain"
      ? [[170,600],[220,550],[260,500],[300,450],[345,390],[390,340],[435,290],[485,250],[535,215],[585,190],[640,210],[690,250],[740,300],[790,350],[840,410],[890,470],[940,530],[990,580],[1040,610],[730,580],[650,560],[570,570],[490,590],[410,610],[330,580]]
      : resort.id === "sableback-ridge"
        ? [[150,600],[210,620],[270,590],[350,620],[870,620],[930,590],[990,610],[1050,580],[1110,615]]
        : [[170,610],[230,590],[275,620],[335,600],[870,610],[930,590],[990,620],[1040,600],[1100,620]];
    treePositions.forEach(function (position) {
      const tree = document.createElementNS(ns, "path");
      tree.setAttribute("d", "M" + position[0] + " " + position[1] + " l18 28 h-10 l14 20 h-44 l14-20 h-10Z");
      tree.setAttribute("class", "map-tree");
      treeGroup.append(tree);
    });
    if (resort.id === "pineglass-mountain") {
      [["M250 520 C300 500 350 510 390 550 C350 580 300 575 250 520Z", "map-glade"],
       ["M820 470 C870 445 920 460 950 500 C910 530 860 525 820 470Z", "map-glade"],
       ["M430 350 C470 330 510 345 540 380 C500 410 455 400 430 350Z", "map-glade"]].forEach(function (glade) {
        const gladePath = document.createElementNS(ns, "path");
        gladePath.setAttribute("d", glade[0]);
        gladePath.setAttribute("class", glade[1]);
        treeGroup.append(gladePath);
      });
    }
  }

  function initHome() {
    const page = document.getElementById("home");
    if (!page) return;
    try {
      const elements = collectElements(page, ["home-rider-count", "home-runs-covered", "home-accuracy", "home-data-age", "home-runs-bar", "home-accuracy-bar", "home-age-bar", "hero-resort-name", "home-phone-resort", "mountain-title", "hero-run-count", "home-run-name", "home-score", "home-gauge-meter", "home-condition-icon", "home-condition", "home-aspect", "resort-comparisons"]);
      if (!elements) return;
      renderers.home = function () {
        const resort = currentResort();
        const run = getRun(state.selectedRunId);
        if (!run) return;
        const forecast = evaluateRun(run);
        const metrics = networkMetrics(state.networkRiders);
        setAnimatedNumber(elements["home-rider-count"], state.activeRiders);
        elements["home-rider-count"].dataset.countTarget = String(state.activeRiders);
        setAnimatedNumber(elements["home-runs-covered"], metrics.covered);
        elements["home-runs-covered"].dataset.countTarget = String(metrics.covered);
        setAnimatedNumber(elements["home-accuracy"], metrics.accuracy);
        elements["home-accuracy"].dataset.countTarget = String(metrics.accuracy);
        setAnimatedNumber(elements["home-data-age"], metrics.age);
        elements["home-data-age"].dataset.countTarget = String(metrics.age);
        elements["home-runs-bar"].style.setProperty("--bar", metrics.covered / NETWORK_CONFIG.mappedRunCount * 100 + "%");
        elements["home-accuracy-bar"].style.setProperty("--bar", metrics.accuracy + "%");
        elements["home-age-bar"].style.setProperty("--bar", metrics.age / NETWORK_CONFIG.dataAgeBaseMinutes * 100 + "%");
        elements["hero-resort-name"].textContent = resort.name.toUpperCase();
        elements["home-phone-resort"].textContent = resort.name.toUpperCase();
        elements["mountain-title"].textContent = "A fresh line down " + resort.name;
        elements["hero-run-count"].textContent = NETWORK_CONFIG.mappedRunCount + " mapped runs";
        elements["home-run-name"].textContent = run.name;
        setAnimatedNumber(elements["home-score"], forecast.score);
        elements["home-gauge-meter"].style.strokeDashoffset = String(100 - forecast.score);
        setIcon(elements["home-condition-icon"], forecast.condition);
        elements["home-condition"].textContent = CONDITIONS[forecast.condition].label;
        elements["home-aspect"].textContent = run.aspect + " · " + run.elevationBand.toUpperCase();
        renderResortComparisons(elements["resort-comparisons"]);
      };
      renderers.home();

      const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion && typeof window.IntersectionObserver === "function") {
        const observer = new window.IntersectionObserver(function (entries, currentObserver) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            const counter = entry.target;
            const target = Number(counter.dataset.countTarget);
            const start = performance.now();
            function tick(now) {
              const progress = Math.min(1, (now - start) / 800);
              counter.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString();
              if (progress < 1) window.requestAnimationFrame(tick);
            }
            window.requestAnimationFrame(tick);
            currentObserver.unobserve(counter);
          });
        }, { threshold: 0.6 });
        page.querySelectorAll("[data-count-target]").forEach(function (counter) { observer.observe(counter); });
      }
      elements["resort-comparisons"].addEventListener("click", function (event) {
        const button = event.target.closest("[data-compare-resort]");
        if (!button) return;
        chooseResort(button.dataset.compareResort);
      });
    } catch (error) {
      console.error("[Føre] Home initialization failed:", error);
    }
  }

  function renderResortComparisons(container) {
    if (!container) return;
    container.replaceChildren();
    RESORTS.forEach(function (resort) {
      const snapshot = getResortSnapshot(resort);
      const card = document.createElement("article");
      card.className = "comparison-card" + (resort.id === state.resortId ? " is-current" : "");
      const heading = document.createElement("div");
      heading.className = "comparison-card-heading";
      const name = document.createElement("h3");
      name.textContent = resort.name;
      const region = document.createElement("span");
      region.textContent = resort.region;
      heading.append(name, region);
      const stats = document.createElement("div");
      stats.className = "comparison-stats";
      [[snapshot.averageScore, "avg Chatter"], [snapshot.freshPercent + "%", "fresh reads"], [snapshot.activeRiders.toLocaleString(), "active riders"]].forEach(function (stat) {
        const item = document.createElement("div");
        const value = document.createElement("strong");
        value.textContent = stat[0];
        const label = document.createElement("span");
        label.textContent = stat[1];
        item.append(value, label);
        stats.append(item);
      });
      const verdict = document.createElement("p");
      verdict.className = "comparison-verdict";
      verdict.textContent = snapshot.verdict;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-button";
      button.dataset.compareResort = resort.id;
      button.textContent = resort.id === state.resortId ? "Viewing this resort" : "Open snow map →";
      card.append(heading, stats, verdict, button);
      container.append(card);
    });
  }

  function initSnowMap() {
    const page = document.getElementById("map");
    if (!page) return;
    try {
      const elements = collectElements(page, ["resort-select", "scenario-select", "day-slider", "day-time", "fore-tip", "trail-map", "trail-lines", "map-terrain", "map-mountain-shape", "map-trees", "map-ridges", "map-lifts", "map-resort-region", "spec-resort-name", "spec-region", "spec-base", "spec-summit", "spec-vertical", "spec-runs-lifts", "spec-snowfall", "weather-scenario-name", "weather-snowfall", "weather-temp", "weather-wind", "weather-freezing", "weather-sky", "weather-glance-temp", "weather-glance-sky", "weather-glyph", "wind-warning", "wind-warning-text", "map-live-summary", "map-summit", "run-name", "run-meta", "run-elevation-band", "run-terrain", "run-grooming", "run-condition", "run-condition-icon", "run-confidence", "run-score", "run-gauge-meter", "run-reports", "run-updated", "run-why", "runs-list", "lift-status-list"]);
      if (!elements) return;
      const mapModeButtons = page.querySelectorAll("[data-map-mode]");

      function populateResorts() {
        elements["resort-select"].replaceChildren();
        RESORTS.forEach(function (resort) {
          const option = document.createElement("option");
          option.value = resort.id;
          option.textContent = resort.name;
          elements["resort-select"].append(option);
        });
        elements["resort-select"].value = state.resortId;
      }

      function renderSpecs() {
        const resort = currentResort();
        const compact = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
        elements["map-resort-region"].textContent = resort.name + " · " + resort.region;
        elements["spec-resort-name"].textContent = resort.name;
        elements["spec-region"].textContent = resort.region;
        elements["spec-base"].innerHTML = resort.baseElevationM.toLocaleString() + " <small>m</small>";
        elements["spec-summit"].innerHTML = resort.summitElevationM.toLocaleString() + " <small>m</small>";
        elements["spec-vertical"].innerHTML = resort.verticalDropM.toLocaleString() + " <small>m</small>";
        elements["spec-runs-lifts"].textContent = resort.totalRuns + " · " + resort.liftCount;
        elements["spec-snowfall"].innerHTML = resort.annualSnowfallCm.toLocaleString() + " <small>cm</small>";
        elements["map-live-summary"].textContent = NETWORK_CONFIG.mappedRunCount + " MAPPED RUNS · CURRENT CONDITIONS";
        elements["map-summit"].textContent = "SUMMIT · " + resort.summitElevationM.toLocaleString() + " M";
        elements["map-summit"].setAttribute("x", resort.mapLayout.summitX);
        elements["trail-map"].setAttribute("aria-label", "Interactive trail map of " + resort.name);
        elements["trail-map"].setAttribute("viewBox", compact ? "0 0 1200 1500" : "0 0 1200 720");
        elements["map-terrain"].setAttribute("transform", compact ? "scale(1 2.1)" : "");
        const resortPageSelect = document.getElementById("resorts-select");
        if (resortPageSelect) resortPageSelect.value = resort.id;
        const resortLiftRoutes = {
          "mount-halvard": [
            { path: "M600 650 474 118", name: "Northwind Chair", top: "474 118" },
            { path: "M600 650 820 132", name: "Twin Peak Quad", top: "820 132" },
            { path: "M600 650 620 350", name: "Bowl T-Bar", top: "620 350" }
          ],
          "sableback-ridge": [
            { path: "M600 650 716 112", name: "Ridge Quad", top: "716 112" },
            { path: "M600 650 365 402", name: "West Spur", top: "365 402" },
            { path: "M600 650 912 330", name: "Summit Express", top: "912 330" }
          ],
          "pineglass-mountain": [
            { path: "M600 650 626 118", name: "Glade Chair", top: "626 118" },
            { path: "M600 650 420 318", name: "Cedar Triple", top: "420 318" },
            { path: "M600 650 872 326", name: "Pine Peak Lift", top: "872 326" }
          ]
        };
        const mapLayers = [[elements["map-ridges"], resort.mapLayout.ridges, "map-ridge"]];
        mapLayers.forEach(function (layer) {
          layer[0].replaceChildren();
          layer[1].forEach(function (pathData) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("class", layer[2]);
            layer[0].append(path);
          });
        });
        elements["map-lifts"].replaceChildren();
        resortLiftRoutes[resort.id].forEach(function (lift, liftIndex) {
          const top = lift.top.split(" ").map(Number);
          const cable = document.createElementNS("http://www.w3.org/2000/svg", "path");
          cable.setAttribute("d", lift.path);
          cable.setAttribute("class", "chairlift-cable");
          cable.setAttribute("clip-path", "url(#mountain-clip)");
          elements["map-lifts"].append(cable);
          for (let chairIndex = 1; chairIndex <= 5; chairIndex += 1) {
            const chairProgress = chairIndex / 6;
            const chairX = 600 + (top[0] - 600) * chairProgress;
            const chairY = 650 + (top[1] - 650) * chairProgress;
            const chair = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            chair.setAttribute("cx", chairX);
            chair.setAttribute("cy", chairY);
            chair.setAttribute("r", "4");
            chair.setAttribute("class", "chairlift-chair");
            elements["map-lifts"].append(chair);
          }
          const bottomStation = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          bottomStation.setAttribute("x", 587 + liftIndex * 8);
          bottomStation.setAttribute("y", 642);
          bottomStation.setAttribute("width", "26");
          bottomStation.setAttribute("height", "16");
          bottomStation.setAttribute("rx", "3");
          bottomStation.setAttribute("class", "lift-station");
          elements["map-lifts"].append(bottomStation);
          const topStation = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          topStation.setAttribute("x", top[0] - 12);
          topStation.setAttribute("y", top[1] - 7);
          topStation.setAttribute("width", "24");
          topStation.setAttribute("height", "14");
          topStation.setAttribute("rx", "3");
          topStation.setAttribute("class", "lift-station");
          elements["map-lifts"].append(topStation);
          const stationLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
          stationLabel.setAttribute("x", 600 + liftIndex * 82);
          stationLabel.setAttribute("y", 625);
          stationLabel.setAttribute("text-anchor", "middle");
          stationLabel.setAttribute("class", "lift-name");
          stationLabel.textContent = lift.name;
          elements["map-lifts"].append(stationLabel);
        });
        elements["lift-status-list"].replaceChildren();
        const windHold = state.scenarioId === "windyColdDay";
        resortLiftRoutes[resort.id].forEach(function (lift, liftIndex) {
          const item = document.createElement("span");
          item.className = "lift-status " + (windHold && liftIndex === 0 ? "wind-hold" : "open");
          item.innerHTML = "<strong>" + lift.name + "</strong> " + (windHold && liftIndex === 0 ? "Wind hold" : "Open");
          elements["lift-status-list"].append(item);
        });
        renderMountainShape(elements["map-mountain-shape"], elements["map-trees"], resort);
      }

      function renderWeather() {
        const weather = getWeather();
        const temperature = temperatureAt(weather, state.timeMinutes);
        elements["weather-scenario-name"].textContent = WEATHER_SCENARIOS[state.scenarioId].label;
        elements["weather-snowfall"].innerHTML = weather.snowfallCm + " <small>cm</small>";
        elements["weather-temp"].innerHTML = formatTemperature(temperature).replace("°", "") + " <small>°C</small>";
        elements["weather-wind"].innerHTML = weather.windKph + " <small>km/h</small>";
        elements["weather-freezing"].innerHTML = weather.freezingLevelM.toLocaleString() + " <small>m</small>";
        elements["weather-sky"].textContent = weather.sky.charAt(0).toUpperCase() + weather.sky.slice(1);
        elements["weather-glance-temp"].textContent = formatTemperature(temperature);
        elements["weather-glance-sky"].textContent = weather.sky.charAt(0).toUpperCase() + weather.sky.slice(1) + " · " + weather.windKph + " km/h";
        elements["weather-glyph"].textContent =
          weather.sky === "snowing" ? "❄" :
          weather.sky === "cloudy" || weather.sky === "flat light" ? "☁" : "☀";
        elements["wind-warning"].hidden = weather.windKph < 48;
        elements["wind-warning-text"].textContent = currentResort().upperLiftName + " is paused at " + weather.windKph + " km/h summit wind.";
        elements["day-time"].textContent = formatTime(state.timeMinutes);
        elements["fore-tip"].textContent = getForeTip(weather);
      }

      function renderMap() {
        elements["trail-lines"].replaceChildren();
        const animateTrails = !state.mapHasRendered && !page.hidden;
        const compact = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
        const mapWidth = elements["trail-map"].getBoundingClientRect ? elements["trail-map"].getBoundingClientRect().width || (compact ? 360 : 800) : (compact ? 360 : 800);
        const mapScale = Math.max(0.2, mapWidth / 1200);
        const px = function (value) { return value / mapScale; };
        const placedCircles = [];
        currentRuns().forEach(function (run, index) {
          const forecast = evaluateRun(run);
          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.setAttribute("clip-path", "url(#mountain-clip)");
          const scoreBand = forecast.score < 34 ? "low" : forecast.score < 67 ? "mid" : "high";
          const modeClass = state.mapMode === "score" ? " score-mode score-" + scoreBand : " condition-mode";
          group.setAttribute("class", "trail-target condition-" + forecast.condition + modeClass + (run.id === state.selectedRunId ? " is-selected" : ""));
          group.setAttribute("data-run-id", run.id);
          group.setAttribute("tabindex", "0");
          group.setAttribute("role", "button");
          group.setAttribute("aria-label", run.name + ", " + CONDITIONS[forecast.condition].label + ", Chatter Score " + forecast.score);
          group.style.setProperty("--trail-width", px(10) + "px");
          group.style.setProperty("--trail-hit-width", px(34) + "px");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("class", "trail-stroke");
          path.setAttribute("d", compact ? run.mobilePath : run.path);
          path.setAttribute("pathLength", "1");
          path.style.strokeDasharray = "1";
          path.style.strokeDashoffset = animateTrails ? "1" : "0";
          const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
          hitbox.setAttribute("class", "trail-hitbox");
          hitbox.setAttribute("d", compact ? run.mobilePath : run.path);
          hitbox.setAttribute("aria-hidden", "true");
          const markerProgresses = [0.28, 0.38, 0.31, 0.52, 0.43, 0.57, 0.34, 0.46, 0.60, 0.26, 0.55, 0.49];
          let markerProgress = markerProgresses[index];
          let markerX = 600;
          let markerY = 300;
          const markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          markerPath.setAttribute("d", compact ? run.mobilePath : run.path);
          elements["trail-map"].append(markerPath);
          if (typeof markerPath.getTotalLength === "function") {
            const length = markerPath.getTotalLength();
            const point = markerPath.getPointAtLength(length * markerProgress);
            markerX = point.x;
            markerY = point.y;
          }
          for (let attempt = 0; attempt < 24; attempt += 1) {
            if (!placedCircles.some(function (circle) { return Math.hypot(circle.x - markerX, circle.y - markerY) < 28; })) break;
            markerProgress = Math.min(0.60, markerProgress + 0.018);
            if (typeof markerPath.getTotalLength === "function") {
              const length = markerPath.getTotalLength();
              const point = markerPath.getPointAtLength(length * markerProgress);
              markerX = point.x;
              markerY = point.y;
            }
          }
          markerPath.remove();
          markerX = clamp(markerX, 26, 1174);
          markerY = clamp(markerY, 26, compact ? 1474 : 694);
          placedCircles.push({ x: markerX, y: markerY });

          const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
          marker.setAttribute("class", "run-marker");
          marker.setAttribute("aria-hidden", "true");
          const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
          tooltip.textContent = run.name + " — " + forecast.condition.replace("-", " ") + " — Chatter " + forecast.score;
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", markerX);
          circle.setAttribute("cy", markerY);
          circle.setAttribute("r", compact ? 20 : 16);
          circle.setAttribute("class", "run-marker-circle condition-" + forecast.condition);
          const number = document.createElementNS("http://www.w3.org/2000/svg", "text");
          number.setAttribute("x", markerX);
          number.setAttribute("y", markerY + (compact ? 7 : 5));
          number.setAttribute("class", "run-marker-number");
          number.setAttribute("text-anchor", "middle");
          number.textContent = String(index + 1);
          marker.append(tooltip, circle, number);
          group.append(hitbox, path, marker);
          elements["trail-lines"].append(group);
          if (animateTrails && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(function () { path.style.strokeDashoffset = "0"; });
          }
        });
        if (animateTrails) state.mapHasRendered = true;
        mapModeButtons.forEach(function (button) {
          const selected = button.dataset.mapMode === state.mapMode;
          button.setAttribute("aria-pressed", selected ? "true" : "false");
          button.classList.toggle("is-active", selected);
        });
      }

      function renderDetails() {
        const run = getRun(state.selectedRunId);
        if (!run) return;
        const forecast = evaluateRun(run);
        elements["run-name"].textContent = run.name;
        elements["run-meta"].textContent = run.difficulty.replace(/^./, function (letter) { return letter.toUpperCase(); }) + " · " + run.aspect + " aspect · " + run.averagePitchDeg + "° average pitch";
        elements["run-elevation-band"].textContent = run.elevationBand.charAt(0).toUpperCase() + run.elevationBand.slice(1) + " elevation";
        elements["run-terrain"].textContent = run.terrainType.charAt(0).toUpperCase() + run.terrainType.slice(1);
        elements["run-grooming"].textContent = run.groomedTonight ? "Groomed tonight" : "Ungroomed tonight";
        elements["run-condition"].textContent = CONDITIONS[forecast.condition].label;
        elements["run-confidence"].textContent = forecast.confidence + "% confidence";
        setAnimatedNumber(elements["run-score"], forecast.score);
        elements["run-gauge-meter"].style.strokeDashoffset = String(100 - forecast.score);
        setAnimatedNumber(elements["run-reports"], run.reports);
        const age = run.latestReport && run.latestReport.scenarioId === state.scenarioId
          ? Math.round(Math.abs(state.timeMinutes - run.latestReport.time))
          : Math.max(1, Math.round(2 + Math.max(0, state.timeMinutes - 510) / 60 * 3 + run.popularity * 4));
        elements["run-updated"].textContent = "Updated " + (age < 1 ? "just now" : age + " min ago");
        setIcon(elements["run-condition-icon"], forecast.condition);
        elements["run-why"].textContent = forecast.why;
      }

      function renderRunsList() {
        elements["runs-list"].replaceChildren();
        currentRuns().forEach(function (run, index) {
          const forecast = evaluateRun(run);
          const row = document.createElement("li");
          row.className = "run-list-row" + (run.id === state.selectedRunId ? " is-selected" : "");
          row.setAttribute("tabindex", "0");
          row.setAttribute("role", "button");
          row.dataset.runId = run.id;
          row.setAttribute("aria-label", "Select " + run.name);

          const number = document.createElement("span");
          number.className = "run-list-number";
          number.textContent = String(index + 1);
          const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          icon.setAttribute("class", "condition-icon " + forecast.condition);
          icon.setAttribute("viewBox", "0 0 24 24");
          icon.setAttribute("aria-hidden", "true");
          const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
          use.setAttribute("href", "#icon-" + forecast.condition);
          icon.append(use);
          const name = document.createElement("strong");
          name.textContent = run.name;
          const difficulty = document.createElement("span");
          difficulty.className = "run-list-difficulty";
          difficulty.textContent = run.difficulty.replace(/^./, function (letter) { return letter.toUpperCase(); });
          const score = document.createElement("strong");
          score.className = "run-list-score";
          score.textContent = String(forecast.score);
          row.append(number, icon, name, difficulty, score);
          elements["runs-list"].append(row);
        });
      }

      renderers.map = function () {
        renderSpecs();
        renderWeather();
        renderMap();
        renderDetails();
        renderRunsList();
      };
      populateResorts();
      elements["scenario-select"].value = state.scenarioId;
      elements["day-slider"].value = state.timeMinutes;
      mapModeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          state.mapMode = button.dataset.mapMode === "score" ? "score" : "condition";
          renderers.map();
        });
      });
      elements["resort-select"].addEventListener("change", function () {
        chooseResort(elements["resort-select"].value, true);
      });
      elements["scenario-select"].addEventListener("change", function () {
        state.scenarioId = isKnownScenario(elements["scenario-select"].value) ? elements["scenario-select"].value : FORE_DEFAULTS.scenarioId;
        writeStorage(STORAGE.scenario, state.scenarioId);
        renderAll();
      });
      elements["day-slider"].addEventListener("input", function () {
        state.timeMinutes = clamp(Number(elements["day-slider"].value) || FORE_DEFAULTS.timeMinutes, 510, 960);
        writeStorage(STORAGE.time, state.timeMinutes);
        renderAll();
      });
      elements["trail-lines"].addEventListener("click", function (event) {
        const target = event.target.closest("[data-run-id]");
        if (target) selectRun(target.dataset.runId);
      });
      elements["runs-list"].addEventListener("click", function (event) {
        const target = event.target.closest("[data-run-id]");
        if (target) selectRun(target.dataset.runId);
      });
      elements["runs-list"].addEventListener("keydown", function (event) {
        if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-run-id]")) {
          event.preventDefault();
          selectRun(event.target.dataset.runId);
        }
      });
      elements["trail-lines"].addEventListener("keydown", function (event) {
        if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-run-id]")) {
          event.preventDefault();
          selectRun(event.target.dataset.runId);
        }
      });
      renderers.map();
    } catch (error) {
      console.error("[Føre] Snow map initialization failed:", error);
    }
  }

  function getForeTip(weather) {
    if (state.timeMinutes < 630) return formatTime(state.timeMinutes) + " — North faces are firm. Hit the groomers early.";
    if (weather.windKph >= 48) return formatTime(state.timeMinutes) + " — Summit wind is high. Check the upper-lift hold before heading up.";
    if (state.timeMinutes < 750) return formatTime(state.timeMinutes) + " — South- and west-facing snow is starting to soften in the sun.";
    if (state.timeMinutes < 870) return formatTime(state.timeMinutes) + " — South-facing bowls are softening; north trees stay cooler.";
    return formatTime(state.timeMinutes) + " — Temperatures are falling. Expect a refreeze on exposed pitches.";
  }

  function initReport() {
    const page = document.getElementById("report");
    if (!page) return;
    try {
      const elements = collectElements(page, ["report-form", "report-run", "submit-report", "report-run-hint", "report-feedback"]);
      if (!elements) return;
      const conditionButtons = page.querySelectorAll(".condition-option");
      if (!conditionButtons.length) {
        console.error("[Føre] No report condition buttons were found.");
        return;
      }

      renderers.report = function () {
        elements["report-run"].replaceChildren();
        currentRuns().forEach(function (run) {
          const option = document.createElement("option");
          option.value = run.id;
          option.textContent = run.name;
          elements["report-run"].append(option);
        });
        const selection = currentRuns().some(function (run) { return run.id === state.selectedRunId; }) ? state.selectedRunId : currentRuns()[0].id;
        elements["report-run"].value = selection;
        const run = getRun(selection);
        if (run) elements["report-run-hint"].textContent = "Reporting for " + run.name + " · " + run.reports + " rider reports this hour";
        conditionButtons.forEach(function (button) {
          button.setAttribute("aria-pressed", button.dataset.condition === state.selectedReportCondition ? "true" : "false");
        });
        elements["submit-report"].disabled = !state.selectedReportCondition;
      };

      elements["report-run"].addEventListener("change", function () {
        state.selectedRunId = elements["report-run"].value;
        writeStorage(STORAGE.selectedRun, state.selectedRunId);
        renderAll();
      });
      conditionButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          state.selectedReportCondition = button.dataset.condition;
          renderers.report();
        });
      });
      elements["report-form"].addEventListener("submit", function (event) {
        event.preventDefault();
        const run = getRun(elements["report-run"].value);
        const condition = state.selectedReportCondition;
        if (!run || !condition || !CONDITIONS[condition]) return;
        const previousConfidence = evaluateRun(run).confidence;
        run.reports += 1;
        run.confidence = Math.min(99, run.confidence + 2);
        run.latestReport = { condition: condition, time: state.timeMinutes, scenarioId: state.scenarioId };
        state.selectedRunId = run.id;
        state.riderProfile.runsReported += 1;
        state.riderProfile.ridersHelped += 1;
        state.riderProfile.seasonHistory.unshift({
          date: "Today",
          resortId: currentResort().id,
          resortName: currentResort().name,
          runName: run.name,
          condition: CONDITIONS[condition].label,
          score: evaluateRun(run).score
        });
        state.riderProfile.seasonHistory = state.riderProfile.seasonHistory.slice(0, 25);
        state.pendingSyncRuns += 1;
        state.selectedReportCondition = null;
        saveReports();
        persistRiderProfile();
        writeStorage(STORAGE.pendingSync, state.pendingSyncRuns);
        const updatedConfidence = evaluateRun(run).confidence;
        elements["report-feedback"].textContent = "Thanks! " + run.name + " confidence " + previousConfidence + "% → " + updatedConfidence + "%";
        renderAll();
        updateSyncLabel();
      });
      renderers.report();
    } catch (error) {
      console.error("[Føre] Report initialization failed:", error);
    }
  }

  function initNetwork() {
    const page = document.getElementById("network");
    if (!page) return;
    try {
      const elements = collectElements(page, ["rider-slider", "rider-count", "coverage-value", "coverage-bar", "accuracy-value", "accuracy-bar", "age-value", "age-bar", "network-context", "accuracy-chart-line", "accuracy-chart-dot"]);
      if (!elements) return;
      function renderAccuracyChart() {
        const left = 56, right = 736, top = 35, bottom = 185;
        const points = [];
        for (let index = 0; index <= 24; index += 1) {
          const riders = 10 + (1990 * index / 24);
          const metrics = networkMetrics(riders);
          const x = left + ((riders - 10) / 1990) * (right - left);
          const y = bottom - ((metrics.accuracy - 40) / 60) * (bottom - top);
          points.push([x, y]);
        }
        elements["accuracy-chart-line"].setAttribute("d", points.map(function (point, index) { return (index ? "L" : "M") + point[0].toFixed(1) + " " + point[1].toFixed(1); }).join(" "));
        const metrics = networkMetrics(state.networkRiders);
        const x = left + ((metrics.riders - 10) / 1990) * (right - left);
        const y = bottom - ((metrics.accuracy - 40) / 60) * (bottom - top);
        elements["accuracy-chart-dot"].setAttribute("cx", x.toFixed(1));
        elements["accuracy-chart-dot"].setAttribute("cy", y.toFixed(1));
      }
      renderers.network = function () {
        const metrics = networkMetrics(state.networkRiders);
        elements["rider-slider"].value = state.networkRiders;
        setAnimatedNumber(elements["rider-count"], metrics.riders);
        setAnimatedNumber(elements["coverage-value"], metrics.covered, " <small>/ " + NETWORK_CONFIG.mappedRunCount + " mapped</small>");
        elements["coverage-bar"].style.width = metrics.covered / NETWORK_CONFIG.mappedRunCount * 100 + "%";
        setAnimatedNumber(elements["accuracy-value"], metrics.accuracy, "<small>%</small>");
        elements["accuracy-bar"].style.width = metrics.accuracy + "%";
        setAnimatedNumber(elements["age-value"], metrics.age, "<small> min</small>");
        elements["age-bar"].style.width = metrics.age / NETWORK_CONFIG.dataAgeBaseMinutes * 100 + "%";
        elements["network-context"].textContent = metrics.riders < 180
          ? "At " + metrics.riders.toLocaleString() + " riders, the busiest mapped runs start to come into focus."
          : metrics.covered === NETWORK_CONFIG.mappedRunCount
            ? "At " + metrics.riders.toLocaleString() + " riders, all 12 mapped runs have a fresh read."
            : "At " + metrics.riders.toLocaleString() + " riders, " + metrics.covered + " of 12 mapped runs have a fresh read.";
          renderAccuracyChart();
      };
      elements["rider-slider"].value = state.networkRiders;
      elements["rider-slider"].addEventListener("input", function () {
        state.networkRiders = clamp(Number(elements["rider-slider"].value) || NETWORK_CONFIG.homeRiderCount, 10, 2000);
        renderAll();
      });
      renderers.network();
    } catch (error) {
      console.error("[Føre] Network initialization failed:", error);
    }
  }

  function initPricing() {
    const page = document.getElementById("pricing");
    if (!page) return;
    try {
      const elements = collectElements(page, ["pricing-resort-name", "fore-plus-price"]);
      if (!elements) return;
      renderers.pricing = function () {
        elements["pricing-resort-name"].textContent = currentResort().name;
        elements["fore-plus-price"].textContent = "$" + BUSINESS_PLAN.forePlusPricePerSeason;
      };
      bindDemoButtons(page);
      renderers.pricing();
    } catch (error) {
      console.error("[Føre] Pricing initialization failed:", error);
    }
  }

  function initProfile() {
    const page = document.getElementById("profile");
    if (!page) return;
    try {
      const elements = collectElements(page, ["profile-name", "profile-location", "profile-level", "profile-streak", "profile-days", "profile-reports", "profile-helped", "history-count", "profile-history"]);
      if (!elements) return;
      renderers.profile = function () {
        const rider = state.riderProfile;
        elements["profile-name"].textContent = rider.name;
        elements["profile-location"].textContent = rider.location;
        elements["profile-level"].textContent = rider.level;
        setAnimatedNumber(elements["profile-streak"], rider.streakDays);
        setAnimatedNumber(elements["profile-days"], rider.daysRidden);
        setAnimatedNumber(elements["profile-reports"], rider.runsReported);
        setAnimatedNumber(elements["profile-helped"], rider.ridersHelped);
        elements["history-count"].textContent = rider.seasonHistory.length + " days on record";
        elements["profile-history"].replaceChildren();
        rider.seasonHistory.forEach(function (entry) {
          const row = document.createElement("li");
          const date = document.createElement("time");
          date.textContent = entry.date;
          const details = document.createElement("div");
          const runName = document.createElement("strong");
          runName.textContent = entry.runName;
          const resort = document.createElement("span");
          resort.textContent = entry.resortName + " · " + entry.condition;
          details.append(runName, resort);
          const score = document.createElement("strong");
          score.className = "history-score";
          score.textContent = String(entry.score);
          row.append(date, details, score);
          elements["profile-history"].append(row);
        });
      };
      renderers.profile();
    } catch (error) {
      console.error("[Føre] Rider profile initialization failed:", error);
    }
  }

  function initResorts() {
    const page = document.getElementById("resorts");
    if (!page) return;
    try {
      const elements = collectElements(page, ["resorts-select", "ops-resort-name", "ops-resort-region", "ops-season-price", "ranked-runs", "grooming-priorities", "hourly-report-bars"]);
      if (!elements) return;
      function populateResorts() {
        elements["resorts-select"].replaceChildren();
        RESORTS.forEach(function (resort) {
          const option = document.createElement("option");
          option.value = resort.id;
          option.textContent = resort.name;
          elements["resorts-select"].append(option);
        });
        elements["resorts-select"].value = state.resortId;
      }
      renderers.resorts = function () {
        const resort = currentResort();
        elements["ops-resort-name"].textContent = resort.name;
        elements["ops-resort-region"].textContent = resort.region + " · " + resort.activeRiders.toLocaleString() + " active riders";
        elements["ops-season-price"].innerHTML = "$" + resort.planPricePerSeason.toLocaleString() + " <small>CAD / season</small>";
        elements["resorts-select"].value = resort.id;

        const ranked = resort.runs.map(function (run) { return { run: run, forecast: evaluateRun(run) }; })
          .sort(function (a, b) { return b.forecast.score - a.forecast.score; });
        elements["ranked-runs"].replaceChildren();
        ranked.forEach(function (item, index) {
          const row = document.createElement("li");
          const rank = document.createElement("span");
          rank.className = "ops-rank";
          rank.textContent = String(index + 1).padStart(2, "0");
          const copy = document.createElement("div");
          copy.className = "ops-run-copy";
          const name = document.createElement("strong");
          name.textContent = item.run.name;
          const meta = document.createElement("span");
          meta.textContent = item.forecast.condition.replace("-", " ") + " · " + item.run.aspect + " aspect · " + item.run.reports + " reports";
          const score = document.createElement("strong");
          score.className = "ops-score";
          score.textContent = String(item.forecast.score);
          copy.append(name, meta);
          row.append(rank, copy, score);
          elements["ranked-runs"].append(row);
        });

        const priorities = resort.runs.map(function (run) { return { run: run, forecast: evaluateRun(run), priority: evaluateRun(run).score + run.popularity * 9 }; })
          .sort(function (a, b) { return b.priority - a.priority; }).slice(0, 3);
        elements["grooming-priorities"].replaceChildren();
        priorities.forEach(function (item) {
          const row = document.createElement("li");
          const title = document.createElement("strong");
          title.textContent = item.run.name;
          const reason = document.createElement("span");
          reason.textContent = item.forecast.score + " Chatter · " + Math.round(item.run.popularity * 100) + " traffic index";
          row.append(title, reason);
          elements["grooming-priorities"].append(row);
        });

        elements["hourly-report-bars"].replaceChildren();
        const values = resort.hourlyReports;
        const peak = Math.max.apply(Math, values);
        values.forEach(function (value, index) {
          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.setAttribute("class", "hour-bar");
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const height = value / peak * 138;
          rect.setAttribute("x", 52 + index * 72);
          rect.setAttribute("y", 200 - height);
          rect.setAttribute("width", "42");
          rect.setAttribute("height", height);
          rect.setAttribute("rx", "5");
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", 73 + index * 72);
          label.setAttribute("y", 192 - height);
          label.setAttribute("text-anchor", "middle");
          label.textContent = String(value);
          group.append(rect, label);
          elements["hourly-report-bars"].append(group);
        });
      };
      populateResorts();
      elements["resorts-select"].addEventListener("change", function () { chooseResort(elements["resorts-select"].value, false); });
      bindDemoButtons(page);
      renderers.resorts();
    } catch (error) {
      console.error("[Føre] Resorts initialization failed:", error);
    }
  }

  function updateSyncLabel() {
    const label = document.getElementById("sync-label");
    if (!label) return;
    label.textContent = state.pendingSyncRuns > 0 ? state.pendingSyncRuns + " runs waiting to sync" : "✅ Synced";
  }

  function initNavigation() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    try {
      header.querySelectorAll("nav a").forEach(function (link) {
        link.addEventListener("click", function (event) {
          const targetHash = link.getAttribute("href");
          if (!targetHash || targetHash.charAt(0) !== "#") return;
          event.preventDefault();
          if (window.location.hash !== targetHash) window.location.hash = targetHash;
          showView();
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          const menuButton = header.querySelector("#menu-toggle");
          const navigation = header.querySelector("#main-navigation");
          if (menuButton && navigation) {
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Open navigation");
            navigation.classList.remove("is-open");
          }
        });
      });
      const menuButton = header.querySelector("#menu-toggle");
      const navigation = header.querySelector("#main-navigation");
      if (menuButton && navigation) {
        menuButton.addEventListener("click", function () {
          const isOpen = menuButton.getAttribute("aria-expanded") === "true";
          menuButton.setAttribute("aria-expanded", isOpen ? "false" : "true");
          menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
          navigation.classList.toggle("is-open", !isOpen);
        });
      }
      window.addEventListener("hashchange", showView);
      const syncButton = header.querySelector("#sync-button");
      if (syncButton) {
        syncButton.addEventListener("click", function () {
          state.pendingSyncRuns = 0;
          writeStorage(STORAGE.pendingSync, 0);
          updateSyncLabel();
          syncButton.classList.add("is-synced");
          syncButton.setAttribute("aria-label", "Rides synced");
        });
      }
      updateSyncLabel();
      showView();
    } catch (error) {
      console.error("[Føre] Navigation initialization failed:", error);
    }
  }

  function selectRun(id) {
    if (!currentRuns().some(function (run) { return run.id === id; })) return;
    state.selectedRunId = id;
    writeStorage(STORAGE.selectedRun, id);
    renderAll();
  }

  function chooseResort(id, navigateToMap) {
    if (!isKnownResort(id)) return;
    state.resortId = id;
    state.activeRiders = currentResort().activeRiders;
    state.selectedRunId = currentRuns()[0].id;
    state.mapHasRendered = false;
    state.mapHasRendered = false;
    writeStorage(STORAGE.resort, id);
    writeStorage(STORAGE.selectedRun, state.selectedRunId);
    renderAll();
    if (navigateToMap) {
      if (window.location.hash !== "#map") window.location.hash = "#map";
      showView();
    }
  }

  function setIcon(icon, condition) {
    if (!icon) return;
    const use = icon.querySelector("use");
    if (!use) return;
    icon.setAttribute("class", "condition-icon " + condition);
    use.setAttribute("href", "#icon-" + condition);
  }

  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    let found = false;
    views.forEach(function (view) {
      view.hidden = view.id !== requested;
      if (view.id === requested) found = true;
    });
    if (!found) {
      const home = document.getElementById("home");
      if (home) home.hidden = false;
    }
    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === (found ? "#" + requested : "#home")) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (found && renderers[requested]) {
      try {
        renderers[requested]();
      } catch (error) {
        console.error("[Føre] " + requested + " page render failed:", error);
      }
    }
  }

  function initializeState() {
    const savedScenario = readStorage(STORAGE.scenario, FORE_DEFAULTS.scenarioId);
    state.scenarioId = isKnownScenario(savedScenario) ? savedScenario : FORE_DEFAULTS.scenarioId;
    state.timeMinutes = clamp(Number(readStorage(STORAGE.time, FORE_DEFAULTS.timeMinutes)) || FORE_DEFAULTS.timeMinutes, 510, 960);
    const savedRun = readStorage(STORAGE.selectedRun, FORE_DEFAULTS.selectedRunId);
    state.selectedRunId = currentRuns().some(function (run) { return run.id === savedRun; }) ? savedRun : currentRuns()[0].id;
    restoreReports();
  }

  initializeState();
  initHome();
  initSnowMap();
  initReport();
  initNetwork();
  initResorts();
  initPricing();
  initProfile();
  initNavigation();
})();