import type { Dict } from "./en";

export const de: Dict = {
  themeToLight: "Zum hellen Design wechseln",
  themeToDark: "Zum dunklen Design wechseln",
  langLabel: "Sprache",
  homeAria: "Zur Startseite zurück",
  retry: "Erneut versuchen",
  updating: "Aktualisiere…",
  extracting: "Profil wird extrahiert…",
  addFavorite: "+ Favorit",
  addFavoriteAria: "Aktuellen Ort zu den Favoriten hinzufügen",
  metaCell: "Zelle {lat}, {lon}",
  metaAlt: "Modellhöhe {m} m",
  metaCache: "Run {slot} UTC",
  modelLabel: "Modell",
  modelGroupNowcast: "Nowcast — nächste Stunden",
  modelGroupLowLevel: "Präzise in Bodennähe",
  modelGroupAllAltitude: "Präzise in allen Höhen",
  modelGroupLongRange: "Längerfristig (4 Tage)",
  daysSuffix: "{n} Tage",
  dayTablist: "Tag",
  viewTablist: "Ansicht",
  viewWindgram: "Windgram",
  viewSounding: "Sounding",
  viewMeteogram: "Meteogramm",
  meteoLblCloud: "Wolken",
  meteoLblCbl: "Konvektion",
  meteoLblTd: "Taupunkt",
  meteoLblWind: "Wind",
  meteoLblGust: "Böen",
  hourLabel: "Uhrzeit",
  prevHour: "Vorherige Stunde",
  nextHour: "Nächste Stunde",
  navAria: "Hauptseiten",
  tabPlace: "Ort",
  tabGuide: "Guide",
  compareModels: "Modelle vergleichen",
  recentPlaces: "Letzte Orte",
  boardAria: "Vergleichstafel",
  historyLabel: "Letzte",
  models: "Modelle ({n})",
  boardOne: "Vergleich · 1 Ort",
  boardMany: "Vergleich · {n} Orte",
  boardOneModel: "1 Modell",
  boardModels: "{n} Modelle",
  boardEmptyPlaces: "Orte zum Vergleichen auswählen…",
  boardEmptyModels: "Modelle zum Vergleichen auswählen…",
  boardAverage: "Mittel",
  boardAddAria: "Ort zum Vergleich hinzufügen",
  boardAddPlaceholder: "Ort zum Vergleichen hinzufügen…",
  boardSwitchAria: "Den Ort des Modellvergleichs wechseln",
  boardSwitchPlaceholder: "Ort wechseln…",
  addCompareAria: "{label} zum Vergleich hinzufügen",
  addCompare: "Zum Vergleich hinzufügen",
  boardClear: "Alle entfernen",
  placeLabel: "Ort",
  placePlaceholder: "Ort suchen — Chamonix, Annecy…",
  searching: "Suche…",
  searchUnavailable: "Suche nicht verfügbar.",
  noResults: "Keine Ergebnisse.",
  favorites: "Favoriten ({n})",
  favoritesEmpty: "Noch keine Favoriten.",
  favoritesEmptyHint: "Ort laden, dann den Stern drücken, um ihn hier zu behalten.",
  railFavorites: "Favoriten",
  recentEmpty: "Geöffnete Orte erscheinen hier.",
  removeFavoriteAria: "{label} aus den Favoriten entfernen",
  alreadyInCompare: "Schon im Vergleich",
  mapOpen: "Karte…",
  refresh: "Aktualisieren",
  compareCheck: "Orte vergleichen",
  mapAria: "Punkt auf der Karte wählen",
  mapTitle: "Punkt wählen",
  mapHint: "Karte anklicken oder ziehen — Esc zum Schließen",
  mapClose: "Schließen",
  latitude: "Breite",
  longitude: "Länge",
  applyCoords: "Koordinaten übernehmen",
  outOfDomain: "Außerhalb des {model}-Gebiets",
  usePoint: "Diesen Punkt verwenden",
  sol: "Boden {m}",
  rain: "Regen",
  tSoil: "T Boden",
  tMissing: "T —",
  tipNeb: "Bewölkung {n}%",
  tipLift: "Steigen {n} m/s",
  outOfForecast: "außerhalb der Vorhersage",
  surfaceAria: "Boden",
  statT2m: "T 2 m",
  statTd2m: "Td 2 m",
  statRh: "LF",
  statWind: "Wind 10 m",
  statGusts: "Böen",
  statCape: "CAPE",
  statPrecip: "Niederschl.",
  statCloudBase: "Wolkenbasis",
  statCloudCover: "Bewölkung",
  statPsfc: "P Boden",
  hintSpread: "T−Td {x} K",
  cloudNone: "keine",
  hintAgl: "+{m} m über Grund",
  hintCloudLayers: "tief / mittel / hoch %",
  soundingAria: "Sounding: T, Td und Wind. Vertikale = trockene Adiabate.",
  dryAdiabat: "trockene Adiabate",
  unstable: "← instabil",
  stable: "stabil →",
  cloudBaseAnno: "Basis {m} m",
  axisTemp: "T / Td · vertikal = γd 9,8 K/km",
  axisWind: "Wind (km/h)",
  legendAirT: "T Luft",
  legendTd: "Td",
  legendDalr: "trockene Adiabate (vertikal)",
  legendUnstable: "nach links geneigt = instabil",
  legendWind: "Wind",
  hoverWind: "Wind —",
  hoverCloud: "Wolken {n}%",
  pinAria: "Angepinnter Ort {label}",
  pinRemoveAria: "{label} aus dem Vergleich entfernen",
  pinUpAria: "{label} nach oben verschieben",
  pinDownAria: "{label} nach unten verschieben",
  loading: "Lädt…",
  noDataDay: "Keine Daten für diesen Tag.",
  soundingUnavailable: "Dieses Modell hat keine Isobarenstufen — Emagramm nicht verfügbar. Wähle ein anderes Modell.",
  pinAlt: "Höhe {m} m",
  pinRun: "Run {day} {slot} UTC",
  errNoData:
    "{model} hat keine Daten für diesen Ort: Dieses Modell deckt ein kleineres " +
    "Gebiet ab. Wähle das andere Modell in der Spalte (AROME deckt ganz " +
    "Frankreich ab).",
  errRateLimit:
    "Open-Meteo-Limit für deine Verbindung erreicht. " +
    "Die App fragt diesen kostenlosen Dienst direkt ab; sein Kontingent wird " +
    "pro Besucher gezählt und erneuert sich mit der Zeit. Der lokale Cache " +
    "begrenzt die Aufrufe bereits — versuche es in ein paar Minuten erneut.",
  errServer:
    "Open-Meteo ist vorübergehend nicht erreichbar. " +
    "Versuche es gleich noch einmal — die Daten sollten zurückkommen.",
  errNetwork: "Open-Meteo nicht erreichbar — prüfe deine Internetverbindung.",
  errUnexpected: "Ein unerwarteter Fehler ist aufgetreten.",
  guideTitle: "Erste Schritte",
  guideIntro:
    "Weather4Paragliding verwandelt freie numerische Wettermodelle in ein Windgram " +
    "und ein Sounding — gemacht für Gleitschirm- und Drachenflieger. Ort wählen, " +
    "dann den Wind Schicht für Schicht lesen.",
  guideHowTitle: "Eine typische Sitzung",
  guideHowP1:
    "Suche deinen Start- oder Landeplatz und wähle oben einen Tag. Das Windgram " +
    "liest sich wie eine Tabelle: Höhe links, Stunden oben. Jede Zelle zeigt den " +
    "Wind in dieser Höhe — die Zahl ist die Geschwindigkeit, der Pfeil zeigt, wo die " +
    "Luft hingeht, und der kleine Wert ist die Böe, sobald sie 5 km/h oder mehr " +
    "dazulegt.",
  guideHowP2:
    "Die unteren Bänder zeigen Regen und Temperatur in 2 m. Wechsle für eine " +
    "einzelne Stunde zum Sounding: Es zeichnet Temperatur und Taupunkt gegen die " +
    "trockene Adiabate — Stabilität, konvektive Obergrenze und Wolkenbasis sind auf " +
    "einen Blick erkennbar.",
  guideModelsTitle: "Welches Modell soll ich nutzen?",
  guideModelsP1:
    "AROME France 2,5 km ist die Referenz für Frankreich: Es deckt das ganze Land ab, " +
    "reicht in die Höhenlagen und blickt etwa drei Tage voraus.",
  guideModelsP2:
    "ICON D2 2,2 km vom DWD ist die zweite Lesart — Deutschland, die Alpen und der " +
    "größte Teil Frankreichs, über etwa zwei Tage, mit demselben vertikalen Profil. " +
    "Der Wechsel sitzt in der Spalte. Wo sie sich widersprechen, ist das die Vorhersage.",
  guideLimitsTitle: "Geografische Abdeckung",
  guideLimitsP1:
    "AROME deckt Frankreich und die Nachbarn ab. ICON D2 deckt Deutschland, die Alpen " +
    "und den größten Teil Frankreichs ab, nicht aber die äußerste Südostküste. " +
    "Außerhalb des Modellgitters hat Open-Meteo keine Daten.",
  guideLimitsP2:
    "Liegt dein Punkt außerhalb, sagt die App es dir, statt stillschweigend eine " +
    "Nachbarzelle zu zeigen — wähle das andere Modell in der Spalte.",
  guideQuotaTitle: "Das Open-Meteo-Kontingent",
  guideQuotaP1:
    "Die App spricht direkt mit Open-Meteo, einem kostenlosen Dienst; es gibt keinen " +
    "Server dazwischen. Die tägliche Anzahl der Aufrufe wird pro Besucher gezählt — " +
    "eine sehr aktive Sitzung kann an die Grenze stoßen; sie erneuert sich nach " +
    "ein paar Minuten von selbst.",
  guideQuotaP2:
    "Ergebnisse werden im Browser gepuffert (3-h-Fenster, 1 h für die " +
    "Jetztvorhersage): Das Blättern durch Tage oder Stunden kostet nichts. Der " +
    "Aktualisieren-Knopf ist die einzige Aktion, die einen " +
    "echten Aufruf erzwingt.",
  guideGramTitle: "Das Windgram lesen",
  guideGramP1:
    "Das Windgram ist ein Raster: Höhe links, Stunden oben und unten. Jede Zelle " +
    "zeigt den Wind für eine Höhe zu einer Stunde: die große Zahl ist die " +
    "Geschwindigkeit in km/h, und der Pfeil zeigt, wohin die Luft strömt — seine " +
    "Farbe folgt der Geschwindigkeit, von hellgrün bis warnendem Rot. Die kleine " +
    "ziegelrote Zahl unter der Geschwindigkeit ist die Bö, angezeigt nur wenn sie " +
    "5 km/h oder mehr hinzufügt.",
  guideGramP2:
    "Der Zellhintergrund ist die Thermik, auf einer Gleitschirm-Skala: Petrol " +
    "liegt unter dem Eigensinken, Gold ist ein Steigen, Zinnober ein starkes und " +
    "Violett ein rauer Tag. Innerhalb einer Farbe ändert sich nur die Stärke. " +
    "Ein grauer Schleier bedeutet Wolken. Fahre über eine " +
    "Zelle, um Temperatur, Steigen in m/s und Bewölkung zu lesen. Diese Geschwindigkeit " +
    "ist der mittlere Steigwert eines trockenen Thermals, vor dem Eigensinken des " +
    "Schirms — eine Wolke darüber kann mehr bringen, und ein Wind, der mit der Höhe " +
    "stark zunimmt, kann den Thermal zerreißen. Folge der blauen Linie über dem Raster " +
    "— der 0-°C-Isotherme — um die Frostgrenze zu verfolgen.",
    demoSpeed: "Windgeschwindigkeit, km/h",
  demoGust: "Bö (nur wenn sie 5 km/h oder mehr hinzufügt)",
  demoArrow: "Strömungsrichtung",
  demoHover: "Hover: Temperatur, Steigen, Bewölkung",
  demoIso0: "0-°C-Isotherme",
  demoScale: "km/h",
  guideSoundTitle: "Das Sounding, Schicht für Schicht",
  guideSoundP1:
    "Das Sounding zeichnet eine Stunde Atmosphäre über dem Boden: die orange Kurve " +
    "ist die Temperatur, die blaue der Taupunkt. Die goldene Vertikale ist der Weg " +
    "eines Luftpaketes, das trocken vom Boden aufsteigt — es kühlt um 9,8 °C pro " +
    "Kilometer, der trockenadiabatische Gradient.",
  guideSoundP2:
    "Links der Linie ist die Umgebungsluft kälter als ein aufsteigendes Paket: " +
    "instabil, Thermik steigt. Rechts der Linie bremst die Luft den Aufstieg: " +
    "stabil. Im Wesentlichen ist es die Schicht, die das Windgram als konvektiv " +
    "färbt. Die Färbung folgt der Mischungsschicht: die heißeste Luft direkt am " +
    "Boden hebt sie nicht von allein, feuchte Bodenluft kann sie dagegen etwas " +
    "höher tragen als diese trockene Linie.",
  guideSoundP3:
    "Wo sich die orange und die blaue Kurve nähern, ist die Luft fast gesättigt: " +
    "das ist die Wolkenbasis. Fahr über das Diagramm, um Temperatur und Taupunkt " +
    "exakt auf jeder Höhe zu lesen; das Windprofil steht rechts.",
  guideWhyTitle: "Warum diese App?",
  guideWhyModels:
    "Zwei ernsthafte Modelle: AROME 2,5 km von Météo-France und ICON D2 vom DWD, " +
    "beide mit den Höhenlagen, die ein Gleitschirm fliegt. Ein Klick wechselt.",
  guideWhyFree:
    "Völlig kostenlos, ohne Konto, ohne Werbung: die ganze App läuft in deinem Browser.",
  guideWhyCompare:
    "Favoriten und zuletzt geöffnete Orte bleiben sichtbar: ein Klick, und das " +
    "Diagramm folgt dir vom Startplatz zum Landeplatz.",
  guideWhyRuns:
    "Immer der neueste Lauf jedes Modells, sobald Open-Meteo ihn veröffentlicht — " +
    "anders als manche Bezahlseiten, die oft nur einen Lauf pro Tag zeigen.",
  guideDataTitle: "Woher kommen die Daten?",
  guideDataP1:
    "Weather4Paragliding hat keinen eigenen Server: dein Browser ruft direkt die " +
    "Open-Meteo-API auf, ein kostenloser Dienst, der die Rohausgabe der " +
    "Nationalmodelle weitergibt. Diese App liest AROME 2,5 km von Météo-France " +
    "und ICON D2 vom DWD.",
  guideDataP2:
    "Behalte im Kopf, was eine Vorhersage ist: das Ergebnis eines Modelllaufs, " +
    "keine Beobachtung. Ein Punktwert ist die nächstgelegene Rasterzelle — eine " +
    "scharfe Kante oder ein enges Tal wird nur angenähert, und lokale Effekte wie " +
    "Thermik oder Hangwind werden skizziert, nicht gemessen. Wenn zwei Modelle " +
    "sich widersprechen, ist das die echte Unsicherheit — vergleiche sie, bevor " +
    "du dich anflugst.",
  guideContribTitle: "Mithilfe willkommen",
  guideContribP1:
    "Das Projekt ist Open Source (AGPL-3.0) und lebt auf GitHub. Bug, holprige " +
    "Übersetzung, fehlendes Feature — jedes Issue hilft. Ein Klick öffnet das " +
    "Formular:",
  contribBug: "Bug melden",
  contribFeature: "Verbesserung vorschlagen",
};