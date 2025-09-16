# Plan de refactorisation du premier test e2e

## Objectif
Refactorer le test e2e "GET /api/orders" pour respecter les règles de structure et d’organisation définies.

---

## Étapes

### 1. Préparation de l’environnement de test
- Créer un nouveau fichier de test ou dupliquer le test existant pour travailler proprement.
- Importer les dépendances nécessaires (`INestApplication`, `TestingModule`, `request`, `AppModule`, `GlobalFixtures`, etc.).

### 2. Structuration du describe
- Créer un `describe` dédié à l’endpoint `GET /api/orders`.
- Initialiser `app` et `fixtures` dans le scope du describe.

### 3. Gestion du cycle de vie des tests
- Utiliser `beforeAll` pour initialiser l’application et les fixtures.
- Utiliser `beforeEach` pour nettoyer les données via `fixtures.clear()`.
- Utiliser `afterAll` pour nettoyer et fermer l’application.

### 4. Refactorisation du test
- Créer une méthode spécifique dans `GlobalFixtures` pour préparer les données nécessaires à ce test (ex: `createOrdersListFixture()`).
- Dans le test, séparer clairement les parties :
    - **ARRANGE** : Appeler la méthode de fixture pour préparer les données.
    - **ACT** : Faire l’appel HTTP à `/api/orders`.
    - **ASSERT** : Vérifier le résultat dans une fonction fléchée passée à `.expect()`.

### 5. Respect de la structure imposée
- S’assurer que chaque partie (ARRANGE, ACT, ASSERT) est bien visible et séparée dans le test.
- Ne pas mutualiser l’ACT ou l’ASSERT en dehors du test.

### 6. Migration d’un seul endpoint
- Appliquer cette refactorisation uniquement au test du endpoint `GET /api/orders` pour commencer.

---

## Exemple de structure attendue

```typescript
describe("endpoint GET /api/orders", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

  beforeAll(async () => {
    // ...initialisation app et fixtures...
  });

  beforeEach(async () => await fixtures.clear());

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  it("should return all orders", async () => {
    // ARRANGE
    const orders = await fixtures.createOrdersListFixture();

    // ACT
    return request(app.getHttpServer())
      .get("/api/orders")
      .expect(200)
      .expect((res) => {
        // ASSERT
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(orders.length);
        // ...autres vérifications...
      });
  });
});
