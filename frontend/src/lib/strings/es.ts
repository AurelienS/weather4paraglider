import type { Dict } from "./en";

export const es: Dict = {
  themeToLight: "Cambiar al tema claro",
  themeToDark: "Cambiar al tema oscuro",
  langLabel: "Idioma",
  homeAria: "Volver al inicio",
  retry: "Reintentar",
  updating: "Actualizando…",
  extracting: "Extrayendo el perfil…",
  addFavorite: "+ Favorito",
  addFavoriteAria: "Añadir el lugar actual a tus favoritos",
  metaCell: "celda {lat}, {lon}",
  metaAlt: "alt. modelo {m} m",
  metaCache: "run {slot} UTC",
  modelLabel: "Modelo",
  modelGroupNowcast: "Nowcast — próximas horas",
  modelGroupLowLevel: "Preciso cerca del suelo",
  modelGroupAllAltitude: "Preciso a todas las alturas",
  modelGroupLongRange: "Más largo plazo (4 días)",
  daysSuffix: "{n} días",
  dayTablist: "Día",
  viewTablist: "Vista",
  viewWindgram: "Windgram",
  viewSounding: "Sounding",
  viewMeteogram: "Meteograma",
  meteoLblCloud: "Nubes",
  meteoLblCbl: "Capa convectiva",
  meteoLblTd: "Rocío",
  meteoLblWind: "Viento",
  meteoLblGust: "Rachas",
  hourLabel: "Hora",
  navAria: "Páginas principales",
  tabPlace: "Lugar",
  tabGuide: "Guía",
  compareModels: "Comparar modelos",
  recentPlaces: "Lugares recientes",
  boardAria: "Panel de comparación",
  historyLabel: "Recientes",
  models: "Modelos ({n})",
  boardOne: "Comparar · 1 lugar",
  boardMany: "Comparar · {n} lugares",
  boardOneModel: "1 modelo",
  boardModels: "{n} modelos",
  boardEmptyPlaces: "Selecciona lugares para comparar…",
  boardEmptyModels: "Selecciona modelos para comparar…",
  boardAverage: "Media",
  boardAddAria: "Añadir un lugar a la comparación",
  boardAddPlaceholder: "Añadir un lugar para comparar…",
  boardSwitchAria: "Cambiar el lugar de la comparación de modelos",
  boardSwitchPlaceholder: "Cambiar de lugar…",
  addCompareAria: "Añadir {label} a la comparación",
  addCompare: "Añadir a la comparación",
  boardClear: "Quitar todos",
  placeLabel: "Lugar",
  placePlaceholder: "Buscar un lugar — Chamonix, Annecy…",
  searching: "Buscando…",
  searchUnavailable: "Búsqueda no disponible.",
  noResults: "Sin resultados.",
  favorites: "Favoritos ({n})",
  favoritesEmpty: "Todavía no hay favoritos.",
  favoritesEmptyHint: "Carga un lugar y pulsa «+ Favorito» para guardarlo aquí.",
  removeFavoriteAria: "Quitar {label} de los favoritos",
  alreadyInCompare: "Ya está en la comparación",
  mapOpen: "Mapa…",
  refresh: "Actualizar",
  compareCheck: "Comparar lugares",
  mapAria: "Elegir un punto en el mapa",
  mapTitle: "Elegir un punto",
  mapHint: "Haz clic o arrastra en el mapa — Esc para cerrar",
  mapClose: "Cerrar",
  latitude: "Latitud",
  longitude: "Longitud",
  applyCoords: "Aplicar coordenadas",
  outOfDomain: "Fuera del dominio de {model}",
  usePoint: "Usar este punto",
  sol: "suelo {m}",
  rain: "lluvia",
  tSoil: "T suelo",
  tMissing: "T —",
  tipNeb: "nub {n}%",
  outOfForecast: "fuera de previsión",
  surfaceAria: "Superficie",
  statT2m: "T 2 m",
  statTd2m: "Td 2 m",
  statRh: "HR",
  statWind: "Viento 10 m",
  statGusts: "Rachas",
  statCape: "CAPE",
  statPrecip: "Precip.",
  statCloudBase: "Base nubes",
  statCloudCover: "Nubosidad",
  statPsfc: "P sup.",
  hintSpread: "T−Td {x} K",
  cloudNone: "ninguna",
  hintAgl: "+{m} m sobre el suelo",
  hintCloudLayers: "baja / media / alta %",
  soundingAria: "Sounding: T, Td y viento. Eje vertical = adiabática seca.",
  dryAdiabat: "adiabática seca",
  unstable: "← inestable",
  stable: "estable →",
  cloudBaseAnno: "base {m} m",
  axisTemp: "T / Td · vertical = γd 9,8 K/km",
  axisWind: "Viento (km/h)",
  legendAirT: "T aire",
  legendTd: "Td",
  legendDalr: "adiabática seca (vertical)",
  legendUnstable: "inclinada a la izquierda = inestable",
  legendWind: "viento",
  hoverWind: "viento —",
  hoverCloud: "nubes {n}%",
  pinAria: "Lugar fijado {label}",
  pinRemoveAria: "Quitar {label} de la comparación",
  pinUpAria: "Subir {label}",
  pinDownAria: "Bajar {label}",
  loading: "Cargando…",
  noDataDay: "Sin datos para este día.",
  soundingUnavailable: "Este modelo no tiene niveles isobaras — emagrama no disponible. Elige otro modelo.",
  pinAlt: "alt. {m} m",
  pinRun: "run {day} {slot} UTC",
  errNoData:
    "{model} no tiene datos para este lugar: este modelo cubre una zona más pequeña. " +
    "Elige otro modelo en la barra de herramientas (AROME cubre toda Francia).",
  errRateLimit:
    "Límite de Open-Meteo alcanzado para tu conexión. " +
    "La app consulta directamente este servicio gratuito; su cuota se cuenta " +
    "por visitante y se renueva con el tiempo. La caché local ya limita " +
    "las llamadas — reintenta en unos minutos.",
  errServer:
    "Open-Meteo no está disponible temporalmente. " +
    "Reintenta en un momento — los datos deberían volver.",
  errNetwork: "No se pudo contactar con Open-Meteo — comprueba tu conexión a internet.",
  errUnexpected: "Ha ocurrido un error inesperado.",
  guideTitle: "Primeros pasos",
  guideIntro:
    "Weather4Paragliding convierte los modelos numéricos libres en un windgram y un " +
    "sounding, pensado para el vuelo libre. Elige un lugar y lee el viento capa por " +
    "capa.",
  guideHowTitle: "Una sesión típica",
  guideHowP1:
    "Busca tu despegue o aterrizaje y elige un día en la barra de herramientas. El " +
    "windgram se lee como una tabla: altitud a la izquierda, horas arriba. Cada celda " +
    "muestra el viento a esa altitud — el número es la velocidad, la flecha apunta " +
    "hacia dónde va el aire, y el valor pequeño es la racha cuando añade 5 km/h o más.",
  guideHowP2:
    "Las bandas inferiores muestran la lluvia y la temperatura a 2 m. Cambia al " +
    "Sounding para una hora concreta: dibuja temperatura y punto de rocío frente a la " +
    "adiabática seca, para juzgar de un vistazo la estabilidad, el techo convectivo y " +
    "la base de las nubes.",
  guideModelsTitle: "¿Qué modelo debo usar?",
  guideModelsP1:
    "AROME France 2,5 km es la referencia para Francia: cubre todo el país y " +
    "encuentra un buen equilibrio entre detalle y fiabilidad. Usa AROME 15 min para las próximas " +
    "horas, y ARPEGE Europe para mirar 4–5 días adelante.",
  guideModelsP2:
    "AROME HD 1,3 km y MeteoSwiss ICON-CH1 1 km resuelven el terreno con mucho más " +
    "detalle. No tienen capas altas, así que su windgram se detiene unos cientos de " +
    "metros por encima de las cumbres — pero para lo que pasa cerca del suelo " +
    "(despegue, cresta, brisa de valle) son los más precisos, y brillan en la costa, " +
    "donde los modelos más gruesos alisan la brisa del mar.",
  guideLimitsTitle: "Cobertura geográfica",
  guideLimitsP1:
    "Cada modelo cubre solo su zona: AROME Francia y vecinos, ICON-CH1 los Alpes " +
    "alrededor de Suiza, ICON-D2 Alemania y los Alpes, HARMONIE el norte y centro de " +
    "Europa. Open-Meteo simplemente no tiene datos fuera de la rejilla de un modelo.",
  guideLimitsP2:
    "Cuando tu punto está fuera, la app te lo dice en lugar de mostrar silenciosamente " +
    "una celda vecina — solo elige otro modelo en la barra de herramientas.",
  guideQuotaTitle: "La cuota de Open-Meteo",
  guideQuotaP1:
    "La app habla directamente con Open-Meteo, un servicio gratuito; no hay servidor " +
    "intermedio. El número diario de llamadas se cuenta por visitante: una sesión muy " +
    "activa puede alcanzar el límite — se renueva solo al cabo de unos minutos.",
  guideQuotaP2:
    "Los resultados se guardan en la caché de tu navegador (franja de 3 h, 1 h para " +
    "la previsión inmediata): navegar por días, altitudes o el panel de comparación " +
    "no cuesta nada. El botón Actualizar es la única acción que fuerza una llamada " +
    "real.",
  guideGramTitle: "Leer el windgram",
  guideGramP1:
    "El windgram es una rejilla: altitud a la izquierda, horas arriba y abajo. " +
    "Cada celda muestra el viento para una altitud a una hora: el número grande " +
    "es la velocidad en km/h, y la flecha apunta hacia dónde va el aire — su " +
    "color sigue la velocidad, del verde claro al rojo de aviso. El número " +
    "pequeño rojo ladrillo bajo la velocidad es la racha, mostrada solo cuando " +
    "añade 5 km/h o más.",
  guideGramP2:
    "El fondo de la celda habla del lift: cuanto más cálido brilla, más térmicas " +
    "espera el modelo allí, y un velo gris señala las nubes. Pasa el ratón por " +
    "una celda para leer la temperatura exacta y la cobertura nubosa a esa " +
    "altitud, y sigue la línea azul a través de la rejilla — la isoterma de " +
    "0 °C — para rastrear el nivel de congelación.",
    demoSpeed: "velocidad del viento, km/h",
  demoGust: "racha (solo cuando añade 5 km/h o más)",
  demoArrow: "hacia dónde va el aire",
  demoHover: "hover: temperatura, nubosidad",
  demoIso0: "isoterma de 0 °C",
  demoScale: "km/h",
  guideSoundTitle: "El sondeo, capa por capa",
  guideSoundP1:
    "El sondeo dibuja una hora de atmósfera sobre el suelo: la curva naranja es la " +
    "temperatura, la azul el punto de rocío. La línea dorada vertical es la " +
    "trayectoria de una parcela que asciende en seco desde la superficie — se " +
    "enfría 9,8 °C por kilómetro, el gradiente adiabático seco.",
  guideSoundP2:
    "Donde la curva naranja queda a la izquierda de esa línea, el aire circundante " +
    "está más frío que una parcela que asciende: es inestable, las térmicas suben. " +
    "Donde la curva queda a la derecha, el aire frena el ascenso: es estable. En esencia, es la capa que el windgram tiñe de convectiva — el windgram puede " +
    "llevarla algo más arriba, porque el aire húmedo en superficie mantiene las " +
    "térmicas vivas más tiempo que un cálculo de parcela seca.",
  guideSoundP3:
    "Donde las curvas naranja y azul se juntan, el aire está casi saturado: esa es " +
    "la base de las nubes. Pasa el ratón por el gráfico para leer la temperatura y " +
    "el punto de rocío exactos a cada altitud; el perfil del viento se dibuja a la derecha.",
  guideWhyTitle: "¿Por qué esta app?",
  guideWhyModels:
    "Solo modelos serios: AROME, ARPEGE, ICON-CH1 de MeteoSwiss, ICON-D2 del DWD, " +
    "HARMONIE del DMI — mantenidos por servicios meteorológicos nacionales con " +
    "medios de verdad, y eliges el que encaja con tu spot.",
  guideWhyFree:
    "Completamente gratis, sin cuenta, sin anuncios: toda la app corre en tu navegador.",
  guideWhyCompare:
    "Varios lugares lado a lado en la misma página: fija el despegue, el aterrizaje " +
    "y el valle de al lado y compáralos hora a hora.",
  guideWhyRuns:
    "Siempre la última pasada de cada modelo, tan pronto la publica Open-Meteo — " +
    "a diferencia de algunas webs de pago que suelen mostrar una sola pasada al día.",
  guideDataTitle: "¿De dónde vienen los datos?",
  guideDataP1:
    "Weather4Paragliding no tiene servidor propio: tu navegador llama directamente " +
    "a la API de Open-Meteo, un servicio gratuito que redistribuye la salida bruta " +
    "de los modelos nacionales (AROME y ARPEGE de Météo-France, ICON-CH1 de " +
    "MeteoSwiss, ICON-D2 del DWD, HARMONIE del DMI).",
  guideDataP2:
    "Recuerda qué es una previsión: la salida de una pasada de modelo, no una " +
    "observación. Un valor puntual es la celda de rejilla más cercana: una cresta " +
    "marcada o un valle estrecho solo se aproxima, y los efectos locales como las " +
    "térmicas o la brisa de valle se esbozan, no se miden. Cuando dos modelos " +
    "se contradicen, esa es la incertidumbre real — compáralos antes de " +
    "comprometerte.",
  guideContribTitle: "Las contribuciones son bienvenidas",
  guideContribP1:
    "El proyecto es de código abierto (AGPL-3.0) y vive en GitHub. Bug, " +
    "traducción tosca, funcionalidad que falta — cada issue ayuda. Un clic abre " +
    "el formulario:",
  contribBug: "Informar de un bug",
  contribFeature: "Sugerir una mejora",
};