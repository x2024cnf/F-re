const CONDITIONS = {
  powder: { label: "Powder", score: 12 },
  groomed: { label: "Groomed", score: 34 },
  crud: { label: "Crud", score: 56 },
  moguls: { label: "Moguls", score: 48 },
  icy: { label: "Icy", score: 86 },
  "wind-packed": { label: "Wind-packed", score: 70 }
};

const WEATHER_SCENARIOS = {
  powderMorning: { label: "Powder morning" },
  springFreezeThaw: { label: "Spring freeze-thaw" },
  windyColdDay: { label: "Windy cold day" }
};

const FORE_DEFAULTS = {
  resortId: "mount-halvard",
  scenarioId: "powderMorning",
  timeMinutes: 540,
  selectedRunId: "halvard-glasswing",
  pendingSyncRuns: 3
};

const NETWORK_CONFIG = {
  homeRiderCount: 1284,
  mappedRunCount: 12,
  coverageScale: 400,
  accuracyBase: 50,
  accuracyGain: 45,
  accuracyScale: 500,
  dataAgeBaseMinutes: 44,
  dataAgeScale: 600,
  minimumDataAgeMinutes: 3
};

function makeRuns(records, resortId) {
  const layouts = {
    "mount-halvard": [
      "M474 118 C430 220 350 320 310 650",
      "M548 220 C500 300 430 420 370 650",
      "M620 350 C570 420 470 520 430 650",
      "M728 202 C670 300 590 430 500 650",
      "M820 132 C760 250 680 390 570 650",
      "M856 144 C820 280 760 430 640 650",
      "M912 286 C860 390 790 510 710 650",
      "M1010 410 C940 470 840 560 790 650",
      "M378 278 C330 360 270 470 250 650",
      "M768 214 C820 330 860 470 860 650",
      "M620 350 C690 390 760 470 820 520 C870 570 930 610 970 650",
      "M474 118 C560 260 620 390 600 650"
    ],
    "sableback-ridge": [
      "M365 402 C320 470 260 560 220 650",
      "M488 286 C440 380 350 510 300 650",
      "M608 178 C550 300 470 460 380 650",
      "M716 112 C650 260 560 430 460 650",
      "M805 246 C750 350 650 470 540 650",
      "M912 330 C850 410 760 520 620 650",
      "M972 318 C920 420 840 540 700 650",
      "M1034 448 C980 510 900 580 780 650",
      "M548 302 C500 390 430 520 860 650",
      "M430 414 C390 480 360 570 940 650",
      "M854 238 C900 350 930 480 1020 650",
      "M716 112 C790 260 850 390 900 650"
    ],
    "pineglass-mountain": [
      "M318 408 C290 470 250 560 200 650",
      "M420 318 C380 400 330 520 280 650",
      "M526 214 C470 320 410 470 360 650",
      "M626 118 C560 280 500 470 440 650",
      "M718 252 C660 360 590 500 520 650",
      "M820 338 C750 420 680 540 600 650",
      "M872 326 C820 430 760 550 680 650",
      "M928 430 C880 500 820 580 760 650",
      "M470 330 C430 410 390 520 840 650",
      "M370 420 C340 500 300 590 920 650",
      "M766 238 C820 350 880 470 1000 650",
      "M626 118 C700 260 760 390 820 470 C850 540 900 590 960 650"
    ]
  };
  const paths = layouts[resortId] || layouts["mount-halvard"];
  return records.map(function (run, index) {
    const baseXs = [220, 280, 340, 400, 460, 520, 680, 740, 800, 860, 920, 980];
    const baseX = baseXs[index];
    const path = index === 11
      ? "M620 350 C690 390 750 460 790 520 C740 540 680 580 600 650"
      : paths[index].replace(/\s(-?\d+(?:\.\d+)?)\s650$/, " " + baseX + " 650");
    const mobilePath = path.replace(/([MC])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, function (match, command, x, y) {
      return command + " " + x + " " + Math.round(Number(y) * 2.05);
    });
    return Object.assign({}, run, {
      path: path,
      mobilePath: mobilePath,
      condition: "groomed",
      baseScore: run.baseScore === undefined ? 30 : run.baseScore,
      age: 2,
      score: run.baseScore === undefined ? 30 : run.baseScore,
      latestReport: null
    });
  });
}

