# Modèle de domaine v1 — Template e-commerce (Rust)

**Version :** 1.0
**Statut :** modèle accepté et généré par le preset ; l’application réelle des migrations sur PostgreSQL reste une validation d’exploitation distincte
**Références :** fiches ECOM-01..20 (fiches/), ADR-TEMPLATE-ECOMMERCE.md (ADR-01..06), SCHEMA-DONNEES.md (référence conceptuelle uniquement), CARTOGRAPHIE.md

## 1. Conventions appliquées (rappel ADR-04, non négociables)

- Montants en **unités monétaires mineures** (BIGINT) + code devise ISO 4217 (CHAR(3)) sur chaque ligne monétaire ; jamais de float ni de NUMERIC non contraint.
- Prix, taxes et ventilation fiscale **figés sur les lignes de commande** à la création de la commande (ECOM-06 D5).
- Champs traduits en **JSONB** indexé par locale (ex. {"fr": "...", "en": "..."}), sans table de traduction.
- **Boutique unique** : aucune colonne company_id.
- **BIGSERIAL** en clé primaire ; TIMESTAMPTZ UTC partout ; références publiques opaques (numéro de commande) distinctes de la clé primaire.
- Paiement : contrat PaymentProvider + mock déterministe (ADR-03) ; statuts de paiement explicites.
- Taux (taxes, remises en pourcentage) stockés en **points de base** (INTEGER ; 2000 = 20,00 %) pour rester en entiers.

## 2. Matrice de couverture (fiches v1)

