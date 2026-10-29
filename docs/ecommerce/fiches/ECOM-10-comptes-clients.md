# ECOM-10 — Comptes clients

**Version :** 0.2 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `portal`, `auth_signup`, `website_sale`, `website_sale_wishlist`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Un client est une personne : un compte, un contact principal, des adresses enfants. Le B2B est hors périmètre | Partiel : Odoo gère aussi les sociétés (`commercial_partner_id`, `child_of`) |
| D2 | Mode de compte par site : optionnel, désactivé (achat invité) ou obligatoire. Socle : optionnel | Non : `account_on_checkout` a ces trois valeurs, défaut `optional` |
| D3 | Un seul réglage pilote l'inscription libre ; pas de second réglage couplé par écriture | Oui : Odoo écrit `auth_signup_uninvited` à l'enregistrement de `account_on_checkout` |
| D4 | Un invité est un contact sans compte, rattaché à sa commande | Non : `_create_or_update_address` crée un `res.partner` sans `res.users` (parent déduit) |
| D5 | Carnet d'adresses : contact principal plus adresses typées facturation, livraison, ou les deux | Non : `type` vaut `invoice`, `delivery` ou `other` |
| D6 | L'adresse d'une commande confirmée est une copie figée *(proposition)* | Oui : Odoo référence le contact vivant (`_update_address`) |
| D7 | Un client ne modifie que son contact et ses adresses enfants | Non : `_can_be_edited_by_current_customer` |
| D8 | Mot de passe : ancien exigé, confirmation identique. Désactivation : identifiant et mot de passe retapés. Les commandes sont conservées *(proposition)* | Oui : Odoo efface le login et le mot de passe, archive compte et contact, puis tente de les supprimer ; les commandes ne sont conservées que par contrainte (`_deactivate_portal_user`, `_gc_portal_users`) |
| D9 | « Mes commandes » : commandes confirmées du client ; annulées visibles avec leur statut *(proposition)* | Oui : Odoo n'affiche que `state = 'sale'` |
| D10 | Liste de souhaits : option avancée, par site. Visiteur par session, fusion à la connexion, unicité propriétaire + produit + site | Partiel : l'unicité SQL ne protège pas `partner_id` nul |
| D11 | Boutique réservée aux connectés : option avancée | Non : `ecommerce_access` vaut `everyone` ou `logged_in` |

## 1. Objectif et périmètre

Permettre à un visiteur d'acheter avec ou sans compte, et à un client connecté de gérer son identité, ses adresses et l'historique de ses commandes.

Dans le périmètre : mode de compte à l'achat, inscription, adresses, mot de passe, désactivation du compte, liste des commandes, liste de souhaits.

Hors périmètre : sociétés clientes et contacts multiples (B2B), points de fidélité (ECOM-04), droits des administrateurs (ECOM-16), notifications (ECOM-14).

## 2. Objets métier

- **Client** : personne qui achète. Il a au plus un compte et un contact principal.
- **Compte** : identifiant et secret de connexion. Il est actif ou désactivé.
- **Contact** : identité et coordonnées d'une personne ou d'une adresse.
- **Adresse** : contact enfant du client, de type facturation, livraison, ou les deux.
- **Invité** : acheteur sans compte. Il est un contact rattaché à une commande.
- **Souhait** : lien entre un propriétaire (client ou session), un produit et un site. Il garde le prix et la liste de prix de l'ajout.

## 3. Données

**Contact** (Odoo : `res.partner`)

| Champ | Règle |
|---|---|
| Nom | Obligatoire |
| Courriel, téléphone | Coordonnées de la personne |
| Type | `contact`, `invoice`, `delivery` ou `other` ; défaut `contact` |
| Parent | Contact principal du client ; vide pour le contact principal et pour un invité *(déduit)* |
| Adresse | Rue, complément, code postal, ville, pays, région |
| Langue | Celle de la requête à la création |

**Compte** (Odoo : `res.users`)

| Champ | Règle |
|---|---|
| Identifiant | Unique ; sert aussi de confirmation à la désactivation |
| Mot de passe | Jamais lu ni affiché ; changement avec l'ancien mot de passe |
| Actif | Faux après désactivation |

**Souhait** (Odoo : `product.wishlist`)

| Champ | Règle |
|---|---|
| Propriétaire | Contact du client ; vide pour un visiteur (session) |
| Produit | Obligatoire |
| Site | Obligatoire ; la suppression du site supprime ses souhaits |
| Prix, liste de prix | Figés à l'ajout |
| Actif | Booléen ; la signification métier n'est pas lue |

