/** English strings — source of truth for the dictionary shape. */
export const en = {
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",
  langLabel: "Language",
  homeAria: "Back to the start page",
  retry: "Retry",
  updating: "Updating…",
  extracting: "Extracting profile…",
  addFavorite: "+ Favorite",
  addFavoriteAria: "Add the current place to your favorites",
  metaCell: "cell {lat}, {lon}",
  metaAlt: "model alt. {m} m",
  metaCache: "run {slot} UTC",
  modelLabel: "Model",
  modelGroupNowcast: "Nowcast — next hours",
  modelGroupLowLevel: "Precise near the ground",
  modelGroupAllAltitude: "Precise at all altitudes",
  modelGroupLongRange: "Longer range (4 days)",
  daysSuffix: "{n} days",
  dayTablist: "Day",
  viewTablist: "View",
  viewWindgram: "Windgram",
  viewSounding: "Sounding",
  viewMeteogram: "Meteogram",
  meteoLblCloud: "Clouds",
  meteoLblCbl: "Convective layer",
  meteoLblTd: "Dew point",
  meteoLblWind: "Wind",
  meteoLblGust: "Gusts",
  hourLabel: "Hour",
  prevHour: "Previous hour",
  nextHour: "Next hour",
  navAria: "Main pages",
  tabPlace: "Place",
  tabGuide: "Guide",
  compareModels: "Compare models",
  recentPlaces: "Recent places",
  boardAria: "Comparison board",
  historyLabel: "Recent",
  models: "Models ({n})",
  boardOne: "Compare · 1 place",
  boardMany: "Compare · {n} places",
  boardOneModel: "1 model",
  boardModels: "{n} models",
  boardEmptyPlaces: "Select places to compare…",
  boardEmptyModels: "Select models to compare…",
  boardAverage: "Average",
  boardAddAria: "Add a place to the comparison",
  boardAddPlaceholder: "Add a place to compare…",
  boardSwitchAria: "Switch the place of the model comparison",
  boardSwitchPlaceholder: "Switch place…",
  addCompareAria: "Add {label} to the comparison",
  addCompare: "Add to comparison",
  boardClear: "Clear all",
  placeLabel: "Place",
  placePlaceholder: "Search a place — Chamonix, Annecy…",
  searching: "Searching…",
  searchUnavailable: "Search unavailable.",
  noResults: "No results.",
  favorites: "Favorites ({n})",
  favoritesEmpty: "No favorites yet.",
  favoritesEmptyHint: "Load a place, then press the star to keep it here.",
  railFavorites: "Favorites",
  recentEmpty: "Places you open show up here.",
  removeFavoriteAria: "Remove {label} from favorites",
  alreadyInCompare: "Already in the comparison",
  mapOpen: "Map…",
  refresh: "Refresh",
  compareCheck: "Compare places",
  mapAria: "Pick a point on the map",
  mapTitle: "Pick a point",
  mapHint: "Click or drag on the map — Esc to close",
  mapClose: "Close",
  latitude: "Latitude",
  longitude: "Longitude",
  applyCoords: "Apply coordinates",
  outOfDomain: "Out of {model} domain",
  usePoint: "Use this point",
  sol: "sol {m}",
  rain: "rain",
  tSoil: "T ground",
  tMissing: "T —",
  tipNeb: "neb {n}%",
  tipLift: "lift {n} m/s",
  outOfForecast: "out of forecast",
  surfaceAria: "Surface",
  statT2m: "T 2 m",
  statTd2m: "Td 2 m",
  statRh: "RH",
  statWind: "Wind 10 m",
  statGusts: "Gusts",
  statCape: "CAPE",
  statPrecip: "Precip.",
  statCloudBase: "Cloud base",
  statCloudCover: "Cloud cover",
  statPsfc: "P sfc",
  hintSpread: "T−Td {x} K",
  cloudNone: "none",
  hintAgl: "+{m} m AGL",
  hintCloudLayers: "low / mid / high %",
  soundingAria: "Sounding: T, Td and wind. Vertical axis = dry adiabat.",
  dryAdiabat: "dry adiabat",
  unstable: "← unstable",
  stable: "stable →",
  cloudBaseAnno: "base {m} m",
  axisTemp: "T / Td · vertical = γd 9.8 K/km",
  axisWind: "Wind (km/h)",
  legendAirT: "air T",
  legendTd: "Td",
  legendDalr: "dry adiabat (vertical)",
  legendUnstable: "leaning left = unstable",
  legendWind: "wind",
  hoverWind: "wind —",
  hoverCloud: "cloud {n}%",
  pinAria: "Pinned place {label}",
  pinRemoveAria: "Remove {label} from the comparison",
  pinUpAria: "Move {label} up",
  pinDownAria: "Move {label} down",
  loading: "Loading…",
  noDataDay: "No data for this day.",
  soundingUnavailable: "This model has no isobaric levels — sounding unavailable. Pick another model.",
  pinAlt: "alt. {m} m",
  pinRun: "run {day} {slot} UTC",
  errNoData:
    "{model} has no data for this location: this model covers a smaller area. " +
    "Pick the other model in the side column (AROME covers all of France).",
  errRateLimit:
    "Open-Meteo rate limit reached for your connection. " +
    "The app queries this free service directly; its quota is counted " +
    "per user and renews over time. The local cache already limits " +
    "calls — try again in a few minutes.",
  errServer:
    "Open-Meteo is temporarily unavailable. " +
    "Try again in a moment — the data should come back.",
  errNetwork: "Could not reach Open-Meteo — check your internet connection.",
  errUnexpected: "An unexpected error occurred.",
  guideTitle: "Getting started",
  guideIntro:
    "Weather4Paragliding turns free numeric weather models into a windgram and a " +
    "sounding, built for free flight. Pick a place, then read the wind layer by layer.",
  guideHowTitle: "A typical session",
  guideHowP1:
    "Search your takeoff or landing, then pick a day in the toolbar. The windgram " +
    "reads like a table: altitude on the left, hours on top. Each cell shows the wind " +
    "at that altitude — the number is the speed, the arrow points where the air is " +
    "heading, and the small value is the gust when it adds 5 km/h or more.",
  guideHowP2:
    "The bottom bands show rain and 2 m temperature. Switch to Sounding for a single " +
    "hour: it draws temperature and dew point against the dry adiabat, so you can " +
    "judge stability, the convective top and the cloud base at a glance.",
  guideModelsTitle: "Which model should I use?",
  guideModelsP1:
    "AROME France 2.5 km is the reference for mainland France: it covers the whole " +
    "country, reaches the high-altitude layers, and runs about three days ahead.",
  guideModelsP2:
    "DWD ICON D2 2.2 km is the second reading — Germany, the Alps and most of France, " +
    "over about two days, with the same kind of vertical profile. Switch between the " +
    "two in the side column. When they disagree, that disagreement is the forecast.",
  guideLimitsTitle: "Geographic coverage",
  guideLimitsP1:
    "AROME covers France and its neighbors. ICON D2 covers Germany, the Alps and most " +
    "of France, but not the far south-east coast. Open-Meteo has no data outside a " +
    "model's grid.",
  guideLimitsP2:
    "When your point is outside, the app tells you so instead of silently showing a " +
    "neighboring cell — just pick the other model in the side column.",
  guideQuotaTitle: "The Open-Meteo quota",
  guideQuotaP1:
    "The app talks straight to Open-Meteo, a free service; there is no server in " +
    "between. The daily number of calls is counted per visitor, so a very active " +
    "session can hit the limit — it renews on its own after a few minutes.",
  guideQuotaP2:
    "Results are cached in your browser (3 h slot, 1 h for the nowcast): browsing " +
    "days or hours costs nothing. The Refresh button is " +
    "the only action that forces a real call.",
  guideGramTitle: "Reading the windgram",
  guideGramP1:
    "The windgram is a grid: altitude on the left, hours on top and bottom. Each " +
    "cell shows the wind for one altitude at one hour: the big number is the speed " +
    "in km/h, and the arrow points where the air is heading — its color follows " +
    "the speed, from light green to warning red. The small reddish number under " +
    "the speed is the gust, shown only when it adds 5 km/h or more.",
  guideGramP2:
    "The cell background is the thermal, on a paraglider scale: teal is under the " +
    "wing's sink, gold is a climb, vermilion is strong and violet is a rough day. " +
    "Inside one color only the strength changes. A gray " +
    "veil means clouds. Hover a cell to read the temperature, " +
    "the updraft in m/s and the cloud cover. That speed is the average climb of a dry " +
    "thermal before your wing's sink — a cloud overhead can add more, and a strong " +
    "wind increase with height can tear the thermal apart. Follow the blue line across " +
    "the grid — the 0 °C isotherm — to track the freezing level.",
    demoSpeed: "wind speed, km/h",
  demoGust: "gust (only when it adds 5 km/h or more)",
  demoArrow: "where the air is heading",
  demoHover: "hover: temperature, lift, cloud cover",
  demoIso0: "0 °C isotherm",
  demoScale: "km/h",
  guideSoundTitle: "The sounding, layer by layer",
  guideSoundP1:
    "The sounding draws one hour of the atmosphere above the ground: the orange " +
    "curve is the temperature, the blue one the dew point. The vertical golden line " +
    "is the path of an air parcel rising dry from the surface — it cools 9.8 °C per " +
    "kilometer, the dry adiabatic lapse rate.",
  guideSoundP2:
    "Where the orange curve sits left of that line, the surrounding air is colder " +
    "than a rising parcel: it is unstable, thermals climb. Where the curve sits " +
    "right of the line, the air fights the ascent: it is stable. That is essentially " +
    "the same layer the windgram tints as convective. The tint follows the mixed layer, " +
    "so the hottest air hugging the ground does not by itself raise it, while humid " +
    "surface air can carry it a little higher than this dry line.",
  guideSoundP3:
    "Where the orange and blue curves pinch together, the air is nearly saturated: " +
    "that is the cloud base. Hover the chart to read the exact temperature and dew " +
    "point at any altitude; the wind profile is drawn on the right. The arrows on " +
    "either side of the chart move one hour at a time, into the next or previous day.",
  guideWhyTitle: "Why this app?",
  guideWhyModels:
    "Two serious models: Météo-France AROME 2.5 km and DWD ICON D2, both with the " +
    "high-altitude layers a paraglider flies. One click switches between them.",
  guideWhyFree:
    "Completely free, no account, no ads: the whole app runs in your browser.",
  guideWhyCompare:
    "Favorites and recent places stay on screen: one click and the chart follows " +
    "you from takeoff to landing.",
  guideWhyRuns:
    "Always the latest run of each model, as soon as Open-Meteo publishes it — " +
    "unlike some commercial sites that often show a single run per day.",
  guideDataTitle: "Where the data comes from",
  guideDataP1:
    "Weather4Paragliding has no server of its own: your browser calls the " +
    "Open-Meteo API directly, a free service that redistributes the raw output of " +
    "national models. This app reads Météo-France AROME 2.5 km and DWD ICON D2.",
  guideDataP2:
    "Keep in mind what a forecast is: the output of a model run, not an " +
    "observation. A point readout is the nearest grid cell, so a sharp ridge or a " +
    "narrow valley is only approximated, and local effects like thermals or a " +
    "valley breeze are sketched, not measured. When two models disagree, that is " +
    "the real uncertainty — compare them before you commit.",
  guideContribTitle: "Contributions welcome",
  guideContribP1:
    "The project is open source (AGPL-3.0) and lives on GitHub. Bug, rough " +
    "translation, missing feature — every issue helps. One click opens the form:",
  contribBug: "Report a bug",
  contribFeature: "Suggest an improvement",
} as const;

export type Dict = Record<keyof typeof en, string>;
