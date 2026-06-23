# Anniversaires VHD-BOUAKE

Petite app Next.js pour enregistrer les anniversaires des membres de VHD-BOUAKE, preparer le message WhatsApp de rappel et envoyer un rappel email automatique la veille.

## Lancer l'app en local

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Fonctionnement

- Page publique `/inscription` pour que chaque membre s'inscrive depuis son telephone.
- Sauvegarde en ligne dans Supabase quand `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont configures.
- Liste triee par prochain anniversaire.
- Export CSV de la liste des membres, ouvrable dans Excel.
- Message WhatsApp pret a copier.
- Rappel email automatique la veille via `/api/reminders`.
- Boutons Appeler et WhatsApp pour le call center.
- Statuts de suivi : `A rappeler`, `Appele`, `Inscrit confirme`.

## Mise a jour Supabase pour le call center

Si la table `members` existe deja, lancer cette requete une seule fois dans Supabase SQL Editor :

```sql
alter table public.members
add column if not exists call_status text not null default 'a_rappeler';
```

## Variables Vercel

Dans Vercel, ajouter ces variables dans `Settings > Environment Variables` :

```env
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ta_cle_service_role
RESEND_API_KEY=ta_cle_resend
REMINDER_EMAIL_TO=email_du_responsable@example.com
REMINDER_EMAIL_FROM=VHD-BOUAKE <onboarding@resend.dev>
```

`REMINDER_EMAIL_FROM` peut rester avec `onboarding@resend.dev` pour commencer. Pour un envoi plus professionnel, il faudra verifier un domaine dans Resend.

## Cron Vercel

Le fichier `vercel.json` planifie le rappel :

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "0 15 * * *"
    }
  ]
}
```

Vercel appellera `/api/reminders` tous les jours a 15h UTC, ce qui correspond a 15h a Bouake. Si un anniversaire est prevu le lendemain, un email sera envoye au responsable.

## Tester le rappel

Apres redeploiement et ajout des variables Resend dans Vercel :

```text
https://vhd-bke-anniv.vercel.app/api/reminders
```

Si aucun anniversaire n'est prevu demain, la route repondra `Aucun anniversaire demain`.
