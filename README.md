# ManuShop

Boutique en ligne construite avec Next.js et TypeScript.

## Importer le projet dans le dépôt Git

Une fois le dépôt GitHub créé vide, place-toi dans le dossier local de ton projet Next.js puis exécute les commandes suivantes sur Fedora 44 :

```bash
sudo dnf install -y git
cd /chemin/vers/manushop
git init
git add .
git commit -m "chore: initialiser le projet Next.js"
git branch -M main
git remote add origin git@github.com:parfait92-git/ManuShop.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```

## Résultat attendu

- `main` devient la branche principale du dépôt.
- `develop` devient la branche de travail pour le développement courant.
- Le projet local reste positionné sur `develop` après sa création.

## Vérifications utiles

```bash
git branch
git remote -v
git status
```

Pour éviter les conflits d'historiques, crée le dépôt distant sans `README`, sans licence et sans `.gitignore` avant l'import initial.
