# Fun Padel : site de tournoi avec espace organisateurs

Site web pour des tournois de padel en double avec partenaires tournants, pensé pour les smartphones. Les participants n'ont ni compte ni application à télécharger : on partage un lien. Ils peuvent aussi l'ajouter à leur écran d'accueil pour l'ouvrir comme une application.

Les organisateurs disposent d'un espace protégé (`admin.html`) pour créer les tournois, générer les plannings et tout régler, sans toucher au code.

## Ce que fait le site

**Pour les participants** (`index.html`)
- **Matchs** : planning par tour (terrain, horaire, équipes), recherche de son nom, joueurs au repos, saisie et correction des scores, historique des saisies.
- **Mes matchs** : prochain match, partenaire, adversaires, résultats et rang.
- **Classement** : calculé selon la règle choisie par les organisateurs, mis à jour en direct.
- **Remplacements** : un joueur absent peut être remplacé à partir d'un tour.
- **Photos** : album commun, photos et vidéos (50 Mo maximum par fichier).
- **Vote** : catégories personnalisables, un bulletin par participant, résultats à l'heure fixée.
- Mise à jour automatique toutes les 15 secondes, mode sombre, icône installable sur iPhone et Android.

**Pour les organisateurs** (`admin.html`)
- Créer, dupliquer, publier, archiver et supprimer des tournois. Chaque tournoi a son propre lien (`…/?t=nom-du-tournoi`). Le lien principal affiche le tournoi publié le plus récent.
- Saisir les joueurs (copier-coller d'une liste), choisir le nombre de terrains, de tours, les horaires et le score à atteindre.
- **Générer le planning automatiquement** : partenaires tournants, jamais deux fois le même partenaire, nombre de matchs équilibré, adversaires variés.
- **Choisir le calcul du classement** : points + bonus victoire, victoires d'abord, barème championnat (avec bonus défensif) ou points marqués ; moyenne par match automatique quand tout le monde ne joue pas autant ; départages réglables.
- Paramétrer le vote : catégories, titre, date et heure des résultats. Les organisateurs voient les résultats et les remarques à tout moment.
- Suivi en direct : scores saisis, bulletins, photos ; retrait d'une photo ; remise à zéro après un test.
- Ajouter d'autres organisateurs avec un code d'activation.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Le site des participants |
| `admin.html` | L'espace organisateurs |
| `config.js` | **Le seul fichier à modifier** : adresse et clé de votre projet Supabase |
| `commun.js`, `classement.js`, `planning.js` | Code partagé : connexion, calcul du classement, générateur de planning |
| `manifest.webmanifest`, `sw.js`, `icone-*.png` | Rendent le site installable comme une application |
| `logo.svg` | Logo, à remplacer par celui de votre club (et regénérer les icônes) |
| `supabase.sql` | Création de la base, à lancer une fois dans Supabase (inutile sur GitHub) |
| `.nojekyll` | Fichier vide utile à GitHub Pages |

## Installation (environ 25 minutes, une seule fois)

Il faut un compte [GitHub](https://github.com) (hébergement gratuit du site) et un compte [Supabase](https://supabase.com) (base de données, plan gratuit).

### 1. La base de données (Supabase)

1. Créez un projet Supabase (plan Free, région la plus proche).
2. Ouvrez `supabase.sql` et, **tout en bas**, remplacez `votre.email@exemple.com` par votre email et `CODE-A-CHANGER` par un code de votre choix (8 caractères minimum).
3. **SQL Editor > New query** : collez tout le fichier, puis **Run**. Le message attendu est « Success. No rows returned ».
4. **Authentication > Sign In / Providers > Email** : désactivez **Confirm email** et enregistrez. Vérifiez aussi que **Allow new users to sign up** est activé. Sans email de confirmation, les organisateurs créent leur accès directement. La sécurité reste assurée par le code d'activation : un compte sans code n'a aucun droit.
5. Notez deux informations :
   - l'adresse du projet : **Project Settings > Data API > Project URL** ;
   - la clé publique : **Project Settings > API Keys > Publishable key** (elle commence par `sb_publishable_`).

### 2. Le site

Ouvrez `config.js` et remplacez les deux valeurs :

```js
window.FUN_PADEL = {
  url: "https://VOTRE-PROJET.supabase.co",
  cle: "VOTRE_CLE_PUBLIABLE"
};
```

La clé publique est faite pour être visible : elle ne donne que les droits prévus par `supabase.sql`.

### 3. La mise en ligne (GitHub Pages)

1. Créez un dépôt **public** sur GitHub et déposez-y tous les fichiers (sauf `supabase.sql`, inutile en ligne).
2. **Settings > Pages** : Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Une à deux minutes plus tard, le site est en ligne à l'adresse `https://VOTRE-COMPTE.github.io/NOM-DU-DEPOT/`.

### 4. Votre premier tournoi

1. Ouvrez `…/admin.html`, choisissez **Première connexion**, puis saisissez l'email et le code mis dans `supabase.sql` ainsi qu'un mot de passe de votre choix.
2. **+ Nouveau tournoi** : remplissez les infos, collez les joueurs, générez le planning, choisissez le classement et le vote.
3. Passez le statut sur **Publié** et cliquez sur **Enregistrer**. Partagez le lien (bouton « Copier le lien »).

Conseil : faites un essai avec un tournoi de test, saisissez quelques scores depuis votre téléphone, puis utilisez **Suivi > Remise à zéro** (ou supprimez le tournoi).

## Gérer les organisateurs

- **Ajouter** : sur l'accueil de l'admin, saisissez l'email. Un code est créé, avec un message prêt à envoyer. La personne ouvre `admin.html`, choisit « Première connexion » et utilise son email et ce code.
- **Mot de passe oublié** : dans Supabase, **Authentication > Users**, supprimez son compte ; puis dans l'admin, cliquez sur **Nouveau code** et renvoyez le message.
- **Retirer** : bouton « Retirer » à côté de son email.

## À savoir

- **Statuts** : un *brouillon* n'est visible que des organisateurs connectés ; *publié* = visible et ouvert aux saisies ; *archivé* = consultation seulement (plus de saisie de scores, de votes ni de photos).
- **Pendant le tournoi** : les noms peuvent être corrigés à tout moment ; le nombre de joueurs, de terrains et le planning sont verrouillés dès qu'un score a été saisi. Le mode de classement peut être changé à tout moment, le site se met à jour tout seul.
- **Confiance** : les participants peuvent saisir et corriger les scores, remplacer un joueur et publier des photos. Une correction ajoute une ligne, la plus récente fait foi.
- **Vote** : un bulletin par nom et par tournoi, sans vérification d'identité. Les bulletins ne sont jamais lisibles : seuls les totaux sortent.
- **Installer l'application** : sur iPhone, ouvrez le lien dans Safari, puis Partager > « Sur l'écran d'accueil ». Sur Android, ouvrez-le dans Chrome, puis menu > « Installer l'application ».
- **Après le tournoi** : téléchargez l'album, puis archivez le tournoi.
