# Guide Simplifié pour Déployer votre Application Coworking sur LWS

Ce guide vous présente les étapes essentielles pour déployer votre application sur LWS en termes simples.

## Étape 1: Préparation de votre Espace LWS

1. **Achetez un hébergement LWS** qui supporte Node.js et PostgreSQL
2. **Créez une base de données PostgreSQL** depuis votre panneau d'administration LWS
3. **Notez les informations de connexion:**
   - Nom d'utilisateur
   - Mot de passe
   - Nom de la base de données
   - Serveur hôte

## Étape 2: Préparation de votre Application

1. **Créez une archive de votre application:**
   ```
   zip -r coworking-app.zip .
   ```

2. **Créez un fichier `.env.example`** avec la structure suivante:
   ```
   DATABASE_URL=postgres://utilisateur:motdepasse@hote:5432/nomdelabase
   SESSION_SECRET=un_secret_tres_securise
   PORT=3000
   NODE_ENV=production
   ```

## Étape 3: Transfert et Installation

1. **Connectez-vous à votre serveur LWS** par FTP ou SSH:
   ```
   ssh votre_utilisateur@votre_serveur_lws.com
   ```

2. **Créez un dossier pour votre application:**
   ```
   mkdir -p ~/www/coworking-app
   ```

3. **Transférez votre archive:**
   - Par FTP: utilisez un client FTP comme FileZilla
   - Par SSH: 
     ```
     scp coworking-app.zip votre_utilisateur@votre_serveur_lws.com:~/www/coworking-app/
     ```

4. **Décompressez l'archive:**
   ```
   cd ~/www/coworking-app
   unzip coworking-app.zip
   ```

5. **Installez les dépendances:**
   ```
   npm install --production
   ```

6. **Créez le fichier .env:**
   ```
   cp .env.example .env
   nano .env
   ```
   Modifiez les valeurs selon vos informations de connexion

## Étape 4: Configuration de la Base de Données

1. **Initialisez votre base de données:**
   ```
   npm run db:push
   ```

## Étape 5: Démarrage de l'Application

1. **Installez PM2** (gestionnaire de processus):
   ```
   npm install -g pm2
   ```

2. **Démarrez votre application:**
   ```
   pm2 start server/index.ts --interpreter "npx tsx" --name "coworking-app"
   ```

3. **Configurez le démarrage automatique:**
   ```
   pm2 startup
   pm2 save
   ```

## Étape 6: Configuration du Serveur Web

1. **Configurez Nginx** (si disponible sur votre hébergement LWS):
   ```
   sudo nano /etc/nginx/sites-available/coworking-app
   ```

2. **Ajoutez cette configuration:**
   ```
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

3. **Activez la configuration:**
   ```
   sudo ln -s /etc/nginx/sites-available/coworking-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Étape 7: Vérification

1. **Visitez votre site** à l'adresse `http://votre-domaine.com`
2. **Vérifiez que tout fonctionne correctement**:
   - Connexion (login)
   - Saisie des transactions
   - Locations de salles
   - Affichage des statistiques

## Comment Mettre à Jour Votre Application

```
cd ~/www/coworking-app
pm2 stop coworking-app
# Transférez vos nouveaux fichiers
npm install --production
npm run db:push  # Si nécessaire
pm2 restart coworking-app
```

## Besoin d'Aide?

Si vous rencontrez des difficultés, contactez le support technique de LWS ou consultez leur documentation.