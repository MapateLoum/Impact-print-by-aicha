# Impact print by Aicha

Boutique Next.js avec Supabase pour le catalogue, les commandes, les stocks et les médias.

## Développement local

```bash
npm install
npm run dev
```

Le site est servi sur [http://localhost:3000](http://localhost:3000).

## Configuration Supabase

Les variables locales sont dans `.env.local` (ignoré par Git). Le modèle partageable est `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_SITE_URL=https://<public-site-domain>
```

La clé `publishable` est destinée à l’application cliente; ne placez jamais une clé `secret` ou `service_role` dans une variable `NEXT_PUBLIC_*`.
`NEXT_PUBLIC_SITE_URL` doit être l’adresse HTTPS publique du site. Elle sert aux liens de fiches produit envoyés sur WhatsApp et aux aperçus contenant la photo du produit. En local, WhatsApp ne peut pas accéder à `localhost`.

### Créer le schéma

Dans le tableau de bord Supabase, ouvrez **SQL Editor**, créez une requête, copiez le contenu de `supabase/migrations/20261125120000_initial_store.sql`, puis exécutez-la une seule fois.

La migration crée les tables, les index, les politiques RLS, les buckets Storage `product-images` et `store-media`, ainsi que les fonctions transactionnelles de commande et de suivi. Elle initialise les coordonnées de boutique fournies.

### Catalogue public

L’accueil, la liste des produits et les fiches produit lisent directement Supabase avec la clé publishable. Seules les catégories actives et les fiches publiées dans une catégorie active sont visibles. La migration ne crée aucun produit ni catégorie : en attendant l’interface d’administration, ajoutez-les depuis **Table Editor**. Pour afficher une photo, téléversez-la dans `product-images`, puis ajoutez une ligne correspondante dans `product_images` avec son chemin Storage.

Les pages panier et commande ne créent pas encore de commande en base. Pour l’instant, le client peut contacter la boutique sur WhatsApp depuis une fiche produit.

### Administration du catalogue

Après la migration initiale, exécutez aussi `supabase/migrations/20261125122000_admin_catalog_functions.sql` dans le **SQL Editor**. Elle ajoute les fonctions sécurisées de création de produits et d’ajustement du stock avec journalisation des mouvements.

Ouvrez ensuite `/admin` et connectez-vous avec le compte créé dans Supabase Auth et promu administrateur ci-dessous. L’interface permet de créer/activer les catégories, créer et modifier les produits, téléverser leurs photos, gérer leur publication et ajuster le stock. Les opérations utilisent la session de l’administrateur et les politiques RLS; aucune clé `service_role` n’est utilisée.

### Créer le premier administrateur

1. Créez l’utilisateur dans **Authentication → Users**.
2. Dans le **SQL Editor**, remplacez l’adresse ci-dessous par celle du compte créé et exécutez :

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'votre-email-administrateur'
);
```

Les nouveaux comptes reçoivent le rôle `customer` par défaut. Ne modifiez le rôle que pour le compte propriétaire.
