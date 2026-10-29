# Règles de Développement & Protocole Git pour les Agents

Ce fichier définit les directives obligatoires pour tout agent intervenant sur ce projet.

---

## 1. Protocole de Gestion des Branches Git (Obligatoire)
- **Interdiction formelle de modifier directement la branche `main` (ou `master`).**
- Au tout début de chaque tâche de développement :
  1. Vérifier l'état actuel avec `git status` et `git branch`.
  2. Créer ou basculer systématiquement sur une branche thématique dédiée :
     - Pour une nouvelle fonctionnalité : `git checkout -b feature/<nom-court>`
     - Pour un correctif : `git checkout -b fix/<nom-court>`
     - Pour un refactoring : `git checkout -b refactor/<nom-court>`

## 2. Validation et Qualité
- Vérifier que les modifications ne cassent pas le projet (tester/compiler si applicable).
- Réaliser des commits clairs et atomiques selon la convention **Conventional Commits** :
  - `feat: description de la nouveauté`
  - `fix: correction du bug`
  - `refactor: restructuration du code`
- **Ne jamais faire de `git push`** sans demande explicite du développeur.

## 3. Communication
- Si des questions d'architecture ou des ambiguïtés surviennent, poser la question directement au développeur plutôt que d'émettre des hypothèses risquées.
- Résumer en fin d'intervention la branche créée et les changements effectués.
