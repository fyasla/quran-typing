export default {
  app: {
    title: 'Quran Typing',
    subtitle: 'Apprendre le saint Coran en le tapant au clavier',
  },
  nav: {
    page: 'Page',
    surah: 'Sourate',
    prevPage: 'Page précédente',
    nextPage: 'Page suivante',
    settings: 'Réglages',
    of: 'sur',
  },
  settings: {
    title: 'Réglages',
    close: 'Fermer',
    harakat: {
      label: 'Harakats',
      none: 'Sans harakats',
      noneDesc: 'Seules les lettres sont tapées, les harakats sont complétées automatiquement.',
      important: 'Harakats importantes',
      importantDesc:
        'Voyelles, tanwins, shadda et sukun requis ; les marques mineures (maddah, zéro rond des lettres muettes…) sont automatiques.',
      all: 'Exhaustif (super strict)',
      allDesc: 'Chaque caractère Unicode doit être tapé à l’identique, marques mineures comprises.',
    },
    smallLetters: {
      label: 'Petites lettres (saghira)',
      strict: 'Strict',
      strictDesc:
        'Alif, waw et ya saghira doivent être tapés avec leurs caractères propres (mapping personnalisé recommandé).',
      flexible: 'Souple',
      flexibleDesc: 'La lettre normale (ا، و، ي) est acceptée à la place de la petite lettre.',
    },
    blind: {
      label: 'Mode aveugle',
      desc: 'Le texte grisé est masqué : le texte n’apparaît qu’au fur et à mesure de la frappe.',
    },
    theme: {
      label: 'Thème',
      auto: 'Automatique',
      light: 'Clair',
      dark: 'Sombre',
    },
    language: {
      label: 'Langue',
    },
    keyboard: {
      label: 'Clavier',
      system: 'Clavier système',
      systemDesc: 'Utilise la disposition arabe de votre système d’exploitation.',
      custom: 'Mapping intégré (Arabic 101)',
      customDesc:
        'L’application convertit les touches physiques selon la disposition arabe standard, quel que soit votre clavier. Touches en plus : - = \\ pour les petites lettres.',
    },
  },
  welcome: {
    title: 'Bienvenue',
    intro1:
      'Quran Typing vous aide à mémoriser le saint Coran en le tapant au clavier, page par page, sur le mushaf de Madinah.',
    intro2:
      'Le texte se colore au fil de la frappe : vert = correct, rouge = erreur. Chaque page terminée est planifiée en révision espacée pour ancrer la mémorisation.',
    kbTitle: 'Votre clavier',
    kbIntro: 'Comment voulez-vous taper l’arabe ?',
    kbHelpTitle: 'Activer un clavier arabe sur votre appareil',
    kbHelpWindows:
      'Windows : Paramètres → Heure et langue → Langue et région → Ajouter une langue → Arabe.',
    kbHelpMac: 'macOS : Réglages système → Clavier → Sources de saisie → + → Arabe.',
    kbHelpMobile: 'Android / iPhone : réglages du clavier → Langues → Ajouter l’arabe.',
    harakatTitle: 'Niveau de difficulté',
    harakatIntro:
      'Faut-il taper les voyelles (harakats) ? Vous pourrez changer à tout moment dans les réglages.',
    next: 'Continuer',
    back: 'Retour',
    start: 'Commencer',
    help: 'Revoir l’introduction',
  },
  profile: {
    label: 'Profil',
    guest: 'Invité',
    create: 'Créer un profil',
    namePlaceholder: 'Votre nom…',
    export: 'Exporter les données',
    import: 'Importer des données',
    importError: 'Fichier invalide : export Quran Typing attendu.',
    delete: 'Supprimer ce profil',
    deleteConfirm: 'Supprimer le profil « {{name}} » et toutes ses données ?',
  },
  review: {
    title: 'Révision',
    dueToday: 'à réviser',
    streak: 'jours de suite',
    learned: 'pages travaillées',
    avgAccuracy: 'précision moyenne',
    due: 'Pages à réviser',
    none: 'Rien à réviser aujourd’hui.',
    recent: 'Dernières sessions',
    lastAccuracy: 'Dernière précision : {{accuracy}}%',
    nextReview_one: 'À revoir demain',
    nextReview_other: 'À revoir dans {{count}} jours',
    createProfileHint: 'Créez un profil (en haut à droite) pour enregistrer vos révisions.',
  },
  typing: {
    clickToFocus: 'Cliquez sur la page puis tapez au clavier',
    pageComplete: 'Page terminée !',
    accuracy: 'Précision',
    errors: 'erreurs',
    continueNext: 'Page suivante',
    restart: 'Recommencer la page',
    loading: 'Chargement…',
    loadError: 'Erreur de chargement des données. Avez-vous exécuté « npm run fetch-data » ?',
  },
};