| Fiche | Entités v1 | Règles métier retenues | Tables prévues | Écarté (Odoo) et pourquoi |
|---|---|---|---|---|
| ECOM-01 Catalogue | Product, ProductImage | SKU unique obligatoire ; publiable = nom + SKU + prix + au moins une image ; statuts indépendants actif / vendable / publié ; archivage sans effet sur les commandes passées ; ordre d’affichage | products, product_images | Double couche template/variante (D1 : un produit = un SKU), combos, prix à l’unité, publication multi-site, flux comparateurs — complexité hors socle |
| ECOM-02 Catégories | Category, ProductCategory | Arbre sans cycle ; plusieurs catégories par produit dont une principale ; suppression refusée si non vide (écart assumé avec le cascade Odoo) ; visibilité dérivée des produits visibles | categories, product_categories | Catégorie interne comptable, tags, filtres par attributs, autocomplétion |
| ECOM-03 Prix et taxes | TaxRate (+ colonnes de prix) | Prix unique par produit (D1) ; une taxe par produit ; mode HT/TTC réglé au niveau boutique ; prix affiché = source du filtre et du tri ; gel à la commande | tax_rates (+ products.price_catalog, order_lines) | Listes de prix et règles (standard complémentaire), positions fiscales, multi-taxes, multi-devise, taxes en cascade |
| ECOM-04 Promotions | Promotion | Promotion automatique ou code ; remise globale en pourcentage ou montant, plafonnable ; une seule remise globale par commande (pas de cumul) ; dates de validité, limite d’usage ; application et recalcul à la validation du panier | promotions (+ orders.promotion_id, orders.promotion_code, orders.discount_total, order_lines.discount_excl_tax) | Modèle programme/règle/récompense/carte (4 tables) fusionné en une ; fidélité, cartes cadeaux, produit offert |
| ECOM-05 Panier | Cart, CartLine | Panier distinct de la commande (D1) ; recalcul à chaque modification, gel à la commande (D2) ; une ligne par produit, quantité cumulée (D3) ; rattachement du panier à la connexion (D4) ; paiement engagé => le panier n’est plus courant (D5) ; quantité nulle ou négative supprime la ligne | carts, cart_lines | Objet unique brouillon/commande ; liste de prix et position fiscale portées par le panier |
| ECOM-06 Commandes | Order, OrderLine | Validation et paiement dans une transaction ; paiement mock refusé => panier conservé et aucune commande confirmée ; confirmation après capture mock ; gel prix/taxes/frais/remises (D5) ; statuts séparés commande / paiement / expédition (D6) ; commande de montant nul confirmée sans transaction de paiement (D8) ; référence opaque | orders, order_lines | Verrouillage (option avancée), paiement groupé, étapes de checkout configurables |
| ECOM-07 Paiements | PaymentProvider, PaymentTransaction | Contrat interchangeable + mock (ADR-03) ; transaction distincte de la commande (D4) ; cycle à 6 états (D5) ; remboursements = transactions enfants (D6) ; appels de paiement/refund synchrones et locaux ; aucun callback PSP | payment_providers, payment_transactions | Table des moyens de paiement (v1 : un moyen par prestataire mock), jetons de paiement, capture manuelle, paiement express |
| ECOM-08 Livraison | ShippingMethod, ShippingPriceRule, Shipment | Prix fixe ou règles (D2/D8) ; frais = ligne de commande taxée et figée (D3) ; statut d’expédition distinct (D5) ; disponibilité selon adresse et poids (D6) ; lien de suivi | shipping_methods, shipping_price_rules, shipments | Transporteurs externes réels (contrat seul défini), points relais, retrait magasin, colis, marges, étiquettes |
| ECOM-09 Stocks | StockLevel, StockMove | En stock / réservé / disponible = en stock moins réservé (D1) ; suivi par produit, non suivi toujours disponible (D2) ; le panier plafonne, réservation à la confirmation (D4) ; recontrôle à l’engagement du paiement (D5) ; expédition consomme réservation et stock physique ; retour reçu peut réintégrer le stock ; chaque variation = mouvement tracé (D8) | stock_levels, stock_moves | Multi-entrepôts, quants (lot/emplacement/colis), prévisionnel, inventaire valorisé |
| ECOM-10 Comptes clients | Customer, CustomerAddress | Compte **obligatoire** à l’achat en v1 (mode mandatory, §5-D5) ; carnet d’adresses typées facturation / livraison (D5) ; adresse de commande = copie figée (D6) ; désactivation avec conservation des commandes (D8) ; historique incluant les annulées (D9) | customers, customer_addresses | B2B (hiérarchie de contacts), achat invité, liste de souhaits, boutique réservée aux connectés |
| ECOM-11 Retours | ReturnRequest, ReturnLine (+ transaction enfant, mouvement de stock) | Trois objets liés à statuts indépendants (D1) ; remboursement décidé après réception (D2) ; retour plafonné à livré moins déjà retourné (D3) ; remboursement plafonné à payé moins déjà remboursé (D4) ; seule une transaction aboutie se rembourse (D5) ; remise en stock seulement après décision admin (D11) ; jamais de nouvelle réservation (D12) | return_requests, return_lines | Assistants sans objet commun ; échanges, étiquettes de retour, avoir comptable (v2 ECOM-17) |
| ECOM-12 Administration | AdminUser, Setting | Trois rôles : gestionnaire / opérateur / éditeur (D1) ; gestion minimale du catalogue et du stock, suivi des commandes et traitement des retours ; droits vérifiés côté serveur | admin_users, settings (+ carts.recovery_email_sent) | Relance automatique et actions de masse ; paramètres avancés |
| ECOM-14 Notifications | NotificationTemplate, Notification | Événement + modèle + destinataire + canal courriel (D1) ; intentions en attente tracées pour création de compte, commande confirmée, expédition et retour clôturé ; aucun transport externe en v1 | notification_templates, notifications | Envoi effectif, SMS et autres canaux, facture automatique, relance automatique |
| ECOM-16 Sécurité | (transverse) rôle sur admin_users, jeton sur orders | Quatre catégories d’acteurs (D1) ; le client ne lit que ses objets (D3) ; jeton d’accès opaque comparé en temps constant (D4) ; droits vérifiés côté serveur (D10) | colonnes admin_users.role, orders.access_token | Tables génériques de droits et règles de périmètre : matrice figée en v1 (3 rôles fixes), double authentification et clés en option |
| ECOM-19 Journalisation | AuditLog (+ stock_moves) | Transitions d’état, montants et décisions tracés avec auteur et date (D1/D3) ; journaux métier distincts des techniques (D2) ; traces sans données personnelles (D6) ; survie à la suppression de l’utilisateur (D10) | audit_logs | Fil de discussion générique, journal SQL hors ORM |
| ECOM-20 Exploitation | Setting + tâche applicative | Relance des paniers clients abandonnés activée par défaut ; fréquence configurable (60 minutes par défaut), délai configurable (10 heures), lot borné à 100 ; l'application journalise les échecs et ne démarre le worker qu'après l'initialisation PostgreSQL | settings (clés d'exploitation) ; notifications en attente | Planificateur et historique génériques de jobs ; envoi effectif des notifications, qui reste hors v1 |

**Total : 26 tables**, chacune rattachée à au moins une fiche (voir §3 et §4).

## 3. Catalogue des entités v1

Convention : clé primaire id BIGSERIAL et created_at / updated_at TIMESTAMPTZ sur toutes les tables, sauf mention contraire.

### 3.1 Catalogue (brique ecom-catalog)

**products** — Unité vendable (un produit = un SKU, ECOM-01 D1).
| Colonne | Type | Règle |
|---|---|---|
| sku | TEXT UNIQUE NOT NULL | obligatoire, unique (D2) |
| barcode | TEXT UNIQUE NULL | unique si présent |
| name | JSONB NOT NULL | traduit, par locale |
| description_short / description_long | JSONB NULL | traduit |
| price_catalog | BIGINT NOT NULL CHECK (>= 0) | unités mineures (D4) |
| compare_price | BIGINT NULL | prix barré, > price_catalog si présent |
| tax_rate_id | BIGINT NOT NULL FK tax_rates | une taxe par produit (ECOM-03 D3) |
| weight_grams / volume_cm3 | INTEGER NULL | requis si livraison au poids |
| is_active / is_sellable / is_published | BOOLEAN NOT NULL | trois indicateurs indépendants |
| published_at | TIMESTAMPTZ NULL | posée à chaque (re)publication (tri nouveautés) |
| display_order | INTEGER NOT NULL DEFAULT 0 | tri par défaut de la boutique |
| stock_tracked | BOOLEAN NOT NULL DEFAULT false | suivi de stock par produit (ECOM-09 D2) |
| allow_out_of_stock | BOOLEAN NOT NULL DEFAULT false | vente hors stock interdite par défaut si suivi (ECOM-09 D6) |
| out_of_stock_message | JSONB NULL | traduit |

