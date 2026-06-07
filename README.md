# Simu Immo

Application Electron (Windows / macOS) combinant un simulateur d'emprunt immobilier
et un tracker de projet d'achat immobilier. Interface React, mode sombre, données
sauvegardées en local (`localStorage`).

## Modules

### 1. Simulateur d'emprunt
- Inputs : prix du bien, apport, taux, durée, assurance emprunteur
- Outputs : mensualité, coût total du crédit, tableau d'amortissement complet,
  comparaison avec un loyer équivalent
- 3 scénarios comparables affichés côte à côte

### 2. Tracker de projet
- Étapes configurables avec statut (à faire / en cours / fait) : épargne cible,
  simulation notaire, recherche du bien, offre, compromis, financement, signature
- Barre de progression globale du projet
- Suivi budget cible vs épargne actuelle, avec projection de la date d'atteinte

## Développement

```bash
npm install
npm run electron:dev   # lance Vite + Electron en mode développement
```

## Build

```bash
npm run dist:mac   # build macOS (.dmg)
npm run dist:win   # build Windows (.exe / NSIS)
```

Les artefacts de build sont générés dans `release/`.
