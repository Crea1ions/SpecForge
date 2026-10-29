# ADR — Template e-commerce (profil Rust)

**Version :** 1.0
**Statut :** décisions acceptées et implémentées
**Références :** [CARTOGRAPHIE.md](CARTOGRAPHIE.md), fiches [ECOM-01..20](fiches/), [SCHEMA-DONNEES.md](SCHEMA-DONNEES.md), [ARCHITECTURE-CORE-BRICKS-TEMPLATES.md](../ARCHITECTURE-CORE-BRICKS-TEMPLATES.md)

---

## 1. Contexte et objectif

SpecForge génère six templates (`web-frontend`, `web-app`, `web-platform`, `api-service`, `desktop`, `mobile`). Le profil Rust dispose déjà de `rust-react-postgres` (template `web-platform`) : Axum + React/Vite + PostgreSQL/SQLx + Docker Compose, base technique complète et auditée.

L'e-commerce est une **variante spécialisée de `web-platform`** : même socle technique, augmenté d'un domaine métier boutique (catalogue, prix, panier, commandes, paiement, stocks, comptes). Le référentiel métier est stabilisé (20 fiches ECOM) ; le schéma Odoo (47 modèles / 78 tables) sert de **référence conceptuelle uniquement** et n'est pas portable tel quel (voir §7).

Objectif : générer un projet e-commerce cohérent et déterministe couvrant le parcours catalogue → panier → commande payée → expédition → retour/remboursement, sans régresser les templates existants.

---

## ADR-01 — Mécanisme de variante

### Contexte

Trois options pour introduire l'e-commerce :

1. Option de spécification (`spec.options.ecommerce = true`) sur `web-platform` ;
2. Surcharge de `web-platform` (briques ecom ajoutées au même template) ;
3. Nouvelle valeur de template + preset dédié.

### Décision

**Option 3.** Ajout de `'ecommerce'` à l'union `ApplicationTemplate` (`src/core/types.ts`) et création du preset `rust-ecommerce` (profil `rust`, template `ecommerce`) dans `src/engine/presets.ts`.

Justifications :

- **Sélection explicite au wizard** : l'utilisateur choisit un type d'application e-commerce, pas une case à cocher technique ;
- **Disponibilité dérivée de `findPreset(profile, template)`** : le mécanisme existant de « templates indisponibles » s'applique sans code supplémentaire (un profil sans preset e-commerce affiche le template comme indisponible) ;
- **Isolation des fichiers générés** : les briques `ecom-*` ne sont activées que par la branche `ecommerce` du resolver ;
- **Aucun impact sur les presets existants** : `rust-react-postgres` et le golden de `web-platform` sont inchangés.

Les options 1 et 2 rendraient la sélection implicite, coupleraient les fichiers générés de `web-platform` à un domaine métier et menaceraient la règle « 0 DIFF golden ».

### Conséquences

- `src/core/types.ts` : ajout de `'ecommerce'` à `ApplicationTemplate` ;
- `src/core/resolver.ts` : branche dédiée `spec.template === 'ecommerce'` (composition de base identique à `web-platform` + briques `ecom-*`, cf. ADR-05) ;
- `src/engine/presets.ts` : preset `rust-ecommerce`, dérivé de `rust-react-postgres` ;
- Wizard : carte/bouton « E-commerce » dans le sélecteur de templates ;
- Golden : nouveau référentiel pour `rust-ecommerce`, 0 DIFF exigé sur les presets existants ;
- Les autres profils (Python, futurs) pourront déclarer leur propre preset `ecommerce` sans modifier le Core.

---

## ADR-02 — Périmètre v1

### Contexte

Le référentiel compte 20 fiches. Tout couvrir en une itération violerait le principe « étapes courtes et vérifiables » (ROADMAP §1).

### Décision

**Inclus en v1** (16 fiches) : ECOM-01 catalogue, 02 catégories/navigation, 03 prix/taxes, 04 promotions, 05 panier, 06 commandes, 07 paiements, 08 livraison, 09 stocks, 10 comptes clients, 11 retours/remboursements, 12 administration, 14 notifications, 16 sécurité/permissions, 19 journalisation, 20 exploitation technique.

**Reporté en v2** (4 fiches) :

| Fiche | Motif du report |
|---|---|
| ECOM-13 pages/contenu | CMS non nécessaire au parcours d'achat |
| ECOM-15 statistiques | dépend d'un historique d'exploitation |
| ECOM-17 documents | génération PDF factures/bons, indépendante du cœur |
| ECOM-18 intégrations externes réelles | v1 utilise des contrats internes + mocks (cf. ADR-03) |

