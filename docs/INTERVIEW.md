# Interview Guide — BioSDK

## Résumé des choix de conception (15 lignes)

1. **Monorepo pnpm workspaces** — partage des types (`@bio-sdk/protocol`) sans dépendance circulaire ni publication intermédiaire.
2. **Zero runtime deps dans le SDK** — taille gzip < 2 kB, aucune supply chain attack possible sur les types partagés.
3. **`sendBeacon` first, `fetch` fallback** — `sendBeacon` est garanti de passer à la fermeture de page et n'est pas limité par les politiques de CORS de la même façon.
4. **Retry avec backoff exponentiel + jitter** — le jitter empêche l'effet de troupeau (thundering herd) si 1000 clients perdent le réseau simultanément.
5. **Buffer borné avec éviction FIFO** — protection mémoire explicite sur les appareils bas de gamme (32 MB tab limit).
6. **Tous les listeners en `passive: true`** — garantit zéro impact sur le fil principal, scroll ou input, quelle que soit la charge.
7. **Throttle mousemove à 50 ms (20 Hz)** — réduit le volume de 3× vs 60 Hz sans perte de signal comportemental (les patterns humains sont < 10 Hz).
8. **TypeScript strict-maximal** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` détectent les bugs à la compilation, pas en production.
9. **`findPrivacyLeak()` dans le protocole** — fonction testable qui scanne un payload JSON et prouve l'absence de `key`, `code`, `value`, etc.
10. **Fastify + pino** — ~3× plus rapide qu'Express, logs JSON structurés, validation Zod native sur les routes.
11. **SSE pour le live dashboard** — zéro latence, sans WebSocket, compatible CDN, se reconnecte automatiquement.
12. **Human score = heuristique démontrable** — 4 signaux (variance trajectoire, irrégularité frappe, micro-pauses, variance vitesse) explicables en entretien.
13. **tsup pour le build** — wrappeur esbuild qui produit ESM + CJS + `.d.ts` en une commande, avec tree-shaking.
14. **CI matrice Node 20/22** — détecte les régressions d'API Node, important pour un SDK embarqué dans des environnements variés.
15. **Singleton module-level** — garantit une seule instance par page, idempotence, et évite les doublons de listeners.

---

## 10 questions probables en entretien

### 1. Pourquoi un singleton et pas une classe exportée ?

**Piste :** Un SDK embarqué n'a qu'une instance par page. Le singleton rend `init()` naturellement idempotent et évite les `new BioSDK()` multiples qui doubleraient les listeners. L'inconvénient : non testable sans `_resetForTesting()`. On accepte ce compromis car c'est un SDK de page web, pas une librairie Node multi-instances.

### 2. Comment prouvez-vous que vous ne capturez jamais les vraies touches clavier ?

**Piste :** `_onKey` reçoit un `KeyboardEvent` mais le paramètre est intentionnellement nommé `_e` (underscore = inutilisé). TypeScript strict interdit d'y accéder sans le nommer. De plus, `findPrivacyLeak()` dans `@bio-sdk/protocol` est appelé dans les tests de non-régression. Un test automatisé vérifie que `"key":` n'apparaît jamais dans aucun payload sérialisé.

### 3. Que se passe-t-il si le réseau est indisponible pendant 30 secondes ?

**Piste :** Le buffer borné (`maxBufferSize`, défaut 1000) accumule les événements en mémoire. Quand la connexion revient, le flush de l'intervalle envoie les lots en file. Les retries utilisent un backoff exponentiel avec jitter pour éviter la saturation du serveur. Si le buffer est plein, les événements les plus anciens sont évincés (FIFO drop) — on sacrifie la fraîcheur pour protéger la mémoire.

### 4. Pourquoi `sendBeacon` peut-il retourner `false` et que faites-vous dans ce cas ?

**Piste :** `sendBeacon` retourne `false` quand le quota du browser est dépassé (chaque onglet a ~64 kB de quota beacon en attente). Dans ce cas on bascule vers `fetch` avec `keepalive: true`, qui permet à la requête de survivre à la fermeture de page dans les browsers modernes (Chrome 66+, Safari 17+). Firefox ne supporte pas `keepalive` — c'est une limitation documentée.

### 5. Comment le throttling de `mousemove` affecte-t-il la précision des signaux comportementaux ?

**Piste :** Les patterns comportementaux humains (trajectoire, vitesse) ont des fréquences < 10 Hz. Throttler à 20 Hz (50 ms) conserve tout le signal pertinent et coupe 2/3 du volume. Un vrai système de production calibrerait ce paramètre par type de device (mobile vs desktop) et par use case (détection de bot temps réel vs analyse post-session).

### 6. Comment garantissez-vous que le SDK ne casse jamais la page hôte ?

**Piste :** Deux mécanismes : (1) `resolveConfig` lance une `ConfigValidationError` synchrone **avant** d'attacher un seul listener — l'erreur est visible, pas silencieuse ; (2) tout ce qui vient après (`_push`, `_flush`, `sendBatch`) est enveloppé en try/catch et ne propage jamais rien vers l'extérieur. Les listeners sont tous `passive: true` donc ils ne peuvent pas bloquer le scroll ou l'input même en cas de bug interne.

### 7. Quelle est la surface d'attaque du SDK du point de vue sécurité ?

**Piste :** L'endpoint reçoit des données non-chiffrées en transit (HTTPS recommandé). Le SDK ne lit pas le DOM, ne lit pas les cookies, ne fait pas d'XHR cross-origin avec credentials. Le seul vecteur est un endpoint malicieux qui renverrait des redirections infinies — mitigé par le `MAX_RETRIES = 3`. En production on ajouterait une validation de l'origin côté serveur.

### 8. Comment l'architechture SSE du serveur passe-t-elle à l'échelle ?

**Piste :** SSE maintient une connexion TCP longue par client — à 1000 clients simultanés, Node.js gère bien (event loop non bloquant). Au-delà, on remplacerait le `Set<FastifyReply>` par un bus de messages (Redis Pub/Sub) et plusieurs instances de serveur derrière un load balancer. Pour ce projet démo, la limite est celle des descripteurs de fichiers système (~65 000 sur Linux).

### 9. Pourquoi avoir séparé `@bio-sdk/protocol` en package indépendant ?

**Piste :** Le schéma Zod est la source de vérité partagée entre SDK (runtime) et serveur (validation). Si on l'inlinait dans chacun, une modification du schéma casse le contrat sans que la CI le détecte. Avec un package partagé, un `breaking change` dans `@bio-sdk/protocol` force une mise à jour des deux consommateurs et est visible dans le diff de PR.

### 10. Quelles métriques utiliseriez-vous en production pour surveiller le SDK ?

**Piste :** (1) Taux de succès `sendBeacon` vs fallback fetch (haut → pas de problème ; bas → indique des navigateurs anciens ou du trafic bot). (2) Latence P99 du `/collect` endpoint. (3) Taille moyenne des batches (si constamment à `batchSize`, le buffer se remplit trop vite). (4) Taux d'éviction (si > 0%, `maxBufferSize` ou `flushIntervalMs` trop larges). (5) Long tasks mesurées par `PerformanceObserver` avec et sans le SDK.

---

## Compromis assumés

| Décision | Compromis |
|----------|-----------|
| Singleton | Non instanciable en multi-tenancy, `_resetForTesting()` exposé |
| Zero deps SDK | Pas de validation de config avec Zod côté SDK (fait à la main) |
| `sendBeacon` + jitter | Pas de garantie d'ordre des lots |
| Buffer FIFO eviction | Perte des événements les plus anciens sous charge |
| Human score heuristique | Non calibré, taux de faux positifs/négatifs inconnus |
| SSE in-memory | État perdu au redémarrage serveur |
