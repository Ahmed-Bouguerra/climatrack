# Configuration API ClimaTrack

## Fichier users.json

Le fichier API utilise un fichier JSON pour stocker les utilisateurs. Vous devez créer/mettre à jour le fichier `c:\xampp\htdocs\climatrack-api\users.json` avec le contenu suivant :

```json
[
  {
    "email": "admin@climatrack.com",
    "password": "admin123",
    "role": "admin"
  },
  {
    "email": "agriculteur@climatrack.com",
    "password": "agri123",
    "role": "agriculteur"
  }
]
```

## Comptes de test

### Compte Admin
- Email: `admin@climatrack.com`
- Mot de passe: `admin123`
- Rôle: `admin`

### Compte Agriculteur
- Email: `agriculteur@climatrack.com`
- Mot de passe: `agri123`
- Rôle: `agriculteur`

## Flux d'utilisation

1. Accédez à http://localhost:4200
2. Vous serez redirigé vers `/connexion`
3. Connectez-vous avec l'un des comptes ci-dessus
4. Admin: redirigé vers `/admin/agriculteurs` (liste des agriculteurs)
5. Agriculteur: redirigé vers `/accueil` (page d'accueil)

## Ajouter de nouveaux comptes

1. Allez à http://localhost:4200/inscription
2. Remplissez le formulaire d'inscription
3. Cliquez sur "Créer mon compte"
4. Le compte sera sauvegardé dans `users.json`
5. Vous pourrez vous connecter avec ce compte

## API Endpoint

L'API est disponible à : `http://localhost:9999/climatrack-api/index.php`

Actions disponibles :
- `login`: POST avec email et password
- `register`: POST avec email, password, et role (optionnel, défaut: agriculteur)