**Clause de scission v1a/v1b** : si la capacité est dépassée, la v1 se scinde — v1a = parcours d'achat de bout en bout (ECOM-01..07, 09, 10), v1b = solde (ECOM-08, 11, 12, 14, 16, 19, 20). Toute scission exige une **décision explicite** consignée ici ; pas de glissement silencieux de périmètre.

### Conséquences

- Les migrations, briques et routes générées en v1 ne couvrent que les fiches incluses ;
- Les fiches v2 ne doivent pas apparaître, même partiellement, dans la sortie générée ;
- La clause de scission borne la v1 sans remettre en cause les ADR-03 à 05.

---

## ADR-03 — Paiement v1

### Contexte

ECOM-07 définit un prestataire de paiement comme module interchangeable derrière un contrat commun. Intégrer un PSP réel (Stripe, Adyen…) en v1 introduirait secrets, réseau et non-déterminisme.

### Décision

v1 définit le **contrat de fournisseur** :

```text
PaymentProvider
  authorize(order, amount, currency) -> Authorization
  capture(authorization)            -> Capture
  refund(capture, amount)           -> Refund
```

et fournit un **fournisseur mock déterministe** : scénarios configurables de succès, échec ou attente pour l'autorisation ; capture et remboursement sont des opérations locales distinctes et bornées, sans appel réseau. Aucun PSP réel en v1 (ECOM-18).

### Conséquences

- Le parcours de bout en bout (panier → autorisation → capture → commande confirmée) est **testable de façon reproductible**, y compris dans les goldens et la CI ; le backend appelle le contrat `PaymentProvider` et le `MockPaymentProvider` généré ;
- Les états de commande (ECOM-06) et les remboursements (ECOM-11) s'exercent sans dépendance externe ;
- Un PSP réel en v2 implémente le même contrat sans toucher au cœur.

---

## ADR-04 — Conventions de données

### Contexte

Les fiches ECOM-03/05/06 exigent une fiabilité comptable (prix figés, taxes ventilées) ; le schéma Odoo montre des conventions héritées (floats monétaires, `company_id` partout, JSON par langue) qu'il faut arbitrer pour un schéma PostgreSQL/SQLx neuf.

### Décision

1. **Montants** : entiers en **unités monétaires mineures** (`BIGINT`) + **code devise ISO 4217** (`CHAR(3)`) sur chaque ligne monétaire. Jamais de float ni de `NUMERIC` non contraint.
2. **Immuabilité comptable** : prix unitaire, remise hors taxe, taux et ventilation fiscale sont **figés sur les lignes de commande** à la validation ; toute évolution ultérieure du catalogue ou des taxes ne modifie pas une commande existante. Les totaux reflètent la base et la taxe après remise ; `discount_total` conserve le montant brut de la remise accordée.
3. **Champs traduits** : `JSONB` indexé par locale (`{"fr": "...", "en": "..."}`), sans table de traduction séparée en v1.
4. **Boutique unique** : pas de multi-société ; aucune colonne `company_id` en v1.
5. **Horodatages** : `TIMESTAMPTZ` en UTC partout ; aucune heure locale stockée.
6. **Identifiants** : **`BIGSERIAL`** pour les clés primaires. Justification : support natif SQLx sans extension, migrations simples, jointures efficaces, cohérence avec les briques `postgres-storage` existantes. Les références exposées publiquement (numéros de commande) sont des chaînes opaques distinctes de la clé primaire. L'option UUID (`gen_random_uuid()`) est écartée en v1 — coût de génération et d'indexation non justifié à cette échelle — sans fermer la porte à une migration v2.

### Conséquences

- Le schéma v1 est volontairement plus simple que le schéma Odoo de référence ;
- La conversion devise/affichage est un rendu côté application, jamais un stockage en virgule flottante ;
- Toute brique `ecom-*` générant du SQL suit ces conventions (vérifiées à la relecture du schéma).

---

## ADR-05 — Briques de domaine

### Contexte

Le Core interdit la composition générique (ARCHITECTURE §5 : « une brique génère ce dont elle est propriétaire ») et l'explosion d'une composition universelle (§12). Les briques métier doivent donc être **peu nombreuses, autonomes et propriétaires de leurs fichiers** (migrations, routes, handlers, vues admin).

### Décision

Neuf briques de domaine, préfixées `ecom-` :

