---
mode: agent
---

# Refactoring des fixtures E2E pour découpler les tests

## Contexte

J'ai actuellement des tests E2E qui utilisent un fichier `global-fixtures.ts` partagé, ce qui crée un couplage fort entre mes tests et peut causer des effets de bord. Je veux découpler ces tests en créant des fixtures spécifiques par domaine.

## Objectif

Refactorer l'architecture des fixtures pour que chaque suite de tests E2E ait ses propres fixtures isolées.

## Étapes à réaliser

### 1. Analyser l'existant

- Examiner le fichier `global-fixtures.ts` pour comprendre les données créées
- Identifier les différents domaines métier (order, loyalty, etc.)
- Lister les dépendances entre les entités (Customer, Product, Order)

### 2. Créer des fixtures spécifiques par domaine

Pour chaque domaine identifié, créer un fichier de fixtures dédié :

- `test/fixtures/order-fixtures.ts`
- `test/fixtures/loyalty-fixtures.ts`
- etc.

Chaque classe de fixtures doit :

- Avoir un constructeur qui prend `INestApplication` en paramètre
- Avoir une méthode `createTestScenario()` qui retourne les données nécessaires pour ce domaine
- Avoir une méthode `cleanup()` pour nettoyer les données
- Créer uniquement les données minimales nécessaires pour les tests de ce domaine
- Éviter les références aux autres domaines

### 3. Refactorer les tests E2E

Pour chaque fichier de test E2E :

- Remplacer l'import de `GlobalFixtures` par la fixture spécifique
- Modifier le `beforeAll()` pour instancier la fixture appropriée
- Ajouter un `beforeEach()` qui appelle `cleanup()` pour isoler chaque test
- Adapter les tests pour utiliser les données retournées par `createTestScenario()`

### 4. Règles à respecter

- Chaque fixture doit être complètement indépendante
- Les données créées doivent être cohérentes avec le domaine testé
- Utiliser des noms explicites pour les données de test (ex: "Loyal Customer", "Order Test Customer")
- Nettoyer les données dans l'ordre inverse des dépendances FK
- Ne pas réutiliser de données entre les tests d'une même suite

### 5. Structure attendue

```
test/
├── fixtures/
│   ├── order-fixtures.ts
│   ├── loyalty-fixtures.ts
│   └── [other-domain]-fixtures.ts
├── order/
│   └── order.e2e-spec.ts (refactoré)
├── loyalty/
│   └── loyalty.e2e-spec.ts (refactoré)
└── [other-domains]/
```

### 6. Validation

- Vérifier que tous les tests passent individuellement
- Vérifier que les tests passent quand ils sont exécutés ensemble
- Confirmer qu'il n'y a plus d'effets de bord entre les tests
- S'assurer que les fixtures sont bien nettoyées après chaque test

## Contraintes techniques

- Utiliser TypeScript
- Framework NestJS avec TypeORM
- Entités : Customer, Product, Order
- Base de données PostgreSQL pour les tests
- Respecter les contraintes de clés étrangères lors du nettoyage

## Résultat attendu

Après refactoring, chaque suite de tests E2E doit être complètement isolée, avec ses propres fixtures qui créent uniquement les données nécessaires pour ce domaine spécifique.