const RESORTS = [
  {
    id: "mount-halvard",
    name: "Mount Halvard",
    region: "Alberta, Canada",
    baseElevationM: 1740,
    summitElevationM: 2690,
    verticalDropM: 950,
    totalRuns: 86,
    liftCount: 9,
    annualSnowfallCm: 510,
    activeRiders: 1284,
    upperLiftName: "Northwind Chair",
    planPricePerSeason: 18400,
    mapLayout: {
      summitStartX: 290, summitGap: 53, baseStartX: 245, baseGap: 58, bend: -18,
      summitX: 600, baseX: 600,
      ridges: ["M70 205c180-46 320-12 465-58s320-30 590 16", "M58 386c190-54 315-18 480-55s340-20 620 30", "M82 560c182-45 337-12 500-50s315-14 570 22"],
      lifts: ["M210 630 370 126", "M405 630 600 112", "M628 630 824 126"]
    },
    hourlyReports: [18, 24, 36, 52, 73, 91, 112, 95],
    weather: {
      powderMorning: { snowfallCm: 22, morningTempC: -13, highTempC: -6, closingTempC: -9, windKph: 18, freezingLevelM: 950, sky: "snowing" },
      springFreezeThaw: { snowfallCm: 0, morningTempC: -11, highTempC: 4, closingTempC: -2, windKph: 12, freezingLevelM: 2320, sky: "bluebird" },
      windyColdDay: { snowfallCm: 3, morningTempC: -18, highTempC: -12, closingTempC: -16, windKph: 56, freezingLevelM: 650, sky: "flat light" }
    },
    runs: makeRuns([
      { id: "halvard-glasswing", name: "Glasswing", difficulty: "blue", aspect: "NW", averagePitchDeg: 24, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.4, nearLift: true, reports: 38, confidence: 88 },
      { id: "halvard-sunspoke", name: "Sunspoke", difficulty: "green", aspect: "SE", averagePitchDeg: 12, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.7, nearLift: true, reports: 64, confidence: 94 },
      { id: "halvard-quiet-divide", name: "Quiet Divide", difficulty: "black", aspect: "N", averagePitchDeg: 31, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.7, nearLift: false, reports: 17, confidence: 73 },
      { id: "halvard-hush-hollow", name: "Hush Hollow", difficulty: "blue", aspect: "NE", averagePitchDeg: 18, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.2, nearLift: true, reports: 29, confidence: 82 },
      { id: "halvard-lantern-run", name: "Lantern Run", difficulty: "green", aspect: "W", averagePitchDeg: 16, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.3, nearLift: true, reports: 52, confidence: 91 },
      { id: "halvard-foxfire", name: "Foxfire", difficulty: "double black", aspect: "NW", averagePitchDeg: 37, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.9, nearLift: false, reports: 21, confidence: 79 },
      { id: "halvard-driftwood", name: "Driftwood", difficulty: "blue", aspect: "W", averagePitchDeg: 22, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.5, nearLift: true, reports: 24, confidence: 77 },
      { id: "halvard-whitecap", name: "Whitecap Traverse", difficulty: "blue", aspect: "E", averagePitchDeg: 14, elevationBand: "mid", groomedTonight: true, terrainType: "groomer", popularity: 1.4, nearLift: true, reports: 31, confidence: 86 },
      { id: "halvard-blue-hour", name: "Blue Hour", difficulty: "black", aspect: "N", averagePitchDeg: 28, elevationBand: "alpine", groomedTonight: false, terrainType: "moguls", popularity: 0.8, nearLift: false, reports: 14, confidence: 69 },
      { id: "halvard-long-sunday", name: "Long Sunday", difficulty: "green", aspect: "SW", averagePitchDeg: 11, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.8, nearLift: true, reports: 73, confidence: 96 },
      { id: "halvard-switchback-vale", name: "Switchback Vale", difficulty: "blue", aspect: "S", averagePitchDeg: 20, elevationBand: "mid", groomedTonight: false, terrainType: "moguls", popularity: 1.1, nearLift: true, reports: 19, confidence: 72 },
      { id: "halvard-cloudline", name: "Cloudline", difficulty: "double black", aspect: "NE", averagePitchDeg: 35, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.7, nearLift: false, reports: 26, confidence: 84 }
    ], "mount-halvard")
  },
  {
    id: "sableback-ridge",
    name: "Sunpeak Ridge",
    region: "Alberta, Canada",
    baseElevationM: 1680,
    summitElevationM: 2640,
    verticalDropM: 960,
    totalRuns: 116,
    liftCount: 11,
    annualSnowfallCm: 735,
    activeRiders: 936,
    upperLiftName: "Larchline Express",
    planPricePerSeason: 22600,
    mapLayout: {
      summitStartX: 240, summitGap: 58, baseStartX: 200, baseGap: 64, bend: 24,
      summitX: 580, baseX: 590,
      ridges: ["M48 226c192-62 330-18 490-68s345-16 610 44", "M52 406c175-50 330-24 510-66s335-12 614 38", "M44 585c195-44 356-10 530-52s326-10 610 18"],
      lifts: ["M190 630 342 118", "M415 630 598 106", "M680 630 862 118"]
    },
    hourlyReports: [14, 21, 33, 47, 67, 83, 106, 98],
    weather: {
      powderMorning: { snowfallCm: 36, morningTempC: -10, highTempC: -4, closingTempC: -7, windKph: 15, freezingLevelM: 1050, sky: "snowing" },
      springFreezeThaw: { snowfallCm: 0, morningTempC: -8, highTempC: 5, closingTempC: -1, windKph: 9, freezingLevelM: 2410, sky: "bluebird" },
      windyColdDay: { snowfallCm: 5, morningTempC: -15, highTempC: -9, closingTempC: -13, windKph: 62, freezingLevelM: 780, sky: "flat light" }
    },
    runs: makeRuns([
      { id: "sableback-kestrel-shelf", name: "Kestrel Shelf", difficulty: "blue", aspect: "NW", averagePitchDeg: 25, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 1.5, nearLift: true, reports: 42, confidence: 86 },
      { id: "sableback-mossback", name: "Mossback Bowl", difficulty: "black", aspect: "N", averagePitchDeg: 32, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.8, nearLift: false, reports: 23, confidence: 78 },
      { id: "sableback-larch-ribbon", name: "Larch Ribbon", difficulty: "green", aspect: "E", averagePitchDeg: 13, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.8, nearLift: true, reports: 69, confidence: 93 },
      { id: "sableback-cloudberry", name: "Cloudberry Cut", difficulty: "blue", aspect: "NE", averagePitchDeg: 19, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.3, nearLift: true, reports: 31, confidence: 83 },
      { id: "sableback-raven-reach", name: "Raven Reach", difficulty: "double black", aspect: "W", averagePitchDeg: 39, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.6, nearLift: false, reports: 18, confidence: 70 },
      { id: "sableback-suncairn", name: "Suncairn", difficulty: "blue", aspect: "SW", averagePitchDeg: 21, elevationBand: "mid", groomedTonight: false, terrainType: "moguls", popularity: 1.2, nearLift: true, reports: 28, confidence: 80 },
      { id: "sableback-alder-run", name: "Alder Run", difficulty: "green", aspect: "S", averagePitchDeg: 10, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.6, nearLift: true, reports: 55, confidence: 91 },
      { id: "sableback-blue-heron", name: "Blue Heron", difficulty: "black", aspect: "N", averagePitchDeg: 29, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 0.9, nearLift: false, reports: 21, confidence: 76 },
      { id: "sableback-cinder-trees", name: "Cinder Trees", difficulty: "blue", aspect: "NW", averagePitchDeg: 23, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.4, nearLift: true, reports: 35, confidence: 85 },
      { id: "sableback-firline", name: "Firline", difficulty: "green", aspect: "SE", averagePitchDeg: 14, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.7, nearLift: true, reports: 61, confidence: 92 },
      { id: "sableback-white-owl", name: "White Owl", difficulty: "double black", aspect: "NE", averagePitchDeg: 36, elevationBand: "alpine", groomedTonight: false, terrainType: "moguls", popularity: 0.7, nearLift: false, reports: 16, confidence: 68 },
      { id: "sableback-otter-step", name: "Otter Step", difficulty: "blue", aspect: "W", averagePitchDeg: 17, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.1, nearLift: true, reports: 24, confidence: 79 }
    ], "sableback-ridge")
  },
  {
    id: "pineglass-mountain",
    name: "Silverpine",
    region: "British Columbia, Canada",
    baseElevationM: 1870,
    summitElevationM: 2690,
    verticalDropM: 820,
    totalRuns: 74,
    liftCount: 7,
    annualSnowfallCm: 485,
    activeRiders: 682,
    upperLiftName: "Silverpine Summit Tow",
    planPricePerSeason: 14900,
    mapLayout: {
      summitStartX: 325, summitGap: 47, baseStartX: 260, baseGap: 57, bend: -32,
      summitX: 640, baseX: 620,
      ridges: ["M60 210c180-35 325-42 475-12s315-52 595 8", "M45 397c205-30 350-33 510 2s340-39 625 10", "M60 580c205-36 350-22 525 8s330-22 600 8"],
      lifts: ["M230 630 420 125", "M500 630 655 110"]
    },
    hourlyReports: [11, 18, 27, 39, 56, 71, 84, 66],
    weather: {
      powderMorning: { snowfallCm: 18, morningTempC: -14, highTempC: -7, closingTempC: -10, windKph: 22, freezingLevelM: 820, sky: "cloudy" },
      springFreezeThaw: { snowfallCm: 0, morningTempC: -12, highTempC: 3, closingTempC: -3, windKph: 14, freezingLevelM: 2250, sky: "bluebird" },
      windyColdDay: { snowfallCm: 2, morningTempC: -19, highTempC: -13, closingTempC: -17, windKph: 51, freezingLevelM: 540, sky: "flat light" }
    },
    runs: makeRuns([
      { id: "pineglass-rime-bell", name: "Rime Bell", difficulty: "blue", aspect: "N", averagePitchDeg: 22, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.1, nearLift: true, reports: 30, confidence: 82 },
      { id: "pineglass-dry-creek", name: "Dry Creek", difficulty: "green", aspect: "SE", averagePitchDeg: 12, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.5, nearLift: true, reports: 50, confidence: 90 },
      { id: "pineglass-juniper-saddle", name: "Juniper Saddle", difficulty: "black", aspect: "SW", averagePitchDeg: 30, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.9, nearLift: false, reports: 19, confidence: 75 },
      { id: "pineglass-northstep", name: "Northstep", difficulty: "double black", aspect: "NE", averagePitchDeg: 38, elevationBand: "alpine", groomedTonight: false, terrainType: "moguls", popularity: 0.6, nearLift: false, reports: 13, confidence: 67 },
      { id: "pineglass-elkglass", name: "Elkglass", difficulty: "blue", aspect: "E", averagePitchDeg: 18, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.3, nearLift: true, reports: 34, confidence: 84 },
      { id: "pineglass-copper-finch", name: "Copper Finch", difficulty: "green", aspect: "S", averagePitchDeg: 11, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.8, nearLift: true, reports: 62, confidence: 94 },
      { id: "pineglass-snowline-meadow", name: "Snowline Meadow", difficulty: "blue", aspect: "W", averagePitchDeg: 20, elevationBand: "mid", groomedTonight: false, terrainType: "bowl", popularity: 1.1, nearLift: true, reports: 27, confidence: 81 },
      { id: "pineglass-granite-thread", name: "Granite Thread", difficulty: "black", aspect: "NW", averagePitchDeg: 33, elevationBand: "alpine", groomedTonight: false, terrainType: "trees", popularity: 0.8, nearLift: false, reports: 17, confidence: 72 },
      { id: "pineglass-aspen-quiet", name: "Aspen Quiet", difficulty: "green", aspect: "NE", averagePitchDeg: 9, elevationBand: "lower", groomedTonight: true, terrainType: "groomer", popularity: 1.2, nearLift: true, reports: 40, confidence: 87 },
      { id: "pineglass-powder-lantern", name: "Powder Lantern", difficulty: "blue", aspect: "SW", averagePitchDeg: 24, elevationBand: "mid", groomedTonight: false, terrainType: "trees", popularity: 1.6, nearLift: true, reports: 46, confidence: 89 },
      { id: "pineglass-windcut", name: "Windcut", difficulty: "double black", aspect: "W", averagePitchDeg: 40, elevationBand: "alpine", groomedTonight: false, terrainType: "bowl", popularity: 0.7, nearLift: false, reports: 15, confidence: 69 },
      { id: "pineglass-tumbledown", name: "Tumbledown", difficulty: "black", aspect: "S", averagePitchDeg: 27, elevationBand: "mid", groomedTonight: false, terrainType: "moguls", popularity: 1, nearLift: true, reports: 22, confidence: 78 }
    ], "pineglass-mountain")
  }
];

const RUNS = RESORTS[0].runs;

const RIDER_PROFILE = {
  name: "Avery North",
  location: "Frostvale",
  daysRidden: 34,
  runsReported: 18,
  ridersHelped: 126,
  streakDays: 4,
  level: "Trusted reporter",
  seasonHistory: [
    { date: "Mar 18", resortId: "mount-halvard", resortName: "Mount Halvard", runName: "Glasswing", condition: "Powder", score: 18 },
    { date: "Mar 15", resortId: "mount-halvard", resortName: "Mount Halvard", runName: "Sunspoke", condition: "Groomed", score: 32 },
    { date: "Mar 09", resortId: "pineglass-mountain", resortName: "Silverpine", runName: "Copper Finch", condition: "Groomed", score: 29 }
  ]
};

const BUSINESS_PLAN = { name: "Føre Mountain Insights", currency: "CAD", forePlusPricePerSeason: 39, seasonPriceFloor: 14900, seasonPriceCeiling: 22600 };