**Réglages du site :** mode de compte à l'achat (D2), inscription libre (D3), accès à la boutique (D11).

## 4. États et transitions

**Panier** : anonyme (partenaire = partenaire public du site) puis identifié, dès qu'une adresse est enregistrée (`_is_anonymous_cart`).

**Compte** : inexistant, actif, désactivé.

| De | Vers | Déclencheur |
|---|---|---|
| inexistant | actif | Inscription (le lieu de création du compte n'est pas lu, voir §12) |
| actif | désactivé | Désactivation demandée par le client (D8) |
| désactivé | actif | Non lu *(proposition : réactivation par l'administrateur seulement)* |

**Souhait** : propriété visiteur (session) puis propriété client, à la connexion (fusion). Sans fusion, un souhait de visiteur est purgé après 5 semaines.

## 5. Invariants et règles de validation

1. Mode `mandatory` : un visiteur non connecté qui ouvre la caisse est redirigé vers la connexion (Odoo : `_check_cart`).
2. Mode `disabled` : l'achat invité est permis ; l'invité n'a pas de compte (D4).
3. Un panier est anonyme tant que son partenaire est le partenaire public du site (Odoo : `_is_anonymous_cart`).
4. Le type d'une adresse créée vaut `other` si livraison et facturation sont confondues, `invoice` pour la facturation, `delivery` pour la livraison (Odoo : `_complete_address_values`).
5. Une nouvelle adresse est rattachée au contact principal du client seulement si celui-ci est actif ; l'invité n'a donc pas de parent *(déduit)*.
6. Un client ne modifie que son contact et les adresses enfants de type `invoice`, `delivery` ou `other` de sa société (D7 ; Odoo : `_can_be_edited_by_current_customer`).
7. Si le nom saisi est identique à l'existant, il n'est pas réécrit (Odoo : raison donnée dans le code, titulaire du compte bancaire).
8. Changement de mot de passe : les trois champs sont remplis, la confirmation est identique, l'ancien mot de passe est correct. Le jeton de session est renouvelé pour ne pas déconnecter le client. Aucune règle de complexité n'est lue.
9. Désactivation du compte : requête POST, identifiant retapé identique, mot de passe vérifié ; puis le client est déconnecté (Odoo : `/my/deactivate_account`).
10. Un changement de position fiscale après changement d'adresse recalcule les taxes de la commande (Odoo : `_update_address`).
11. L'adresse d'une commande confirmée est une copie figée *(proposition, D6)*.
12. Un souhait est unique par propriétaire, produit et site *(proposition ; Odoo : unicité propriétaire + produit, sans le site, et non protégée pour un propriétaire vide)*.
13. Un souhait dont le produit est dépublié ou non ajoutable au panier n'est pas affiché (Odoo : `current`).
14. À chaque vérification d'identifiants réussie, si la session contient des souhaits, ceux déjà présents chez le client sont supprimés et les autres lui sont rattachés (Odoo : `_check_credentials` appelle `_check_wishlist_from_session`).
15. Les souhaits de visiteur de plus de 5 semaines sont purgés (Odoo : `_gc_sessions`).
16. Mode `logged_in` : un visiteur non connecté n'a pas accès à la boutique (D11 ; Odoo : `has_ecommerce_access`).

## 6. Erreurs et cas particuliers

- Mot de passe : champ vide, confirmation différente ou ancien mot de passe incorrect, avec un message par champ.
- Désactivation : identifiant de validation différent, ou mot de passe incorrect, avec une erreur distincte.
- Adresse invalide ou incomplète : les champs en cause sont signalés avec leur message ; rien n'est enregistré.
- Modification de l'adresse d'un tiers : refus (Odoo : `Forbidden`).
- Mode `mandatory` sans session : redirection vers la connexion, le panier est conservé.
- Écart d'Odoo : le champ du site vaut `optional` par défaut, mais l'écran de réglages affiche `disabled` quand le champ est vide.
- Écart d'Odoo : le couplage de `_inverse_account_on_checkout` teste `self` et non `record` ; sans effet sur un seul enregistrement, à corriger dans la conception.
- Fusion de souhaits : la recherche des souhaits du client n'est pas filtrée par site, contrairement à l'affichage ; notre règle 12 supprime cet écart.
- Désactivation d'un compte avec des commandes : les commandes sont conservées *(proposition, D8)*.

## 7. Parcours

**Odoo Community :**
- À la caisse, le mode de compte décide : redirection vers la connexion (`mandatory`) ou achat invité (`disabled`). L'inscription passe par `/web/signup` (`auth_signup`).
- Le client connecté gère ses adresses (`/my/addresses`), son mot de passe (`/my/security`) et ses commandes confirmées (`/my/orders`). La désactivation se fait par `/my/deactivate_account`.
- La liste de souhaits est accessible aux visiteurs et aux clients.

**SpecForge *(proposition)* :**
1. Le visiteur achète en invité ou crée un compte, selon le mode du site (D2).
2. À la première adresse saisie, le panier devient identifié (§4).
3. Le client connecté consulte ses commandes, y compris annulées (D9).
4. Il modifie ses adresses ; une commande confirmée garde sa copie (D6).
5. Il désactive son compte ; ses commandes sont conservées (D8).
6. Il retrouve sa liste de souhaits à la connexion (D10).

## 8. Frontières

- **Invité ≠ client :** l'invité est un contact sans compte (D4).
- **Compte ≠ contact :** le compte sert à se connecter, le contact porte l'identité et les adresses.
- **Désactivation ≠ suppression :** le compte est désactivé et ne peut plus servir ; le contact et les commandes restent (D8). Odoo tente une suppression différée, qui échoue si le contact est référencé.
- **Adresse de la commande ≠ carnet d'adresses :** la commande confirmée garde sa copie (D6).
- **Mode de compte ≠ accès à la boutique :** `account_on_checkout` concerne la caisse, `ecommerce_access` concerne tout le catalogue (D11).
- **Externalisable :** authentification et inscription par un fournisseur d'identité (ECOM-18).
- **Permissions :** un client ne voit et ne modifie que ses propres données (ECOM-16).

## 9. Dépendances

- Entrantes : ECOM-05 (panier anonyme ou identifié), ECOM-01 (produits des souhaits), ECOM-03 (liste de prix figée au souhait).
- Sortantes : ECOM-06 (client et adresses de la commande), ECOM-08 (adresse de livraison), ECOM-11 (demande de retour depuis le compte), ECOM-14 (courriels d'inscription et de réinitialisation), ECOM-16, ECOM-19.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Mode de compte à l'achat | `website_sale` | `account_on_checkout`, `_check_cart`, `_inverse_account_on_checkout` |
| Inscription, réinitialisation | `auth_signup` | `/web/signup`, `do_signup`, `/web/reset_password`, `auth_signup_uninvited` |
| Panier anonyme | `website_sale` | `_is_anonymous_cart`, `_get_current_partner` |
| Adresses | `portal` | `/my/addresses`, `_create_or_update_address`, `_complete_address_values`, `_can_be_edited_by_current_customer` |
| Adresses de la commande | `website_sale` | `shop_address_submit`, `_update_address` |
| Mot de passe, désactivation | `portal` | `/my/security`, `_update_password`, `/my/deactivate_account` |
| Désactivation, liste noire | `mail`, `phone_validation` | `_deactivate_portal_user` (surcharges) |
| Mes commandes | `sale` | `_prepare_orders_domain` (`state = 'sale'`) |
| Liste de souhaits | `website_sale_wishlist` | `product.wishlist`, `current`, `_check_wishlist_from_session`, `_gc_sessions` |
| Boutique réservée | `website_sale` | `ecommerce_access`, `has_ecommerce_access` |

Licences : `portal`, `auth_signup`, `website_sale` et `website_sale_wishlist` en LGPL-3 (vérifié). `mail` et `phone_validation` non vérifiés.

## 11. Classement (T6)

- **Socle :** achat invité, compte optionnel, adresses facturation et livraison, changement de mot de passe, réinitialisation, liste des commandes, désactivation du compte.
- **Standard complémentaire :** carnet d'adresses multiples, adresses figées sur commande, annulées visibles dans les commandes, purge des données de désactivation.
- **Option avancée :** liste de souhaits, boutique réservée aux connectés, compte obligatoire, inscription par fournisseur d'identité, comptes société (B2B).

## 12. Points non vérifiés

- Désactivation : les échecs d'archivage sont avalés sans trace (`except Exception: pass`) ; états de `res.users.deletion` non lus ; délai de la file non lu.
- Lieu de création du compte en mode `optional` : l'invitation à créer un compte pendant l'achat n'est pas lue.
- Règles de complexité du mot de passe.
- Réactivation d'un compte désactivé.
- Signification métier du champ `active` d'un souhait.
- Contrainte `_product_unique_partner_id` : le site n'en fait pas partie, et la fusion de session ignore le site.
- Fusion des souhaits déclenchée aussi à la désactivation et au changement de mot de passe (`_check_credentials`), sans effet attendu.
- Licences de `mail` et `phone_validation`.
- Conformité RGPD de la désactivation (conservation, effacement).
