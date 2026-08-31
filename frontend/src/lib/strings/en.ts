/** English strings — source of truth for the dictionary shape. */
export const en = {
  brandSub: "Windgram & sounding per model · Open-Meteo multi-model",
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
  metaCache: "cache {slot} UTC",
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
  hourLabel: "Hour",
  hintLevels: "250 m AMSL grid interpolated between model levels",
  boardAria: "Comparison board",
  compareBack: "Back to the place",
  historyLabel: "Recent",
  boardOne: "Compare · 1 place",
  boardMany: "Compare · {n} places",
  boardAddAria: "Add a place to the comparison",
  boardAddPlaceholder: "Add a place to compare…",
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
  favoritesEmptyHint: "Load a place, then press “+ Favorite” to keep it here.",
  removeFavoriteAria: "Remove {label} from favorites",
  alreadyInCompare: "Already in the comparison",
  mapOpen: "Map…",
  refresh: "Refresh",
  compareCheck: "Compare places",
  compareHint: "Stack several places on one page",
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
  pinAlt: "alt. {m} m",
  errNoData:
    "{model} has no data for this location: this model covers a smaller area. " +
    "Pick another model in the toolbar (AROME covers all of France).",
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
  guideOpen: "Getting started",
  guideBack: "Back to the app",
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
    "country and strikes a good balance between detail and reliability. Use AROME " +
    "15 min for the next few hours, and ARPEGE Europe to look 4–5 days ahead.",
  guideModelsP2:
    "AROME HD 1.3 km and MeteoSwiss ICON-CH1 1 km resolve the terrain much finer. " +
    "They carry no high-altitude layers, so their windgram stops a few hundred meters " +
    "above the peaks — but for what happens close to the ground (takeoff, ridge, " +
    "valley breeze) they are the most precise, and they shine along the coast, where " +
    "coarser models smooth the sea breeze away.",
  guideLimitsTitle: "Geographic coverage",
  guideLimitsP1:
    "Each model only covers its own area: AROME France and its neighbors, ICON-CH1 " +
    "the Alps around Switzerland, ICON-D2 Germany and the Alps, HARMONIE northern and " +
    "central Europe. Open-Meteo simply has no data outside a model's grid.",
  guideLimitsP2:
    "When your point is outside, the app tells you so instead of silently showing a " +
    "neighboring cell — just pick another model in the toolbar.",
  guideQuotaTitle: "The Open-Meteo quota",
  guideQuotaP1:
    "The app talks straight to Open-Meteo, a free service; there is no server in " +
    "between. The daily number of calls is counted per visitor, so a very active " +
    "session can hit the limit — it renews on its own after a few minutes.",
  guideQuotaP2:
    "Results are cached in your browser (3 h slot, 1 h for the nowcast): browsing " +
    "days, altitudes or the comparison board costs nothing. The Refresh button is " +
    "the only action that forces a real call.",
  guideGramTitle: "Reading the windgram",
  guideGramP1:
    "The windgram is a grid: altitude on the left, hours on top and bottom. Each " +
    "cell shows the wind for one altitude at one hour: the big number is the speed " +
    "in km/h, and the arrow points where the air is heading — its color follows " +
    "the speed, from light green to warning red. The small reddish number under " +
    "the speed is the gust, shown only when it adds 5 km/h or more.",
  guideGramP2:
    "The cell background talks about lift: the warmer it glows, the stronger the " +
    "thermals the model expects there, and a gray veil means clouds. Hover a cell " +
    "to read the exact temperature and cloud cover at that altitude, and follow " +
    "the blue line across the grid — the 0 °C isotherm — to track the freezing " +
    "level.",
    demoSpeed: "wind speed, km/h",
  demoGust: "gust (only when it adds 5 km/h or more)",
  demoArrow: "where the air is heading",
  demoHover: "hover: temperature, cloud cover",
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
    "right of the line, the air fights the ascent: it is stable. That is essentially the same layer the windgram tints as convective — the " +
    "windgram can carry it slightly higher, because humid surface air keeps thermals " +
    "alive a bit longer than a dry-parcel check.",
  guideSoundP3:
    "Where the orange and blue curves pinch together, the air is nearly saturated: " +
    "that is the cloud base. Hover the chart to read the exact temperature and dew " +
    "point at any altitude; the wind profile is drawn on the right.",
  guideWhyTitle: "Why this app?",
  guideWhyModels:
    "Serious models only: AROME, ARPEGE, MeteoSwiss ICON-CH1, DWD ICON-D2, DMI " +
    "HARMONIE — maintained by national weather services with serious means, and " +
    "you pick the one that fits your spot.",
  guideWhyFree:
    "Completely free, no account, no ads: the whole app runs in your browser.",
  guideWhyCompare:
    "Several places side by side on the same page: pin your takeoff, the landing " +
    "and the flatland valley and compare them hour by hour.",
  guideWhyRuns:
    "Always the latest run of each model, as soon as Open-Meteo publishes it — " +
    "unlike some commercial sites that often show a single run per day.",
  guideDataTitle: "Where the data comes from",
  guideDataP1:
    "Weather4Paragliding has no server of its own: your browser calls the " +
    "Open-Meteo API directly, a free service that redistributes the raw output of " +
    "the national models (Météo-France AROME and ARPEGE, MeteoSwiss ICON-CH1, DWD " +
    "ICON-D2, DMI HARMONIE).",
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
