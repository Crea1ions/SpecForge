# ECOM-16 — Sécurité et permissions

**Version :** 0.1 (brouillon)
**Référence Odoo :** 19.0 Community (LGPL-3 : `base`, `portal`, `website_sale`, `sale`)
**Statut :** décisions par défaut, à confirmer à la validation du référentiel (L6)

## 0. Décisions de conception

| # | Décision | Écart avec Odoo |
|---|---|---|
| D1 | Quatre catégories d'acteurs : public, client connecté, administrateur interne par rôle (ECOM-12 D1), administrateur système | Partiel : rôles de base Public, Portail, Utilisateur, Administrateur |
| D2 | Droit par objet et par action (lecture, écriture, création, suppression), complété par des règles de périmètre | Non : `ir.model.access.csv` et `ir.rule` |
| D3 | Un client ne lit que ses propres commandes, adresses et souhaits | Partiel : domaine `child_of` de la société commerciale du client (B2B) ; la règle ouvre écriture et suppression, la table de droits les refuse |
| D4 | Accès à un document sans compte par jeton secret, comparé en temps constant | Partiel : `consteq` ; jeton `uuid4` créé à la demande (`_portal_ensure_token`), expiration et rotation non lues |
| D5 | Un jeton ne figure jamais dans une URL de navigation ni dans un journal *(proposition)* | Oui : liens précédent et suivant avec `?access_token=` |
| D6 | Tout HTML saisi est assaini ; l'exception est réservée à l'administrateur système | Partiel : `sanitize_overridable` (défaut `False`) permet au groupe `base.group_sanitize_override` de contourner par champ ; `sanitize=False` supprime le nettoyage pour tous |
| D7 | Toute route qui modifie l'état est protégée contre le CSRF ; toute exception est documentée | Partiel : aucune exception dans `website_sale`, `portal`, `payment` ; `csrf=False` sur `/website/form/<modèle>` |
| D8 | Captcha sur les formulaires publics et l'inscription | Non : captcha `signup`, `password_reset`, `website_form` |
| D9 | Politique de mot de passe, double authentification, clés d'accès : option avancée ; limitation des tentatives au socle *(proposition)* | Non : modules `auth_password_policy`, `auth_totp`, `auth_passkey` et variantes portail ; limitation de débit non lue |
| D10 | Les droits sont vérifiés côté serveur, jamais par le seul masquage d'un menu | Non : menus filtrés par groupe, droits par accès |

## 1. Objectif et périmètre

Définir qui peut voir et faire quoi, et comment les accès sans compte sont protégés.

Dans le périmètre : acteurs, droits par objet, règles de périmètre, jetons d'accès, assainissement, protection des formulaires.

Hors périmètre : rôles d'administration détaillés (ECOM-12), compte client (ECOM-10), journalisation (ECOM-19), exploitation (ECOM-20).

## 2. Objets métier

- **Acteur** : public, client, administrateur interne, administrateur système.
- **Rôle** : ensemble de droits attribué à un acteur interne.
- **Droit d'accès** : permission de lire, écrire, créer ou supprimer un type d'objet.
- **Règle de périmètre** : filtre limitant les enregistrements accessibles.
- **Jeton d'accès** : secret donnant accès à un document sans compte.
- **Assainissement** : nettoyage du HTML saisi.

## 3. Données

**Acteurs (Odoo : groupes de `base`)**

| Acteur | Groupe Odoo | Remarque |
|---|---|---|
| Public | `base.group_public` | Utilisateur modèle `public_user` |
| Client connecté | `base.group_portal` | Compte créé depuis un modèle de compte portail |
| Administrateur interne | `base.group_user` + rôles `sales_team` | Voir ECOM-12 |
| Administrateur système | `base.group_system` | Implique le groupe de contournement de l'assainissement |

**Droits sur les commandes (Odoo : `sale/security/ir.model.access.csv`)**

| Groupe | Lecture | Écriture | Création | Suppression |
|---|---|---|---|---|
| Portail | oui | non | non | non |
| Vendeur | oui | oui | oui | non |
| Responsable des ventes | oui | oui | oui | oui |
| Facturation, comptable | oui | oui | non | non |

Aucune ligne pour le groupe public dans les lignes lues.

**Règles de périmètre (lues)**

| Règle | Effet |
|---|---|
| Produit | Public : publié et vendable (ECOM-12) |
| Catégorie boutique | Public : au moins un produit publié |
| Liste de prix | Limitée à la société du site |
| Valeur personnalisée de variante | Public, portail, employé : ses propres enregistrements (`create_uid`) |
| Commande, ligne de commande | Portail : commandes de la société commerciale du client (`child_of`) |

**Jeton d'accès (Odoo : `portal.mixin`)**

| Champ | Règle |
|---|---|
| Jeton | `uuid4`, créé à la première demande, écrit en `sudo` |
| Comparaison | Temps constant (`consteq`) |
| Expiration, rotation | Non lues |

## 4. États et transitions

| Objet | États |
|---|---|
| Jeton | absent, créé |
| Compte | voir ECOM-10 |

| De | Vers | Déclencheur |
|---|---|---|
| absent | créé | Première demande de lien de partage (`_portal_ensure_token`) |
| créé | absent | Révocation : non lue *(proposition : à prévoir)* |

## 5. Invariants et règles de validation

