import type { Dict } from "./en";

export const fr: Dict = {
  brandSub: "Windgram & sounding par modèle · Open-Meteo multi-modèles",
  themeToLight: "Passer en thème clair",
  themeToDark: "Passer en thème sombre",
  langLabel: "Langue",
  homeAria: "Revenir à l’accueil",
  retry: "Réessayer",
  updating: "Mise à jour…",
  extracting: "Extraction du profil…",
  addFavorite: "+ Favori",
  addFavoriteAria: "Ajouter le lieu courant à vos favoris",
  metaCell: "cellule {lat}, {lon}",
  metaAlt: "alt. modèle {m} m",
  metaCache: "cache {slot} UTC",
  modelLabel: "Modèle",
  modelGroupNowcast: "Nowcast — prochaines heures",
  modelGroupLowLevel: "Précis près du sol",
  modelGroupAllAltitude: "Précis à toutes altitudes",
  modelGroupLongRange: "Plus long terme (4 jours)",
  daysSuffix: "{n} jours",
  dayTablist: "Jour",
  viewTablist: "Vue",
  viewWindgram: "Windgram",
  viewSounding: "Émagramme",
  hourLabel: "Heure",
  hintLevels: "Grille 250 m interpolée entre les niveaux du modèle",
  boardAria: "Plan de comparaison",
  boardOne: "Compare · 1 lieu",
  boardMany: "Compare · {n} lieux",
  boardAddAria: "Ajouter un lieu à la comparaison",
  boardAddPlaceholder: "Ajouter un lieu à comparer…",
  boardClear: "Tout retirer",
  placeLabel: "Lieu",
  placePlaceholder: "Chercher un lieu — Chamonix, Annecy…",
  searching: "Recherche…",
  searchUnavailable: "Recherche indisponible.",
  noResults: "Aucun résultat.",
  favorites: "Favoris ({n})",
  favoritesEmpty: "Aucun favori pour l'instant.",
  favoritesEmptyHint: "Chargez un lieu puis « + Favori » pour le garder ici.",
  removeFavoriteAria: "Retirer {label} des favoris",
  alreadyInCompare: "Déjà dans la comparaison",
  mapOpen: "Carte…",
  refresh: "Rafraîchir",
  compareCheck: "Comparer des lieux",
  compareHint: "Empiler plusieurs lieux sur une page",
  mapAria: "Choisir un point sur la carte",
  mapTitle: "Choisir un point",
  mapHint: "Cliquez ou déplacez sur la carte — Échap pour fermer",
  mapClose: "Fermer",
  latitude: "Latitude",
  longitude: "Longitude",
  applyCoords: "Appliquer les coordonnées",
  outOfDomain: "Hors du domaine {model}",
  usePoint: "Utiliser ce point",
  sol: "sol {m}",
  rain: "pluie",
  tSoil: "T sol",
  tMissing: "T —",
  tipNeb: "neb {n}%",
  outOfForecast: "hors prévision",
  surfaceAria: "Surface",
  statT2m: "T 2 m",
  statTd2m: "Td 2 m",
  statRh: "HR",
  statWind: "Vent 10 m",
  statGusts: "Rafales",
  statCape: "CAPE",
  statPrecip: "Précip.",
  statCloudBase: "Base nuages",
  statCloudCover: "Nébulosité",
  statPsfc: "P sol",
  hintSpread: "T−Td {x} K",
  cloudNone: "aucune",
  hintAgl: "+{m} m sol",
  hintCloudLayers: "basse / moyenne / haute %",
  soundingAria: "Émagramme : T, Td et vent. Axe vertical = adiabatique sèche.",
  dryAdiabat: "adiabatique sèche",
  unstable: "← instable",
  stable: "stable →",
  cloudBaseAnno: "base {m} m",
  axisTemp: "T / Td · vertical = γd 9,8 K/km",
  axisWind: "Vent (km/h)",
  legendAirT: "T air",
  legendTd: "Td",
  legendDalr: "adiabatique sèche (verticale)",
  legendUnstable: "penchée à gauche = instable",
  legendWind: "vent",
  hoverWind: "vent —",
  hoverCloud: "nuages {n}%",
  pinAria: "Lieu épinglé {label}",
  pinRemoveAria: "Retirer {label} de la comparaison",
  loading: "Chargement…",
  noDataDay: "Pas de données pour ce jour.",
  pinAlt: "alt. {m} m",
  errNoData:
    "{model} n'a pas de données pour ce lieu : ce modèle couvre une zone plus petite. " +
    "Choisissez un autre modèle dans la barre d'outils (AROME couvre toute la France).",
  errRateLimit:
    "Limite Open-Meteo atteinte pour votre connexion. " +
    "L'application interroge ce service gratuit directement ; son quota est compté " +
    "par visiteur et se renouvelle avec le temps. Le cache local limite déjà " +
    "les appels — réessayez dans quelques minutes.",
  errServer:
    "Open-Meteo est momentanément indisponible. " +
    "Réessayez dans un instant — les données devraient revenir.",
  errNetwork: "Impossible de joindre Open-Meteo — vérifiez votre connexion internet.",
  errUnexpected: "Une erreur inattendue est survenue.",
  guideOpen: "Premiers pas",
  guideBack: "Retour à l'application",
  guideTitle: "Premiers pas",
  guideIntro:
    "Weather4Paragliding transforme les modèles météo numériques libres en windgram " +
    "et émagramme, pensé pour le vol libre. Choisissez un lieu, puis lisez le vent " +
    "couche par couche.",
  guideHowTitle: "Une session type",
  guideHowP1:
    "Cherchez votre décollage ou votre atterrissage, puis choisissez un jour dans la " +
    "barre d'outils. Le windgram se lit comme un tableau : altitude à gauche, heures " +
    "en haut. Chaque case montre le vent à cette altitude — le chiffre est la vitesse, " +
    "la flèche indique où va l'air, et la petite valeur est la rafale quand elle " +
    "ajoute 5 km/h ou plus.",
  guideHowP2:
    "Les bandes du bas montrent la pluie et la température à 2 m. Passez en Émagramme " +
    "pour une heure précise : il dessine température et point de rosée face à " +
    "l'adiabatique sèche, pour juger d'un coup d'œil la stabilité, le sommet " +
    "convectif et la base des nuages.",
  guideModelsTitle: "Quel modèle utiliser ?",
  guideModelsP1:
    "AROME France 2,5 km est la référence pour la France métropolitaine : il couvre " +
    "tout le pays et trouve un bon équilibre entre détail et fiabilité. Utilisez AROME " +
    "15 min pour les prochaines heures, et ARPEGE Europe pour regarder à 4–5 jours.",
  guideModelsP2:
    "AROME HD 1,3 km et MeteoSwiss ICON-CH1 1 km résolvent le terrain beaucoup plus " +
    "finement. Ils n'ont pas de couches hautes, donc leur windgram s'arrête quelques " +
    "centaines de mètres au-dessus des sommets — mais pour ce qui se passe près du " +
    "sol (décollage, crête, brise de vallée) ce sont les plus précis, et ils " +
    "excellent au bord de la mer, là où les modèles grossiers lissent la brise de mer.",
  guideLimitsTitle: "Couverture géographique",
  guideLimitsP1:
    "Chaque modèle ne couvre que sa zone : AROME la France et ses voisins, ICON-CH1 " +
    "les Alpes autour de la Suisse, ICON-D2 l'Allemagne et les Alpes, HARMONIE le " +
    "nord et le centre de l'Europe. Open-Meteo n'a simplement pas de données en " +
    "dehors de la grille d'un modèle.",
  guideLimitsP2:
    "Quand votre point est dehors, l'application vous le dit au lieu d'afficher " +
    "silencieusement une cellule voisine — choisissez simplement un autre modèle " +
    "dans la barre d'outils.",
  guideQuotaTitle: "Le quota Open-Meteo",
  guideQuotaP1:
    "L'application parle directement à Open-Meteo, un service gratuit ; il n'y a pas " +
    "de serveur intermédiaire. Le nombre d'appels quotidiens est compté par " +
    "visiteur : une session très active peut atteindre la limite — elle se renouvelle " +
    "toute seule au bout de quelques minutes.",
  guideQuotaP2:
    "Les résultats sont mis en cache dans votre navigateur (créneau de 3 h, 1 h pour " +
    "la prévision immédiate) : naviguer entre les jours, les altitudes ou la " +
    "comparaison ne coûte rien. Le bouton Rafraîchir est la seule action qui force " +
    "un vrai appel.",
  guideGramTitle: "Lire le windgram",
  guideGramP1:
    "Le windgram est une grille : altitude à gauche, heures en haut et en bas. " +
    "Chaque case montre le vent pour une altitude à une heure : le grand chiffre " +
    "est la vitesse en km/h, et la flèche indique où va l'air — sa couleur suit " +
    "la vitesse, du vert pâle au rouge d'alerte. Le petit chiffre rouge brique " +
    "sous la vitesse est la rafale, affichée seulement si elle ajoute 5 km/h ou plus.",
  guideGramP2:
    "Le fond de la case parle du lift : plus il est chaud, plus le modèle attend " +
    "de thermiques à cette altitude, et un voile gris signale les nuages. " +
    "Survolez une case pour lire la température exacte et la couverture nuageuse " +
    "à cette altitude, et repérez la ligne bleue en travers de la grille — " +
    "l'isotherme 0 °C — pour suivre le niveau de gel.",
    demoSpeed: "vitesse du vent, km/h",
  demoGust: "rafale (affichée si elle ajoute 5 km/h ou plus)",
  demoArrow: "direction où va l'air",
  demoHover: "survol : température, couverture nuageuse",
  demoIso0: "isotherme 0 °C",
  demoScale: "km/h",
  guideSoundTitle: "Le sounding, couche par couche",
  guideSoundP1:
    "Le sounding dessine une heure d'atmosphère au-dessus du sol : la courbe orange " +
    "est la température, la bleue le point de rosée. La ligne dorée verticale est " +
    "le chemin d'une parcelle d'air qui monte sèchement depuis le sol — elle se " +
    "refroidit de 9,8 °C par kilomètre, le gradient adiabatique sec.",
  guideSoundP2:
    "Là où la courbe orange est à gauche de cette ligne, l'air ambiant est plus " +
    "froid qu'une parcelle qui monte : c'est instable, les thermiques montent. " +
    "Là où la courbe est à droite, l'air freine l'ascension : c'est stable. C'est pour l'essentiel la couche que le windgram teinte en convectif — le " +
    "windgram peut la porter un peu plus haut, car l'air humide en surface " +
    "maintient les thermiques plus longtemps qu'un calcul de parcelle sèche.",
  guideSoundP3:
    "Là où les courbes orange et bleue se rapprochent, l'air est presque saturé : " +
    "c'est la base des nuages. Survolez le graphique pour lire la température et " +
    "le point de rosée exacts à chaque altitude ; le profil du vent est dessiné à droite.",
  guideWhyTitle: "Pourquoi cette appli ?",
  guideWhyModels:
    "Des modèles sérieux seulement : AROME, ARPEGE, ICON-CH1 de MétéoSuisse, " +
    "ICON-D2 du DWD, HARMONIE du DMI — maintenus par des services météo " +
    "nationaux avec de vrais moyens, et vous choisissez celui qui colle à votre spot.",
  guideWhyFree:
    "Totalement gratuit, sans compte, sans pub : toute l'appli tourne dans votre navigateur.",
  guideWhyCompare:
    "Plusieurs lieux côte à côte sur la même page : épinglez le déco, l'atterro et " +
    "la vallée d'à côté et comparez-les heure par heure.",
  guideWhyRuns:
    "Toujours le dernier run de chaque modèle, dès qu'Open-Meteo le publie — " +
    "contrairement à certains sites payants qui n'affichent souvent qu'un run par jour.",
  guideDataTitle: "D'où viennent les données ?",
  guideDataP1:
    "Weather4Paragliding n'a pas de serveur : votre navigateur appelle " +
    "directement l'API Open-Meteo, un service gratuit qui redistribue la sortie " +
    "brute des modèles nationaux (AROME et ARPEGE de Météo-France, ICON-CH1 de " +
    "MétéoSuisse, ICON-D2 du DWD, HARMONIE du DMI).",
  guideDataP2:
    "Gardez en tête ce qu'est une prévision : la sortie d'un run de modèle, pas " +
    "une observation. Une valeur ponctuelle est la maille la plus proche : une " +
    "crête marquée ou une vallée étroite n'est qu'approchée, et les effets locaux " +
    "comme les thermiques ou la brise de pente sont esquissés, pas mesurés. Quand " +
    "deux modèles se contredisent, c'est la vraie incertitude — comparez-les " +
    "avant de vous engager.",
  guideContribTitle: "Les contributions sont bienvenues",
  guideContribP1:
    "Le projet est open source (AGPL-3.0) et vit sur GitHub. Bug, traduction " +
    "maladroite, idée de fonctionnalité — chaque retour compte. Un clic ouvre le " +
    "formulaire :",
  contribBug: "Signaler un bug",
  contribFeature: "Proposer une amélioration",
};