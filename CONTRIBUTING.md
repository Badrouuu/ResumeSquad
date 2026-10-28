# Guide de Contribution — ResumeSquad AI

Merci de votre intérêt pour **ResumeSquad AI** ! Les contributions sont les bienvenues pour faire évoluer le moteur multi-agents, les algorithmes de scoring ATS et l'interface utilisateur.

---

## 🛠️ Workflow de Développement

1. **Forker** le dépôt et cloner votre fork en local :
   ```bash
   git clone https://github.com/<votre-username>/ResumeSquad.git
   cd ResumeSquad
   ```

2. **Créer une branche dédiée** selon la convention :
   - `feat/nom-fonctionnalite` pour un ajout de fonctionnalité
   - `fix/nom-bug` pour une correction de bug
   - `refactor/nom-amelioration` pour de la restructuration de code

3. **Environnement Backend (Python 3.12+) :**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # ou .venv\Scripts\activate sous Windows
   pip install -r requirements.txt
   ```

4. **Lancer les tests unitaires avant de commiter :**
   ```bash
   pytest tests/ -v
   ```

5. **Frontend (Next.js 15 / React 19) :**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

---

## 📝 Conventions de Commit (Conventional Commits)

Nous suivons le standard [Conventional Commits](https://www.conventionalcommits.org/) :
- `feat: ...` : Nouvelle fonctionnalité (ex: nouvel agent, export PDF direct)
- `fix: ...` : Correction de bug (ex: parsing JSON, regex ATS)
- `docs: ...` : Documentation et README
- `refactor: ...` : Refactorisation sans changement de comportement
- `test: ...` : Ajout ou mise à jour de tests unitaires
- `chore: ...` : Maintenance, dépendances, CI/CD

---

## 🚀 Proposer une Pull Request (PR)

- Vérifiez que tous les tests passent en local (`pytest tests/`).
- Ouvrez une Pull Request claire détaillant la problématique résolue et les changements apportés.
- La suite CI GitHub Actions validera automatiquement votre contribution.