1. Les droits sont vérifiés côté serveur ; un menu masqué ne protège rien (D10).
2. Le portail lit les commandes et leurs lignes, sans les modifier : le droit d'accès l'interdit, bien que la règle de périmètre ouvre écriture et suppression (Odoo : `ir.model.access.csv` contre `sale_order_rule_portal`).
3. Le vendeur ne supprime pas de commande ; le responsable des ventes oui.
4. Un client ne lit que ses propres commandes (D3 ; Odoo : règles portail, domaines non lus).
5. Le public ne voit que les produits publiés et vendables, et les catégories non vides (ECOM-12).
6. Un document n'est accessible sans compte que si le jeton fourni est identique à celui du document, comparé en temps constant (D4 ; Odoo : `_document_check_access`).
7. Un document sans jeton refuse l'accès par jeton (Odoo : `_document_check_access`).
8. Un jeton ne figure jamais dans une URL de navigation ni dans un journal *(proposition, D5)*.
9. Tout HTML saisi est assaini, sauf champ explicitement exempté (D6).
10. Toute route qui modifie l'état est protégée contre le CSRF ; l'exception est documentée (D7).
11. Les formulaires publics, l'inscription et la réinitialisation de mot de passe sont protégés par captcha (D8).
12. Les utilisateurs modèles (public, portail) servent de gabarit et ne se connectent pas *(déduit)*.

## 6. Erreurs et cas particuliers

- Jeton absent, vide ou différent : accès refusé.
- Lien de partage envoyé par courriel : le jeton contourne les droits du destinataire ; toute personne qui le détient accède au document.
- Écart d'Odoo : les liens précédent et suivant du portail portent le jeton en paramètre d'URL (journaux, en-tête de référent).
- Écart d'Odoo : `sanitize=False` sur le contenu du méga-menu supprime l'assainissement pour tous ; le groupe de contournement ne s'y applique pas.
- Écart d'Odoo : `csrf=False` sur `/website/form/<modèle>` (ECOM-13) ; le modèle cible est un paramètre d'URL.
- Jeton jamais renouvelé dans le code lu : un lien divulgué reste valide.

## 7. Parcours

**Odoo Community :**
- Un client connecté ouvre ses commandes ; la règle de périmètre limite à sa société commerciale.
- Un destinataire sans compte ouvre un lien de partage : le jeton remplace les droits.
- Un formulaire public, l'inscription et la réinitialisation passent par un captcha.
- Les modules d'authentification renforcée s'ajoutent à la demande.

**SpecForge *(proposition)* :**
1. Chaque requête est rattachée à un acteur (D1).
2. Le serveur contrôle le droit par objet et par action, puis le périmètre (D2, D10).
3. Un accès sans compte exige un jeton valide (D4).
4. Les saisies HTML sont assainies (D6) ; les routes d'écriture sont protégées contre le CSRF (D7).
5. Les formulaires publics sont protégés par captcha (D8).
6. L'administrateur active, s'il le souhaite, la double authentification (D9).

## 8. Frontières

- **Authentification ≠ autorisation :** identifier l'acteur, puis contrôler ses droits.
- **Droit d'accès ≠ règle de périmètre :** objet et action d'un côté, enregistrements de l'autre (D2).
- **Jeton ≠ compte :** le jeton donne accès à un document, pas à une identité (D4).
- **Rôle ≠ permission :** ECOM-12 définit les rôles, ECOM-16 les permissions.
- **Sécurité ≠ journalisation :** ECOM-19.
- **Externalisable :** authentification par un fournisseur d'identité (`auth_oauth`), captcha tiers (ECOM-18).

## 9. Dépendances

- Entrantes : ECOM-10 (comptes), ECOM-12 (rôles), ECOM-13 (formulaires publics).
- Sortantes : toutes les fiches (droits de chaque objet), ECOM-19, ECOM-20.

## 10. Correspondance Odoo

| Capacité | Module | Mécanisme |
|---|---|---|
| Acteurs | `base` | Groupes Public, Portail, Utilisateur, Administrateur |
| Droits, périmètre | `base`, `sale`, `website_sale` | `ir.model.access.csv`, `ir.rule` |
| Jeton d'accès | `portal` | `_portal_ensure_token`, `_document_check_access`, `consteq` |
| Assainissement | `base` | `sanitize_overridable`, `base.group_sanitize_override` |
| Captcha | `google_recaptcha`, `auth_signup`, `website` | `signup`, `password_reset`, `website_form` |
| Mot de passe | `auth_password_policy` | Variantes portail et inscription |
| Double authentification | `auth_totp` | Variantes portail et courriel |
| Clés d'accès | `auth_passkey` | Variante portail |
| Délai de session | `auth_timeout` | Non lu |

Licences : `base`, `portal`, `auth_signup` en LGPL-3 ; `auth_totp`, `auth_password_policy`, `google_recaptcha` LGPL-3 (vérifié). Autres modules `auth_*` non vérifiés.

## 11. Classement (T6)

- **Socle :** acteurs, droits par objet et par action, règles de périmètre, jeton comparé en temps constant, assainissement, CSRF, captcha, limitation des tentatives.
- **Standard complémentaire :** politique de mot de passe, périmètre client limité à la personne, expiration des jetons.
- **Option avancée :** double authentification, clés d'accès, authentification fédérée, délai de session, comptes société.

## 12. Points non vérifiés

- Mécanisme de limitation des tentatives (`res_users.py:1230`).
- Expiration, rotation et révocation des jetons.
- Droits d'écriture du méga-menu.
- Liste des modèles acceptés par `/website/form/<modèle>`, effet de `csrf=False`.
- Règles de `payment.transaction` et des jetons de paiement pour le portail.
- Contenu des modules `auth_timeout`, `auth_passkey`, `auth_oauth`, `auth_ldap`.
- En-têtes de sécurité HTTP.
- Licences des autres modules `auth_*`.
