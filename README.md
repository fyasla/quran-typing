# Quran Typing

Apprendre et mémoriser le saint Coran en le tapant au clavier — les 604 pages du
mushaf de Madinah (script QPC Hafs), avec révision espacée et suivi de précision.
Gratuit, hors-ligne (PWA), sans publicité.

## Fonctionnalités

- **Frappe page par page** sur la mise en page exacte du mushaf de Madinah
  (15 lignes, ligatures préservées via l'API CSS Custom Highlight)
- **Trois niveaux** : sans harakats, harakats importantes, ou exhaustif
- **Deux claviers** : disposition arabe du système, ou mapping intégré Arabic 101
  (tapez l'arabe depuis n'importe quel clavier physique)
- **Mode aveugle** : le texte n'apparaît qu'au fur et à mesure — pour réciter de mémoire
- **Révision espacée** (SM-2 simplifié) : chaque page terminée est replanifiée
  selon votre précision ; les pages dues vous attendent dans le panneau Révision
- **Profils locaux** avec export/import JSON — aucune donnée ne quitte votre appareil
- **Reprise mi-page**, thème sombre, interface en français, anglais et arabe (RTL)
- **PWA installable** : fonctionne hors-ligne, s'installe sur mobile et bureau

## Développement

```bash
npm install
npm run fetch-data   # une seule fois : télécharge les 604 pages (API quran.com)
npm run dev
```

Scripts utiles :

| Commande | Rôle |
| --- | --- |
| `npm test` | tests du moteur de frappe et de la révision espacée |
| `npm run test:corpus` | frappe simulée des 604 pages dans les 3 modes |
| `npm run lint` | ESLint |
| `npm run build` | typecheck + build de production (`dist/`) |

## Déploiement

Le site se déploie sur **Netlify** : importez ce dépôt GitHub dans Netlify,
la configuration est lue depuis `netlify.toml` (build `npm run build`,
publication `dist/`). Chaque push sur `main` déclenche un déploiement.
La CI GitHub Actions (lint + tests + build) tourne sur chaque push/PR.

### Application mobile

L'app est une **PWA installable** : sur Android (Chrome) et iOS (Safari ≥ 16.4),
« Ajouter à l'écran d'accueil » installe l'application avec icône et mode hors-ligne.
À valider sur appareil réel : le clavier virtuel arabe (saisie `beforeinput`),
le focus au premier tap, et l'installation depuis Safari iOS.

Pour aller plus loin un jour (non nécessaire) :
- **Play Store** : empaquetage TWA via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
  (compte développeur Google, 25 $ une fois)
- **Synchronisation multi-appareils** : la couche de stockage est isolée dans
  `src/store/progress.ts` — un backend (ex. Supabase) peut s'y brancher sans toucher au reste

## Sources et licences

- Texte et mise en page : [API quran.com v4](https://api.quran.com) (mushaf QPC Hafs
  Unicode, 604 pages / 15 lignes)
- Police : « KFGQPC HAFS Uthmanic Script » du Complexe du Roi Fahd pour
  l'impression du saint Coran
- Ces ressources sont utilisées dans un cadre **gratuit et non commercial**.
  Tout usage commercial exigerait l'autorisation de leurs ayants droit.
