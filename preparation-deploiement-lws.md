# Préparation au déploiement sur LWS

## Liste de vérification avant déploiement

### 1. Préparation de l'application

- [ ] Vérifier que l'application fonctionne correctement en local
- [ ] S'assurer que toutes les dépendances sont correctement listées dans package.json
- [ ] Créer un script de build pour la production (`npm run build`)
- [ ] Tester le build (`npm run preview`)

### 2. Préparation de la base de données

- [ ] Sauvegarder votre base de données locale
- [ ] Créer un script d'export des données SQL

```bash
# Exportation de la base de données en SQL
pg_dump -U your_username -d your_database_name > coworking_db_backup.sql
```

### 3. Configuration pour la production

Assurez-vous que ces fichiers sont configurés pour la production :

#### Fichier .env.example (à copier et renommer en .env sur le serveur)

```
# Configuration de base de données
DATABASE_URL=postgres://utilisateur:motdepasse@hote:5432/nomdelabase

# Sécurité
SESSION_SECRET=votre_secret_session_tres_securise

# Configuration du serveur
PORT=3000
NODE_ENV=production
```

#### Pour le serveur Node.js

Créer un fichier `ecosystem.config.js` pour PM2 :

```javascript
module.exports = {
  apps: [{
    name: "coworking-app",
    script: "server/index.ts",
    interpreter: "npx",
    interpreter_args: "tsx",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};
```

### 4. Créer une archive du projet

```bash
# Exclure les node_modules et autres fichiers inutiles
zip -r coworking-app.zip . -x "node_modules/*" -x ".git/*" -x "*.log" -x ".env"
```

## Configuration LWS spécifique

### Informations requises pour votre hébergement LWS

- [ ] Nom d'utilisateur SSH
- [ ] Mot de passe SSH ou clé SSH
- [ ] Adresse du serveur
- [ ] Informations de connexion à la base de données PostgreSQL
- [ ] Nom de domaine que vous souhaitez utiliser

### Considérations spécifiques à LWS

- Vérifiez la version de Node.js disponible sur votre hébergement LWS
- Confirmez que vous avez les droits d'installation de PM2 et autres dépendances globales
- Vérifiez les règles de pare-feu pour vous assurer que les ports nécessaires sont ouverts

## Après le déploiement

### Vérification

- [ ] Tester la connexion à la base de données
- [ ] Vérifier que l'authentification fonctionne
- [ ] Tester les fonctionnalités principales
- [ ] Vérifier que les statistiques et rapports fonctionnent
- [ ] Configurer les sauvegardes automatiques

### Surveillance

- [ ] Configurer la surveillance des performances de l'application
- [ ] Mettre en place des alertes en cas de panne ou d'erreurs fréquentes
- [ ] Tester le processus de restauration des sauvegardes

## Notes supplémentaires

- Assurez-vous d'avoir un accès régulier au serveur pour appliquer les mises à jour de sécurité
- Documentez les procédures de déploiement et de restauration
- Gardez une copie locale de sauvegarde de la base de données à jour