Règles clés : visible = actif ET vendable ET publié (dérivé, non stocké) ; publiable exige nom + SKU + prix + au moins une image ; archivage = is_active false, les commandes passées restent lisibles ; une duplication produit un brouillon non publié.

**product_images** — Images du produit.
| Colonne | Type | Règle |
|---|---|---|
| product_id | BIGINT NOT NULL FK products | CASCADE |
| url | TEXT NOT NULL | chemin ou URL du média |
| alt | JSONB NULL | traduit |
| position | INTEGER NOT NULL DEFAULT 0 | galerie ordonnée |
| is_primary | BOOLEAN NOT NULL DEFAULT false | exactement une principale par produit publié |

**categories** — Arbre de navigation (ECOM-02).
| Colonne | Type | Règle |
|---|---|---|
| parent_id | BIGINT NULL FK categories | RESTRICT (suppression refusée si non vide, D5) ; NULL = racine |
| name | JSONB NOT NULL | traduit |
| slug | TEXT UNIQUE NOT NULL | URL canonique |
| path | TEXT NOT NULL | chemin matérialisé (ex. /3/12/45/) pour les requêtes de sous-arbre |
| position | INTEGER NOT NULL DEFAULT 0 | ordre entre sœurs |

Règles : aucun cycle (contrôle applicatif + CHECK parent_id <> id) ; visibilité dérivée : la catégorie ou un descendant contient un produit visible.

**product_categories** — Rattachement plusieurs-à-plusieurs.
| Colonne | Type | Règle |
|---|---|---|
| product_id | BIGINT NOT NULL FK products | CASCADE ; PK composée (product_id, category_id) |
| category_id | BIGINT NOT NULL FK categories | RESTRICT (une catégorie contenant des produits ne se supprime pas) |
| is_primary | BOOLEAN NOT NULL DEFAULT false | exactement une principale par produit rattaché (D2) |

### 3.2 Prix et taxes (brique ecom-pricing)

**tax_rates** — Taux de TVA.
| Colonne | Type | Règle |
|---|---|---|
| name | TEXT NOT NULL | ex. TVA 20 % |
| rate_bp | INTEGER NOT NULL CHECK (>= 0) | points de base (2000 = 20,00 %) |
| is_active | BOOLEAN NOT NULL DEFAULT true | |

Règles : le mode HT/TTC est un réglage boutique (settings), pas une donnée de taxe ; le calcul garde le HT et la taxe ; le prix affiché est la source unique du filtre et du tri (ECOM-03 D4).

**promotions** — Promotion automatique ou code de réduction (ECOM-04, modèle fusionné, §5-D3).
| Colonne | Type | Règle |
|---|---|---|
| code | TEXT UNIQUE NULL | NULL = déclenchement automatique ; renseigné = saisie d’un code |
| name | TEXT NOT NULL | |
| discount_kind | TEXT NOT NULL | percent ou fixed_amount |
| discount_bp | INTEGER NULL | si percent |
| discount_amount / currency | BIGINT NULL / CHAR(3) NULL | si fixed_amount |
| max_discount_amount | BIGINT NULL | plafond de remise (D5) |
| min_order_amount | BIGINT NULL | condition de montant |
| min_quantity | INTEGER NULL | condition de quantité |
| starts_at / ends_at | TIMESTAMPTZ NULL | début strictement avant fin |
| usage_limit / used_count | INTEGER NULL / INTEGER NOT NULL DEFAULT 0 | limite d’usage (D10) |
| is_active | BOOLEAN NOT NULL DEFAULT true | désactivation sans suppression (D8) |

Règles : une seule remise globale par commande ; application à la validation du panier ; le premier code automatique admissible par identifiant est choisi si aucun code n’est fourni ; un code saisi inconnu, expiré, épuisé ou non admissible est refusé ; l’application et l’incrément d’usage sont sérialisés par verrou de ligne.

### 3.3 Panier et commandes (brique ecom-cart-orders)

**carts** — Sélection ouverte (ECOM-05).
| Colonne | Type | Règle |
|---|---|---|
| customer_id | BIGINT NULL FK customers | SET NULL ; NULL = visiteur anonyme avant connexion |
| session_token | TEXT NULL | identifiant de session du visiteur anonyme |
| status | TEXT NOT NULL DEFAULT open | open, converted, abandoned (marqueur de relance) |
| currency | CHAR(3) NOT NULL | devise de la boutique, copiée à la création |
| shipping_method_id | BIGINT NULL FK shipping_methods | mode choisi, recalculé à chaque modification |
| recovery_email_sent | BOOLEAN NOT NULL DEFAULT false | une seule relance (ECOM-12 D6) |

Règles : un seul panier courant par client et boutique ; paiement engagé => le panier n’est plus courant ; panier abandonné = ouvert, identifié, non vide, plus ancien que le délai (dérivé, non stocké) ; à la connexion, le panier anonyme est rattaché au compte puis prix recalculés.

