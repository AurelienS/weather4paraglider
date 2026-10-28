import type { Dict } from "./en";

export const fr: Dict = {
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
  metaCache: "run {slot} UTC",
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
  viewMeteogram: "Météogramme",
  seeHigher: "Voir plus haut",
  seeHigherBack: "Revenir à 5 km",
  hoursEarly: "Avant 8 h",
  hoursEarlyBack: "Dès 8 h",
  hoursEarlyShort: "avant",
  hoursLate: "Après 20 h",
  hoursLateBack: "Jusqu'à 20 h",
  hoursLateShort: "après",
  meteoLblCloud: "Nuages",
  meteoLblCbl: "Couche convective",
  meteoLblWind: "Vent",
  meteoLblGust: "Rafales",
  hourLabel: "Heure",
  prevHour: "Heure précédente",
  nextHour: "Heure suivante",
  navAria: "Pages principales",
  tabPlace: "Lieu",
  tabGuide: "Guide",
  compareModels: "Comparer des modèles",
  recentPlaces: "Lieux récents",
  boardAria: "Plan de comparaison",
  historyLabel: "Récents",
  models: "Modèles ({n})",
  boardOne: "Compare · 1 lieu",
  boardMany: "Compare · {n} lieux",
  boardOneModel: "1 modèle",
  boardModels: "{n} modèles",
  boardEmptyPlaces: "Sélectionnez des lieux à comparer…",
  boardEmptyModels: "Sélectionnez des modèles à comparer…",
  boardAverage: "Moyenne",
  boardAddAria: "Ajouter un lieu à la comparaison",
  boardAddPlaceholder: "Ajouter un lieu à comparer…",
  boardSwitchAria: "Changer le lieu de la comparaison de modèles",
  boardSwitchPlaceholder: "Changer de lieu…",
  addCompareAria: "Ajouter {label} à la comparaison",
  addCompare: "Ajouter à la comparaison",
  boardClear: "Tout retirer",
  placeLabel: "Lieu",
  placePlaceholder: "Chercher un lieu — Chamonix, Annecy…",
  searching: "Recherche…",
  searchUnavailable: "Recherche indisponible.",
  noResults: "Aucun résultat.",
  favorites: "Favoris ({n})",
  favoritesEmpty: "Aucun favori pour l'instant.",
  favoritesEmptyHint: "Chargez un lieu, puis l'étoile pour le garder ici.",
  railFavorites: "Favoris",
  recentEmpty: "Les lieux que vous ouvrez s'affichent ici.",
  removeFavoriteAria: "Retirer {label} des favoris",
  alreadyInCompare: "Déjà dans la comparaison",
  mapOpen: "Carte…",
  refresh: "Rafraîchir",
  compareCheck: "Comparer des lieux",
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
  tipLift: "ascendance {n} m/s",
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
  pinUpAria: "Monter {label}",
  pinDownAria: "Descendre {label}",
  loading: "Chargement…",
  noDataDay: "Pas de données pour ce jour.",
  soundingUnavailable: "Ce modèle n'a pas de niveaux isobares — émagramme indisponible. Choisis un autre modèle.",
  pinAlt: "alt. {m} m",
  pinRun: "run {day} {slot} UTC",
  errNoData:
    "{model} n'a pas de données pour ce lieu : ce modèle couvre une zone plus petite. " +
    "Choisissez l'autre modèle dans la colonne (AROME couvre toute la France).",
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
  guideTitle: "Premiers pas",
  guideIntro:
    "Finesse des particules transforme les modèles météo numériques libres en windgram " +
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
    "tout le pays, monte jusqu'aux couches d'altitude, et voit environ trois jours.",
  guideModelsP2:
    "ICON D2 2,2 km du DWD est la seconde lecture — Allemagne, Alpes et grande partie " +
    "de la France, sur environ deux jours, avec le même genre de profil vertical. " +
    "On passe de l'un à l'autre dans la colonne. Quand ils divergent, cet écart est " +
    "la prévision.",
  guideLimitsTitle: "Couverture géographique",
  guideLimitsP1:
    "AROME couvre la France et ses voisins. ICON D2 couvre l'Allemagne, les Alpes et " +
    "la plus grande partie de la France, mais pas l'extrême sud-est de la côte. " +
    "Open-Meteo n'a pas de données en dehors de la grille d'un modèle.",
  guideLimitsP2:
    "Quand votre point est dehors, l'application vous le dit au lieu d'afficher " +
    "silencieusement une cellule voisine — choisissez l'autre modèle dans la colonne.",
  guideQuotaTitle: "Le quota Open-Meteo",
  guideQuotaP1:
    "L'application parle directement à Open-Meteo, un service gratuit ; il n'y a pas " +
    "de serveur intermédiaire. Le nombre d'appels quotidiens est compté par " +
    "visiteur : une session très active peut atteindre la limite — elle se renouvelle " +
    "toute seule au bout de quelques minutes.",
  guideQuotaP2:
    "Les résultats sont mis en cache dans votre navigateur (créneau de 3 h, 1 h pour " +
    "la prévision immédiate) : naviguer entre les jours ou les heures ne coûte " +
    "rien. Le bouton Rafraîchir est la seule action qui force " +
    "un vrai appel.",
  guideGramTitle: "Lire le windgram",
  guideGramP1:
    "Le windgram est une grille : altitude à gauche, heures en haut et en bas. " +
    "Chaque case montre le vent pour une altitude à une heure : le grand chiffre " +
    "est la vitesse en km/h, et la flèche indique où va l'air — sa couleur suit " +
    "la vitesse, du vert pâle au rouge d'alerte. Le petit chiffre rouge brique " +
    "sous la vitesse est la rafale, affichée seulement si elle ajoute 5 km/h ou plus.",
  guideGramP2:
    "Le fond de la case est le thermique, sur une échelle de parapente : sarcelle " +
    "sous la chute de l'aile, or pour une ascendance, vermillon pour une forte, " +
    "violet pour une journée musclée. Dans une même couleur, seule l'intensité " +
    "change. Un voile gris signale les nuages. Survolez une case pour lire " +
    "la température, l'ascendance en m/s et la couverture nuageuse. Cette vitesse est " +
    "la montée moyenne d'un thermique sec, avant le taux de chute de l'aile — un " +
    "cumulus au-dessus peut en ajouter, et un vent qui forcit avec l'altitude peut " +
    "déchirer le thermique. Repérez la ligne bleue en travers de la grille — " +
    "l'isotherme 0 °C — pour suivre le niveau de gel. La grille s'arrête à 5 km. " +
    "Voir plus haut ouvre les lignes jusqu'à 10 km, tous les 500 m, " +
    "chaque jour, et les referme. Les heures vont de 8 h à 20 h. Avant 8 h " +
    "et Après 20 h ouvrent le reste de la journée, et le referment.",
    demoSpeed: "vitesse du vent, km/h",
  demoGust: "rafale (affichée si elle ajoute 5 km/h ou plus)",
  demoArrow: "direction où va l'air",
  demoHover: "survol : température, ascendance, couverture nuageuse",
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
    "Là où la courbe est à droite, l'air freine l'ascension : c'est stable. " +
    "C'est pour l'essentiel la couche que le windgram teinte en convectif. La teinte " +
    "suit la couche mélangée : l'air très chaud collé au sol ne la relève pas à lui " +
    "seul, tandis que l'air humide en surface peut la porter un peu plus haut que " +
    "cette ligne sèche.",
  guideSoundP3:
    "Là où les courbes orange et bleue se rapprochent, l'air est presque saturé : " +
    "c'est la base des nuages. Survolez le graphique pour lire la température et " +
    "le point de rosée exacts à chaque altitude ; le profil du vent est dessiné à droite, " +
    "et chaque point mesuré montre où va l'air. " +
    "Les flèches de chaque côté du graphique avancent ou reculent d'une heure, " +
    "y compris sur le jour suivant ou précédent. La ligne des heures, sous le " +
    "graphique, saute directement à l'heure voulue.",
  guideWhyTitle: "Pourquoi cette appli ?",
  guideWhyModels:
    "Deux modèles sérieux : AROME 2,5 km de Météo-France et ICON D2 du DWD, tous " +
    "deux avec les couches d'altitude qu'un parapente vole. Un clic pour passer " +
    "de l'un à l'autre.",
  guideWhyFree:
    "Totalement gratuit, sans compte, sans pub : toute l'appli tourne dans votre navigateur.",
  guideWhyCompare:
    "Les favoris et les lieux récents restent à l'écran : un clic, et le graphique " +
    "vous suit du décollage à l'atterrissage.",
  guideWhyRuns:
    "Toujours le dernier run de chaque modèle, dès qu'Open-Meteo le publie — " +
    "contrairement à certains sites payants qui n'affichent souvent qu'un run par jour.",
  guideDataTitle: "D'où viennent les données ?",
  guideDataP1:
    "Finesse des particules n'a pas de serveur : votre navigateur appelle " +
    "directement l'API Open-Meteo, un service gratuit qui redistribue la sortie " +
    "brute des modèles nationaux. Cette application lit AROME 2,5 km de " +
    "Météo-France et ICON D2 du DWD.",
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