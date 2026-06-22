# Anniversaires VHD-BOUAKE

Petite app Next.js pour enregistrer les membres de VHD-BOUAKE et preparer un rappel WhatsApp la veille d'un anniversaire.

## Lancer l'app

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Fonctionnement actuel

- Ajout d'un membre avec nom, date d'anniversaire, telephone et note.
- Page publique `/inscription` pour que chaque membre s'inscrive depuis son telephone.
- Sauvegarde locale dans `data/members.json` si Supabase n'est pas configure.
- Sauvegarde en ligne dans Supabase quand les variables d'environnement sont ajoutees.
- Liste triee par prochain anniversaire.
- Message de rappel pret a copier ou ouvrir dans WhatsApp.

## Partage sur telephone

En local, les telephones doivent etre sur le meme Wi-Fi que l'ordinateur qui lance l'app.

Ne partage pas `http://localhost:3000/inscription` avec les membres. Sur un telephone, `localhost` veut dire "ce telephone", pas ton ordinateur.

Il faut partager l'adresse reseau de l'ordinateur, par exemple `http://192.168.1.20:3000/inscription`.

Pour trouver cette adresse sur Windows :

```powershell
ipconfig
```

Cherche `Adresse IPv4`, puis remplace `localhost` par cette adresse.

En ligne, il faut heberger l'app et utiliser Supabase pour que les inscriptions soient visibles partout.

## Hebergement en ligne avec Vercel et Supabase

### 1. Creer la base Supabase

1. Cree un compte sur Supabase.
2. Cree un nouveau projet.
3. Ouvre `SQL Editor`.
4. Copie le contenu de `supabase.sql`.
5. Lance le script.

### 2. Recuperer les cles Supabase

Dans Supabase :

1. Va dans `Project Settings`.
2. Va dans `API`.
3. Copie `Project URL`.
4. Copie la cle `service_role`.

Important : la cle `service_role` doit rester secrete. Ne la partage pas dans WhatsApp et ne l'affiche pas dans une page.

### 3. Configurer les variables

Pour tester en local, cree un fichier `.env.local` :

```env
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ta_cle_service_role
```

Pour Vercel :

1. Ouvre ton projet Vercel.
2. Va dans `Settings`.
3. Va dans `Environment Variables`.
4. Ajoute `SUPABASE_URL`.
5. Ajoute `SUPABASE_SERVICE_ROLE_KEY`.

### 4. Deployer sur Vercel

1. Mets ce dossier sur GitHub.
2. Dans Vercel, clique sur `Add New Project`.
3. Importe le projet GitHub.
4. Verifie que les variables Supabase sont bien ajoutees.
5. Clique sur `Deploy`.

Le lien final ressemblera a :

```text
https://ton-app.vercel.app
```

Le lien a envoyer aux membres sera :

```text
https://ton-app.vercel.app/inscription
```

## Etape suivante

Pour recevoir des rappels meme quand l'ordinateur est ferme, il faudra ajouter un systeme de notifications planifiees.