**cart_lines** — Lignes du panier.
| Colonne | Type | Règle |
|---|---|---|
| cart_id | BIGINT NOT NULL FK carts | CASCADE |
| product_id | BIGINT NOT NULL FK products | RESTRICT |
| quantity | INTEGER NOT NULL CHECK (> 0) | quantité nulle ou négative supprime la ligne |
| unit_price | BIGINT NOT NULL | cache recalculé à chaque modification (source : prix catalogue) |
| tax_rate_bp | INTEGER NOT NULL | cache du taux pour affichage du total |

Règles : une ligne par produit, ajout = cumul ; plafonnement au stock disponible avec avertissement si produit suivi et vente hors stock interdite.

**orders** — Engagement du client (ECOM-06).
| Colonne | Type | Règle |
|---|---|---|
| order_number | TEXT UNIQUE NOT NULL | référence opaque publique \`SF-\` suivie de 128 bits aléatoires |
| customer_id | BIGINT NOT NULL FK customers | RESTRICT ; compte obligatoire en v1 (§5-D5) |
| status | TEXT NOT NULL | machine d’état ci-dessous |
| payment_status | TEXT NOT NULL DEFAULT pending | pending, authorized, paid, partially_refunded, refunded (explicite, ECOM-06 D6) |
| currency | CHAR(3) NOT NULL | |
| subtotal_excl_tax / tax_total / shipping_total / discount_total / total | BIGINT NOT NULL | totaux figés ; sous-total et taxe après remise, remise brute informative ; total = sous-total + taxe + livraison |
| billing_address / shipping_address | JSONB NOT NULL | copie figée des adresses (ECOM-10 D6, §5-D6) |
| shipping_method_id / shipping_method_name | BIGINT NULL FK / TEXT NULL | méthode choisie + libellé figé |
| promotion_id / promotion_code | BIGINT NULL FK promotions / TEXT NULL | remise appliquée + code figé |
| access_token | TEXT UNIQUE NOT NULL | jeton opaque UUID, comparaison en temps constant (ECOM-16 D4) |
| placed_at / confirmed_at / cancelled_at | TIMESTAMPTZ NULL | jalons du cycle de vie |

Machine d’état de commande (status) :

    pending_payment --(capture mock réussie, montant atteint)--> confirmed
    paiement mock refusé --(transaction rollback)--> panier ouvert conservé, aucune commande persistée
    confirmed --(expédition)--> shipped --(remise)--> delivered
    pending_payment ou confirmed --(annulation avant expédition)--> cancelled

Invariants : confirmation uniquement depuis pending_payment ; un paiement ne confirme que sa commande ; montant nul => confirmation immédiate sans paiement (D8) ; annulation libère les réservations et impose remboursement ou annulation d’autorisation si déjà payée (ECOM-11 D13) ; toute transition tracée (audit_logs).

**order_lines** — Lignes figées de la commande.
| Colonne | Type | Règle |
|---|---|---|
| order_id | BIGINT NOT NULL FK orders | CASCADE (ligne de l’agrégat) |
| product_id | BIGINT NULL FK products | RESTRICT ; NULL toléré si produit archivé (le snapshot prime) |
| sku / name | TEXT / JSONB NOT NULL | snapshots figés |
| quantity | INTEGER NOT NULL CHECK (> 0) | |
| unit_price_excl_tax | BIGINT NOT NULL | figé à la création |
| discount_excl_tax | BIGINT NOT NULL DEFAULT 0 | part de la remise globale affectée à cette ligne |
| tax_rate_bp / tax_amount | INTEGER / BIGINT NOT NULL | ventilation fiscale figée |
| total_excl_tax / total_incl_tax | BIGINT NOT NULL | figés |
| is_shipping | BOOLEAN NOT NULL DEFAULT false | ligne de frais de livraison (ECOM-08 D3) |

### 3.4 Paiements (brique ecom-payment-mock)

**payment_providers** — Prestataire configuré (ECOM-07 D1/D2/D9).
| Colonne | Type | Règle |
|---|---|---|
| code | TEXT UNIQUE NOT NULL | mock en v1 ; un PSP réel implémente le même contrat en v2 |
| name | TEXT NOT NULL | |
| mode | TEXT NOT NULL DEFAULT disabled | disabled, enabled, test (test = paiement factice) |
| is_published | BOOLEAN NOT NULL DEFAULT false | visible sur la boutique |
| capabilities | JSONB NOT NULL | capacités déclarées : tokenization, manual_capture, refund (none/full_only/partial), express_checkout |
| config | JSONB NOT NULL DEFAULT {} | scénarios du mock (succès, échec, attente, remboursement) |

**payment_transactions** — Tentative de paiement ou remboursement (ECOM-07 D4/D5/D6).
| Colonne | Type | Règle |
|---|---|---|
| order_id | BIGINT NOT NULL FK orders | RESTRICT ; une seule commande par transaction |
| provider_id | BIGINT NOT NULL FK payment_providers | RESTRICT |
| parent_id | BIGINT NULL FK payment_transactions | RESTRICT ; remboursement = transaction enfant |
| reference | TEXT UNIQUE NOT NULL | référence opaque échangée avec le prestataire |
| operation | TEXT NOT NULL DEFAULT payment | payment ou refund |
| amount | BIGINT NOT NULL | négatif pour un remboursement |
| currency | CHAR(3) NOT NULL | |
| status | TEXT NOT NULL DEFAULT draft | draft, pending, authorized, done, cancel, error |
| status_message | TEXT NULL | dernier message du prestataire |
| last_state_change | TIMESTAMPTZ NULL | |

Transitions (table ECOM-07 §4) : pending depuis draft ; authorized depuis draft/pending ; done depuis draft/pending/authorized/error ; cancel depuis draft/pending/authorized ; error depuis draft/pending/authorized. Aucune sortie de done ni de cancel.

Invariants : montant et devise notifiés doivent correspondre, sinon error sans mise à jour ; notification rejouée sans double effet (état cible déjà atteint = ignorée) ; un remboursement ne dépasse pas payé moins remboursements confirmés ; seule une transaction done se rembourse ; une transaction ne se supprime jamais, ses changements sont tracés.

### 3.5 Livraison (brique ecom-cart-orders)

**shipping_methods** — Offre de livraison (ECOM-08 D2/D8).
| Colonne | Type | Règle |
|---|---|---|
| name | JSONB NOT NULL | traduit |
| pricing_type | TEXT NOT NULL | fixed ou rules (transporteur externe : contrat seul, hors v1) |
| fixed_price | BIGINT NULL | si pricing_type = fixed |
| tax_rate_id | BIGINT NOT NULL FK tax_rates | les frais sont taxés (D3) |
| free_over_amount | BIGINT NULL | gratuité au-delà d’un seuil (montant hors livraison, >= seuil) |
| max_weight_grams | INTEGER NULL | NULL ou 0 = pas de limite |
| countries | JSONB NULL | codes ISO 3166-1 alpha-2 ; NULL = partout |
| tracking_url_template | TEXT NULL | marqueur de numéro de suivi |
| is_published | BOOLEAN NOT NULL DEFAULT true | |
| position | INTEGER NOT NULL DEFAULT 0 | |

**shipping_price_rules** — Règles de tarification (pricing_type = rules).
| Colonne | Type | Règle |
|---|---|---|
| shipping_method_id | BIGINT NOT NULL FK shipping_methods | CASCADE |
| variable | TEXT NOT NULL | weight, amount ou quantity |
| max_value | INTEGER NOT NULL | borne supérieure de la tranche |
| base_price / price_per_unit | BIGINT NOT NULL | prix = base_price + price_per_unit x quantité de la variable |

Règle : une méthode à règles n’est proposée que si son tarif est calculable pour le panier.

**shipments** — Expédition d’une commande (ECOM-08 D5).
| Colonne | Type | Règle |
|---|---|---|
| order_id | BIGINT NOT NULL FK orders | CASCADE (agrégat commande) ; une expédition par commande en v1 |
| status | TEXT NOT NULL DEFAULT pending | pending, ready, shipped, delivered, cancelled |
| tracking_ref / tracking_url | TEXT NULL | renseignés à l’expédition |
| shipped_at / delivered_at | TIMESTAMPTZ NULL | |

Règles : créée à la confirmation de la commande ; ready = stock réservé ; shipped consomme la réservation (sortie de stock physique) ; delivered fait passer la commande à delivered ; annulation de la commande annule les expéditions non terminées ; chaque changement de statut tracé.

### 3.6 Stocks (brique ecom-inventory-fulfillment)

**stock_levels** — Quantités par produit (ECOM-09 D1 ; un seul entrepôt en v1, D7).
| Colonne | Type | Règle |
|---|---|---|
| product_id | BIGINT NOT NULL FK products | RESTRICT ; PK = product_id (une ligne par produit suivi) |
| qty_on_hand | INTEGER NOT NULL DEFAULT 0 CHECK (>= 0) | stock physique |
| qty_reserved | INTEGER NOT NULL DEFAULT 0 CHECK (>= 0) | réservations des commandes confirmées non expédiées |

Disponible = qty_on_hand - qty_reserved (colonne générée ou calculée à la lecture, jamais stockée en double). Un produit non suivi n’a pas de ligne et est toujours disponible.

**stock_moves** — Variation tracée (ECOM-09 D8).
| Colonne | Type | Règle |
|---|---|---|
| product_id | BIGINT NOT NULL FK products | RESTRICT |
| quantity | INTEGER NOT NULL | signé : positif = entrée, négatif = sortie |
| move_type | TEXT NOT NULL | reservation, reservation_release, shipment, return_receipt, restock, adjustment |
| order_id / shipment_id / return_request_id | BIGINT NULL FK | cause du mouvement (RESTRICT) |
| actor | TEXT NOT NULL | customer:id, admin:id ou system (ECOM-19 D9) |

Règles : toute variation de qty_on_hand ou qty_reserved a son mouvement ; la réservation a lieu à la confirmation, pour la différence non encore traitée ; la disponibilité est recontrôlée à l’engagement du paiement (D5) ; une annulation libère (reservation_release) ; un retour reçu n’est remis en stock vendable qu’après décision (return_receipt validé par un admin) ; un retour ne déclenche jamais de réservation.

### 3.7 Comptes clients (brique ecom-accounts)

**customers** — Compte client (ECOM-10).
| Colonne | Type | Règle |
|---|---|---|
| email | TEXT UNIQUE NOT NULL | identifiant de connexion |
| password_hash | TEXT NOT NULL | jamais lu ni affiché ; changement avec ancien mot de passe |
| full_name | TEXT NOT NULL | |
| phone | TEXT NULL | |
| locale | TEXT NOT NULL DEFAULT fr | locale préférée (rendu des champs JSONB) |
| is_active | BOOLEAN NOT NULL DEFAULT true | false après désactivation |
| deactivated_at | TIMESTAMPTZ NULL | désactivation : identifiant + mot de passe retapés, commandes conservées (D8) |

**customer_addresses** — Carnet d’adresses (ECOM-10 D5).
| Colonne | Type | Règle |
|---|---|---|
| customer_id | BIGINT NOT NULL FK customers | CASCADE |
| address_type | TEXT NOT NULL | billing, shipping ou both |
| recipient / street1 / street2 / zip / city | TEXT | identité et voie |
| country | CHAR(2) NOT NULL | ISO 3166-1 alpha-2 |
| region | TEXT NULL | |

Règle : un client ne modifie que ses propres adresses ; la commande n’y fait jamais référence (copie figée JSONB sur orders).

### 3.8 Administration et réglages (briques ecom-admin, ecom-audit-ops)

**admin_users** — Utilisateur interne (ECOM-12 D1, ECOM-16 D1).
| Colonne | Type | Règle |
|---|---|---|
| email | TEXT UNIQUE NOT NULL | |
| password_hash | TEXT NOT NULL | |
| role | TEXT NOT NULL | manager (tout), operator (commandes, clients, retours), editor (catalogue hors prix ni configuration) |
| is_active | BOOLEAN NOT NULL DEFAULT true | |

Règle : matrice de droits figée en v1 (3 rôles) ; pas de tables role/permission génériques — une évolution v2 pourra les introduire sans migration de données (colonne role déjà porteuse).

**settings** — Paramètres boutique et exploitation (ECOM-03 D7, ECOM-12, ECOM-20).
| Colonne | Type | Règle |
|---|---|---|
| key | TEXT PK | ex. shop.currency, shop.tax_display (ht/ttc), shop.cart_abandon_delay_hours (défaut 10), notification.confirmation_template, tasks.cart_recovery_enabled |
| value | JSONB NOT NULL | valeur typée |
| updated_at | TIMESTAMPTZ | modifiable par le seul gestionnaire (admin système pour l’exploitation) |

### 3.9 Retours et remboursements (brique ecom-inventory-fulfillment)

**return_requests** — Demande de retour (ECOM-11 D1/D8).
| Colonne | Type | Règle |
|---|---|---|
| order_id | BIGINT NOT NULL FK orders | RESTRICT |
| customer_id | BIGINT NOT NULL FK customers | RESTRICT ; seul le client de la commande ou un admin crée la demande |
| status | TEXT NOT NULL DEFAULT requested | machine d’état ci-dessous |
| reason | TEXT NOT NULL | motif du client |
| refusal_reason | TEXT NULL | obligatoire si refusée |
| received_at / closed_at | TIMESTAMPTZ NULL | |

Machine d’état du retour :

    requested --(décision admin)--> approved ou rejected (motif obligatoire)
    approved --(réception enregistrée, mouvement entrant)--> received
    requested ou approved --(avant réception)--> cancelled
    received --(remboursement traité ou décision de ne pas rembourser)--> closed

**return_lines** — Lignes retournées.
| Colonne | Type | Règle |
|---|---|---|
| return_request_id | BIGINT NOT NULL FK return_requests | CASCADE |
| order_line_id | BIGINT NOT NULL FK order_lines | RESTRICT |
| quantity | INTEGER NOT NULL CHECK (> 0) | <= livré - déjà retourné sur la ligne (D3) ; au moins une ligne non nulle par demande |
| restock | BOOLEAN NOT NULL DEFAULT false | remise en stock vendable seulement après décision admin (D11) |

Le remboursement n’est pas une table dédiée : c’est une **payment_transactions** enfant (operation = refund, montant négatif), plafonnée à payé - remboursements confirmés (D4) ; si le prestataire ne supporte pas le remboursement, remboursement manuel enregistré (même table, provider mock ou manuel). Retour et remboursement sont liés mais indépendants (D2).

### 3.10 Notifications (brique ecom-notifications)

**notification_templates** — Modèle de message (ECOM-14 D1/D3).
| Colonne | Type | Règle |
|---|---|---|
| key | TEXT NOT NULL | événement : order_confirmed, payment_received, account_created, password_reset, cart_recovery |
| locale | TEXT NOT NULL | unicité (key, locale) |
| subject / body | TEXT NOT NULL | paramétrés par l’objet concerné |
| is_active | BOOLEAN NOT NULL DEFAULT true | sans modèle actif, aucun envoi et aucune erreur |

**notifications** — Envoi tracé (ECOM-14 D9).
| Colonne | Type | Règle |
|---|---|---|
| template_key | TEXT NOT NULL | événement source |
| recipient_email | TEXT NOT NULL | client ou invité |
| channel | TEXT NOT NULL DEFAULT email | seul canal v1 |
| status | TEXT NOT NULL DEFAULT pending | pending, sent, failed (état de l’intention ; aucun transport ni moteur de reprise en v1) |
| order_id | BIGINT NULL FK orders | SET NULL ; contexte |
| sent_at | TIMESTAMPTZ NULL | |

Règles : pas de courriel transactionnel pour une commande annulée (D5) ; une intention de relance de panier n’est mise en file qu’une fois ; la tâche ECOM-20 crée ces intentions par lots bornés, sans envoyer les courriels.

### 3.11 Journalisation (brique ecom-audit-ops)

**audit_logs** — Trace métier (ECOM-19 D1/D2/D3).
| Colonne | Type | Règle |
|---|---|---|
| entity_type / entity_id | TEXT / BIGINT NOT NULL | cible polymorphe (order, payment_transaction, return_request, customer, …) sans FK (D10 : survit à la suppression) |
| event | TEXT NOT NULL | ex. order.status_changed, payment.refunded, return.approved |
| actor | TEXT NOT NULL | customer:id, admin:id ou system (auteur technique identifiable) |
| diff | JSONB NULL | ancienne et nouvelle valeur des champs suivis |
| created_at | TIMESTAMPTZ NOT NULL | pas de updated_at : table en insertion seule |

Règles : insertion seule, jamais de mise à jour ni suppression en v1 ; pas de données personnelles au-delà des identifiants ; les journaux techniques restent hors base (logs serveur).

## 4. Relations et comportements ON DELETE

Principe : RESTRICT pour toute référence comptable ou historique (commandes, paiements, stocks, taxes) ; CASCADE pour les lignes appartenant à un agrégat ; SET NULL uniquement pour des contextes non comptables.

| Relation | Cardinalité | FK portée par | ON DELETE |
|---|---|---|---|
| products 1-N product_images | un produit a 1..n images | product_images.product_id | CASCADE |
| products N-N categories | via product_categories | product_categories (PK composée) | CASCADE côté produit ; RESTRICT côté catégorie (ECOM-02 D5) |
| categories 1-N categories | arbre auto-référencé | categories.parent_id | RESTRICT (suppression refusée si non vide) |
| tax_rates 1-N products / shipping_methods | une taxe par produit et par méthode | products.tax_rate_id, shipping_methods.tax_rate_id | RESTRICT (référence fiscale) |
| customers 1-N customer_addresses | carnet du client | customer_addresses.customer_id | CASCADE |
| customers 1-N carts | paniers du client | carts.customer_id | SET NULL (le panier anonyme survit) |
| carts 1-N cart_lines | lignes de l’agrégat panier | cart_lines.cart_id | CASCADE |
| products 1-N cart_lines | produit pointé | cart_lines.product_id | RESTRICT (on archive, on ne supprime pas) |
| customers 1-N orders | historique du client | orders.customer_id | RESTRICT (comptable ; un client avec commandes ne se supprime pas) |
| orders 1-N order_lines | lignes de l’agrégat commande | order_lines.order_id | CASCADE |
| products 1-N order_lines | produit d’origine | order_lines.product_id | RESTRICT (le snapshot figé prime) |
| promotions 0-N orders | remise appliquée | orders.promotion_id | RESTRICT |
| shipping_methods 0-N orders / carts | mode choisi | orders.shipping_method_id, carts.shipping_method_id | RESTRICT côté orders ; SET NULL côté carts |
| shipping_methods 1-N shipping_price_rules | règles de la méthode | shipping_price_rules.shipping_method_id | CASCADE |
| orders 1-N shipments | expédition de l’agrégat | shipments.order_id | CASCADE |
| orders 1-N payment_transactions | paiements de la commande | payment_transactions.order_id | RESTRICT (comptable) |
| payment_providers 1-N payment_transactions | prestataire utilisé | payment_transactions.provider_id | RESTRICT |
| payment_transactions 1-N payment_transactions | remboursement enfant | payment_transactions.parent_id | RESTRICT |
| products 1-1 stock_levels | niveau de stock du produit suivi | stock_levels.product_id (PK) | RESTRICT |
| products 1-N stock_moves | historique des variations | stock_moves.product_id | RESTRICT |
| orders / shipments / return_requests 0-N stock_moves | cause du mouvement | stock_moves.order_id / shipment_id / return_request_id | RESTRICT |
| orders 1-N return_requests | retours de la commande | return_requests.order_id | RESTRICT |
| return_requests 1-N return_lines | lignes de l’agrégat retour | return_lines.return_request_id | CASCADE |
| order_lines 1-N return_lines | ligne retournée | return_lines.order_line_id | RESTRICT |
| orders 0-N notifications | contexte de l’envoi | notifications.order_id | SET NULL |
| audit_logs | cible polymorphe (entity_type, entity_id) | sans FK | n/a (insertion seule) |

## 5. Décisions structurantes

- **D1 — Variantes de produit : pas de variantes en v1.** Un produit = un SKU (ECOM-01 D1). Pas de couche template/variante ni de table d’attributs : la moitié du modèle produit d’Odoo disparaît. Extension v2 documentée : introduire product_variants (parent product_id, combinaison d’attributs JSONB, SKU propre) en déplaçant prix, stock et images au niveau variante, sans toucher aux commandes (snapshots figés).
- **D2 — Prix catalogue = prix effectif en v1.** Pas de listes de prix (ECOM-03 D1 : socle = prix unique). Le prix affiché, filtré et trié est products.price_catalog ; compare_price sert de prix barré marketing. Les réductions passent par les promotions (niveau commande), jamais par une réécriture du prix catalogue. Les listes de prix restent une extension v2 possible (table price_rules entre catalogue et panier).
- **D3 — Promotions : socle simple fusionné.** Une seule table promotions joue règle et récompense : déclenchement automatique (code NULL) ou par code saisi, remise globale en pourcentage ou montant plafonné, conditions de montant/quantité, dates et limite d’usage. Une seule remise globale par commande (pas de cumul, invariant Odoo retenu). La remise est répartie sur les lignes, les taxes sont recalculées sur les montants nets et les lignes/totaux restent figés. Exclus en v1 : fidélité, cartes cadeaux, produit offert, applicabilité au moins cher ou à des lignes spécifiques — le modèle programme/règle/récompense/carte (4 tables Odoo) est volontairement écrasé.
- **D4 — Réservation puis sortie physique du stock.** Le stock est réservé dans la transaction de confirmation, jamais au panier ; la disponibilité est recontrôlée à l’engagement du paiement et l’ajout au panier est plafonné. L’étape d’expédition consomme à la fois la réservation et le stock physique, avec un mouvement signé. Un retour ne réintègre le stock qu’à réception et décision de l’opérateur.
- **D5 — Compte client obligatoire en v1** (mode mandatory d’ECOM-10 D2), pas de commande invitée. Justification : l’espace client v1 (suivi de commandes, demandes de retour ECOM-11 D8, historique incluant les annulées) exige une identité stable ; l’invité imposerait des contacts orphelins, un accès par jeton seul et une fusion a posteriori. Le panier peut rester anonyme avant la caisse (session_token) et est rattaché au compte à la connexion (ECOM-05 D4) ; orders.access_token reste utile pour le suivi hors session.
- **D6 — Adresses figées sur la commande.** orders.billing_address et shipping_address sont des copies JSONB complètes au moment de la commande (ECOM-10 D6) : toute modification ultérieure du carnet d’adresses ne touche jamais une commande existante, et la suppression d’une adresse reste possible sans cascade comptable.
- **D7 — Remboursement = transaction enfant**, pas de table refund dédiée : le cycle à 6 états et les plafonds sont ceux du domaine paiement (ECOM-07 D6, ECOM-11 D4), ce qui évite une double machine d’état.
- **D8 — Pas de tables role/permission ni payment_methods en v1.** Trois rôles fixes (colonne admin_users.role, ECOM-12 D1) et un moyen de paiement par prestataire mock (capacités en JSONB). Justification : matrice figée au socle ; généralisation v2 sans migration de données.

## 6. Annexe — Impact v2 sur le modèle (fiches hors périmètre)

| Fiche v2 | Objet | Impact futur sur le modèle v1 |
|---|---|---|
| ECOM-13 Pages et contenu | CMS de pages (URL, titre, contenu structuré, publication programmée, indexation) | Nouvelle(s) table(s) pages / menus, aucune modification des tables v1 ; les champs de présentation produit/catégorie (description longue, image de couverture) sont déjà en JSONB |
| ECOM-15 Statistiques | Vues en lecture seule dérivées des commandes (ventes par période, produit, catégorie, pays) | Aucune table de fait à créer en v1 : orders et order_lines figés (totaux HT/TTC, devise, dates) suffisent ; v2 ajoute des vues SQL ou des tables d’agrégation |
| ECOM-17 Documents | Factures, bons de livraison, avoirs en PDF ; facture émise figée, correction par avoir | Nouvelles tables invoices / credit_notes (numérotation figée, montants recopiés depuis orders) ; les totaux et adresses figés de orders rendent la génération déterministe ; orders.payment_status distingue déjà les remboursements |
| ECOM-18 Intégrations externes | PSP réels, transporteurs réels, fournisseur d’identité, stock externe | Implémentations des contrats existants (PaymentProvider, tarification transporteur) : payment_providers.code et config JSONB accueillent un PSP réel sans changement de schéma ; shipping_methods.pricing_type extensible vers un type external ; aucune colonne v1 ne suppose le mock |

**Veille de conception pour v2 :** les introductions probables de product_variants (D1), price_rules (D2) et tables role/permission (D8) sont compatibles avec le schéma v1 sans migration destructive, grâce aux snapshots figés (lignes de commande, adresses) et aux colonnes porteuses (role, capabilities, pricing_type).
