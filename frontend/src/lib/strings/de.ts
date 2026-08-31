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
  hourLabel: "Uhrzeit",
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
  favoritesEmptyHint: "Ort laden, dann „+ Favorit“ drücken, um ihn hier zu behalten.",
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
  pinAlt: "Höhe {m} m",
  pinRun: "Run {day} {slot} UTC",
  errNoData:
    "{model} hat keine Daten für diesen Ort: Dieses Modell deckt ein kleineres " +
    "Gebiet ab. Wähle ein anderes Modell in der Werkzeugleiste (AROME deckt ganz " +
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
    "AROME France 2,5 km ist die Referenz für Frankreich: Es deckt das ganze Land ab " +
    "und hält Detail und Zuverlässigkeit gut in Balance. Nimm AROME 15 min für die " +
    "nächsten Stunden und ARPEGE Europe für den Blick auf 4–5 Tage.",
  guideModelsP2:
    "AROME HD 1,3 km und MeteoSwiss ICON-CH1 1 km lösen das Gelände viel feiner auf. " +
    "Sie haben keine Hochlagen, ihr Windgram endet also ein paar Hundert Meter über " +
    "den Gipfeln — aber für das, was bodennah passiert (Startplatz, Grat, Talwind), " +
    "sind sie am präzisesten, und an der Küste sind sie unschlagbar, wo gröbere " +
    "Modelle die Seebrise glätten.",
  guideLimitsTitle: "Geografische Abdeckung",
  guideLimitsP1:
    "Jedes Modell deckt nur sein eigenes Gebiet ab: AROME Frankreich und Nachbarn, " +
    "ICON-CH1 die Alpen rund um die Schweiz, ICON-D2 Deutschland und die Alpen, " +
    "HARMONIE Nord- und Mitteleuropa. Open-Meteo hat außerhalb des Modellgitters " +
    "schlicht keine Daten.",
  guideLimitsP2:
    "Liegt dein Punkt außerhalb, sagt die App es dir, statt stillschweigend eine " +
    "Nachbarzelle zu zeigen — wähle einfach ein anderes Modell in der Werkzeugleiste.",
  guideQuotaTitle: "Das Open-Meteo-Kontingent",
  guideQuotaP1:
    "Die App spricht direkt mit Open-Meteo, einem kostenlosen Dienst; es gibt keinen " +
    "Server dazwischen. Die tägliche Anzahl der Aufrufe wird pro Besucher gezählt — " +
    "eine sehr aktive Sitzung kann an die Grenze stoßen; sie erneuert sich nach " +
    "ein paar Minuten von selbst.",
  guideQuotaP2:
    "Ergebnisse werden im Browser gepuffert (3-h-Fenster, 1 h für die " +
    "Jetztvorhersage): Das Blättern durch Tage, Höhen oder die Vergleichstafel " +
    "kostet nichts. Der Aktualisieren-Knopf ist die einzige Aktion, die einen " +
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
    "Der Zellhintergrund erzählt vom Aufwind: je wärmer er leuchtet, desto mehr " +
    "Thermik erwartet das Modell dort, und ein grauer Schleier bedeutet Wolken. " +
    "Fahre über eine Zelle, um die exakte Temperatur und Bewölkung in dieser Höhe " +
    "zu lesen, und folge der blauen Linie über dem Raster — der 0-°C-Isotherme — " +
    "um die Frostgrenze zu verfolgen.",
    demoSpeed: "Windgeschwindigkeit, km/h",
  demoGust: "Bö (nur wenn sie 5 km/h oder mehr hinzufügt)",
  demoArrow: "Strömungsrichtung",
  demoHover: "Hover: Temperatur, Bewölkung",
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
    "stabil. Im Wesentlichen ist es die Schicht, die das Windgram als konvektiv färbt — das " +
    "Windgram kann sie etwas höher ziehen, denn feuchte Bodenluft hält die Thermik " +
    "länger am Leben als eine trockene Paketrechnung.",
  guideSoundP3:
    "Wo sich die orange und die blaue Kurve nähern, ist die Luft fast gesättigt: " +
    "das ist die Wolkenbasis. Fahr über das Diagramm, um Temperatur und Taupunkt " +
    "exakt auf jeder Höhe zu lesen; das Windprofil steht rechts.",
  guideWhyTitle: "Warum diese App?",
  guideWhyModels:
    "Nur ernsthafte Modelle: AROME, ARPEGE, ICON-CH1 von MeteoSwiss, ICON-D2 vom " +
    "DWD, HARMONIE vom DMI — gepflegt von nationalen Wetterdiensten mit echten " +
    "Mitteln, und du wählst dasjenige, das zu deinem Spot passt.",
  guideWhyFree:
    "Völlig kostenlos, ohne Konto, ohne Werbung: die ganze App läuft in deinem Browser.",
  guideWhyCompare:
    "Mehrere Orte nebeneinander auf derselben Seite: pinne Startplatz, Landeplatz " +
    "und das Tal daneben und vergleiche sie Stunde für Stunde.",
  guideWhyRuns:
    "Immer der neueste Lauf jedes Modells, sobald Open-Meteo ihn veröffentlicht — " +
    "anders als manche Bezahlseiten, die oft nur einen Lauf pro Tag zeigen.",
  guideDataTitle: "Woher kommen die Daten?",
  guideDataP1:
    "Weather4Paragliding hat keinen eigenen Server: dein Browser ruft direkt die " +
    "Open-Meteo-API auf, ein kostenloser Dienst, der die Rohausgabe der " +
    "Nationalmodelle weitergibt (AROME und ARPEGE von Météo-France, ICON-CH1 von " +
    "MeteoSwiss, ICON-D2 vom DWD, HARMONIE vom DMI).",
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