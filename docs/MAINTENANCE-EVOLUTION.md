# SpecForge — Maintenance & Évolution

## 1. Objectif

Ce document définit les règles simples à respecter lors de l'évolution de SpecForge.

L'objectif est d'éviter que le POC devienne progressivement une architecture difficile à comprendre ou à maintenir.

## 2. Règle générale

Toute évolution doit suivre autant que possible :

```text
Besoin
  ↓
Investigation ciblée
  ↓
Modification minimale
  ↓
Build / vérification
  ↓
Validation
  ↓
Checkpoint / commit
```

Éviter les refactorings larges lorsqu'une correction locale suffit.

## 3. Modifier le Core

Une modification du Core doit être considérée comme une modification du moteur technique.

Avant modification :

1. identifier la responsabilité concernée ;
2. vérifier les types utilisés ;
3. vérifier le Registry ;
4. vérifier les contraintes du Validator ;
5. vérifier le Resolver ;
6. vérifier les effets sur le Generator.

Après modification :

```bash
npm run build
```

Puis effectuer une vérification fonctionnelle ciblée.

## 4. Ajouter une brique

Une nouvelle brique doit être ajoutée au Registry avec une définition explicite de :

* son identifiant ;
* ses capacités ;
* ses dépendances ;
* ses incompatibilités éventuelles ;
* ses fichiers ;
* ses conditions d'activation.

Une brique ne doit pas être créée uniquement pour contourner une erreur de validation.

Elle doit représenter une capacité technique réelle du système.

### Séquence recommandée

```text
Besoin technique
      ↓
Définition de la capacité
      ↓
Brique
      ↓
Registry
      ↓
Resolver
      ↓
Generator
      ↓
Vérification
```

## 5. Ajouter un template

Un template correspond à un couple :

```text
Profil technique
+
Type d'application
```

Avant de créer un nouveau template, vérifier qu'il n'existe pas déjà un preset correspondant.

Le template doit définir une architecture de référence cohérente.

Il ne doit pas contenir de données spécifiques à un ancien projet réel.

Exemple à éviter :

```text
name: "Lexi Core"
description: "Plateforme Lexi..."
```

Le preset doit décrire une référence technique, pas un projet particulier.

## 6. Ajouter un profil technique

Le modèle prévoit actuellement :

```text
Rust
Python
TypeScript
Go
```

Ajouter un profil ne signifie pas simplement ajouter une option dans un `<select>`.

Il faut progressivement fournir les templates correspondants.

La progression recommandée est :

```text
Profil
  ↓
Premier template fonctionnel
  ↓
Briques nécessaires
  ↓
Résolution
  ↓
Génération
  ↓
Autres types d'application
```

Il n'est pas nécessaire d'implémenter toutes les combinaisons immédiatement.

## 7. Modifier un preset

Un preset est une référence technique.

Une modification peut donc modifier le comportement généré.

Avant modification, vérifier :

* les briques nécessaires ;
* les dépendances ;
* les incompatibilités ;
* la validation ;
* la génération ;
* les fichiers produits.

Ne pas désactiver une validation uniquement pour faire disparaître un message d'erreur.

Un diagnostic du Core peut signaler une capacité réellement absente.

## 8. Validation et erreurs

Une erreur de validation doit rester visible lorsqu'une spécification demande une capacité non disponible.

Exemple :

```text
Authentification JWT demandée
        ↓
Aucune brique JWT disponible
        ↓
Erreur explicite
```

Cette erreur constitue une information technique utile.

La solution correcte consiste à :

* ajouter la capacité manquante ;
* ou modifier la spécification si le besoin n'est plus requis.

## 9. Interface

L'interface doit refléter le modèle du Core sans le dupliquer.

Le frontend peut :

* présenter les choix ;
* afficher les diagnostics ;
* faciliter l'édition ;
* visualiser les résultats.

Il ne doit pas recréer progressivement un moteur de résolution parallèle.

## 10. Compatibilité

Les modifications de types doivent être traitées avec prudence.

Lorsqu'un ancien champ peut encore être utilisé par le code existant, une transition compatible est préférable à une suppression immédiate.

Les changements structurels doivent être réalisés par étapes.

## 11. Vérification avant checkpoint

Avant chaque checkpoint significatif :

```bash
npm run build
git status --short
git diff --stat
```

Le diff doit être inspecté avant le commit.

Un checkpoint doit correspondre à une étape fonctionnelle identifiable.

## 12. Prochaine évolution

La prochaine phase du projet peut commencer par l'enrichissement progressif du Registry.

Priorité immédiate :

```text
Briques manquantes
      ↓
Authentification
      ↓
Autres capacités nécessaires aux templates
      ↓
Nouveaux templates Rust
      ↓
Profils supplémentaires
```

Cette progression permet de conserver un Core simple tout en augmentant progressivement les capacités de génération.

## 13. Principe de maintenance

SpecForge doit rester :

* déterministe ;
* lisible ;
* modulaire ;
* testable ;
* explicable ;
* progressivement extensible.

**Ne pas construire aujourd'hui l'infrastructure nécessaire à un problème qui n'existe pas encore.**