| Brique | Fiches couvertes | `provides` | `requires` | Justification |
|---|---|---|---|---|
| `ecom-catalog` | 01, 02 | `product_catalog`, `category_navigation` | `postgres-storage`, `rest-api` | socle référentiel produits ; aucune autre brique ne gère le catalogue |
| `ecom-pricing` | 03, 04 | `pricing_engine`, `tax_computation`, `promotions` | `ecom-catalog` | règles de calcul pures et testables, séparées du stockage catalogue |
| `ecom-cart-orders` | 05, 06, 08 | `cart_management`, `order_lifecycle`, `shipping_methods` | `ecom-catalog`, `ecom-pricing`, `ecom-accounts` | machine à états panier → commande, cœur transactionnel du template |
| `ecom-accounts` | 10, 16 (partie client) | `customer_accounts`, `customer_addresses` | `jwt-auth`, `postgres-storage` | identité client et adresses, réutilise l'authentification existante |
| `ecom-payment-mock` | 07 | `payment_provider_contract`, `mock_payment_provider` | `ecom-cart-orders` | contrat `PaymentProvider` + mock déterministe (ADR-03) |
| `ecom-inventory-fulfillment` | 09, 11 | `inventory_tracking`, `fulfillment`, `returns_refunds` | `ecom-cart-orders` | quantités (stock/réservé/disponible) et cycle expédition/retour |
| `ecom-notifications` | 14 | `transactional_notifications` | `ecom-accounts` | notifications événementielles (commande, expédition) via contrat interne, sans transport externe en v1 |
| `ecom-audit-ops` | 19, 20 | `audit_log`, `application_scheduled_tasks` | `postgres-storage` | journal d'événements et tâche applicative bornée de relance des paniers ; fréquence et activation viennent des paramètres `settings`, aucun registre générique de jobs |
| `ecom-admin` | 12, 16 (partie back-office) | `admin_backoffice` | `jwt-auth`, `rest-api`, `ecom-catalog`, `ecom-cart-orders`, `ecom-inventory-fulfillment` | interface d'administration des entités v1 |

### Conséquences

- La branche `ecommerce` du resolver active la composition de base `web-platform` (`rust-backend`, `react-vite`, `postgres-storage`, `rest-api`, `jwt-auth`, `docker-infra`, `quality-suite`, `docs-pack`) **puis** ces neuf briques ;
- Toute fiche v2 (13, 15, 17, 18) donnera lieu à une brique nouvelle ou à une extension explicite d'une brique existante, décidée par ADR ;
- Aucune brique `ecom-*` ne doit contribuer de fragment à un fichier détenu par une autre brique.

---

## ADR-06 — Frontière de génération et exploitation

### Décision

SpecForge génère les fichiers du projet, notamment les migrations PostgreSQL versionnées et la configuration optionnelle Docker Compose. Il ne crée pas de base de données sur la machine de développement, ne démarre pas de service PostgreSQL ou Docker et n’exécute pas le projet généré. L’application générée applique ses migrations SQLx au démarrage, uniquement après que son opérateur a configuré et démarré les services nécessaires.

### Conséquences

- La vérification du générateur porte sur la présence, la cohérence statique et la reproductibilité des migrations ;
- L’application réelle de ces migrations et le parcours avec une base PostgreSQL sont des validations du projet généré, séparées de la génération SpecForge ;
- Les tâches planifiées ne démarrent que dans l’application générée, après l’initialisation de PostgreSQL ; elles ne sont jamais exécutées par SpecForge ;
- Docker Compose est un livrable optionnel du projet généré, jamais une action implicite de SpecForge.

---

## 7. Règles de non-régression

1. **Sorties déterministes** : même spécification ⇒ mêmes fichiers, même hash ; le mock de paiement et les seeds ne introduisent aucun aléa.
2. **0 DIFF sur les sorties des presets existants** (`scripts/check-golden.ts`) ; le hash structurel `_brick-order` est actualisé pour les nouvelles briques et le référentiel `rust-ecommerce` est ajouté.
3. **Core sans logique UI** : le wizard propose une intention ; la sélection des briques reste dans le resolver (ARCHITECTURE §12).
4. **Pas de registry de templates** : la disponibilité découle de `findPreset(profile, template)` ; aucune table ou registre parallèle.
5. **Schéma Odoo non portable** : `SCHEMA-DONNEES.md` est une référence conceptuelle (Odoo Community LGPL-3) ; les tables, colonnes et contraintes v1 sont redessinées selon l'ADR-04, sans copie de structure ni de code Odoo.
