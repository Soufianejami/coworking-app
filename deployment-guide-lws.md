# Guide de déploiement sur LWS (Linux Web Services)

Ce guide vous aidera à déployer votre application de gestion de coworking sur un hébergement LWS.

## Prérequis

1. Un compte LWS avec un hébergement web
2. Accès SSH à votre serveur LWS
3. Une base de données PostgreSQL sur LWS
4. Node.js installé sur votre serveur LWS

## Étapes de déploiement

### 1. Préparer votre base de données PostgreSQL

1. Connectez-vous à votre panneau de contrôle LWS
2. Créez une nouvelle base de données PostgreSQL
3. Notez les informations de connexion (nom d'utilisateur, mot de passe, nom de la base de données, hôte)

### 2. Transférer les fichiers de votre application vers LWS

```bash
# Depuis votre machine locale, dans le répertoire du projet
zip -r coworking-app.zip .

# Transférer le fichier vers votre serveur LWS via SCP
scp coworking-app.zip utilisateur@votreserveur.lws:~/
```

### 3. Se connecter à votre serveur via SSH et configurer l'application

```bash
# Se connecter via SSH
ssh utilisateur@votreserveur.lws

# Créer un répertoire pour l'application
mkdir -p ~/www/coworking-app

# Extraire les fichiers dans ce répertoire
cd ~/www/coworking-app
unzip ~/coworking-app.zip

# Installer les dépendances
npm install --production

# Créer un fichier .env pour stocker les variables d'environnement
nano .env
```

Ajoutez les informations suivantes dans le fichier .env :

```
DATABASE_URL=postgres://utilisateur:motdepasse@hote:5432/nomdelabase
SESSION_SECRET=votre_secret_session_tres_securise
PORT=3000
```

### 4. Configuration de la base de données

```bash
# Exécuter les migrations pour initialiser la base de données
npm run db:push
```

### 5. Configurer PM2 pour gérer le processus Node.js

```bash
# Installer PM2 globalement si ce n'est pas déjà fait
npm install -g pm2

# Démarrer l'application avec PM2
pm2 start server/index.ts --interpreter "npx tsx" --name "coworking-app"

# Configurer PM2 pour démarrer automatiquement
pm2 startup
pm2 save
```

### 6. Configurer un reverse proxy avec Nginx

Créez un fichier de configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/coworking-app
```

Ajoutez le contenu suivant :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer la configuration et redémarrer Nginx :

```bash
sudo ln -s /etc/nginx/sites-available/coworking-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configurer HTTPS avec Let's Encrypt

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### 8. Vérification du déploiement

Visitez votre site à l'adresse `https://votre-domaine.com` pour vérifier que tout fonctionne correctement.

## Maintenance et mises à jour

Pour mettre à jour votre application :

```bash
# Se connecter via SSH
ssh utilisateur@votreserveur.lws

# Aller dans le répertoire de l'application
cd ~/www/coworking-app

# Arrêter l'application
pm2 stop coworking-app

# Récupérer les dernières modifications (si vous utilisez git)
git pull

# Ou transférer les nouveaux fichiers via SCP/SFTP

# Installer les dépendances si nécessaire
npm install --production

# Appliquer les migrations de la base de données si nécessaire
npm run db:push

# Redémarrer l'application
pm2 restart coworking-app
```

## Sauvegarde

Pensez à configurer des sauvegardes régulières de votre base de données :

```bash
# Créer un script de sauvegarde
nano ~/backup-db.sh
```

Contenu du script :

```bash
#!/bin/bash
BACKUP_DIR=~/backups
TIMESTAMP=$(date +%Y%m%d%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U votrenomdutilisateur -h votrehote -d nomdelabase > $BACKUP_DIR/coworking-app-$TIMESTAMP.sql
```

Rendre le script exécutable et configurer une tâche cron :

```bash
chmod +x ~/backup-db.sh
crontab -e
```

Ajouter la ligne suivante pour exécuter la sauvegarde tous les jours à 2h du matin :

```
0 2 * * * ~/backup-db.sh
```