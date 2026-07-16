# Deploying GamersUnite

Production: **https://gamersunite.us** on a home Kubernetes cluster.

Pipeline: push to `main` → GitHub Actions builds the image and publishes
`ghcr.io/kyle678/gamersunite:latest` (plus a `sha-<commit>` tag for rollbacks)
→ the workflow POSTs to your Keel webhook → Keel force-recreates the pod,
which pulls the fresh `:latest`.

The container runs Next.js 15 (`next start`, port 3000) with SQLite on a
PersistentVolumeClaim, exposed via NodePort **30080**. On boot it runs
`prisma db push` and seeds the game catalog only if the database is empty.

## One-time setup

### GitHub

1. Add the Keel webhook URL as a repo secret (the "Notify Keel" step skips
   silently if unset):

   ```sh
   gh secret set KEEL_WEBHOOK_URL --body "https://<your-keel-host>/v1/webhooks/native"
   ```

   If your Keel endpoint uses basic auth, embed it:
   `https://user:pass@<host>/v1/webhooks/native`.

2. After the first workflow run creates the package, make it pullable by the
   cluster — either set the `gamersunite` package to **public**
   (github.com/kyle678?tab=packages → package → Package settings → Change
   visibility), or keep it private and create the `ghcr-pull` secret +
   uncomment `imagePullSecrets` in `k8s/deployment.yaml`.

### Discord

Developer portal → app `1525078189830045716` → OAuth2 → Redirects → add
`https://gamersunite.us/api/auth/discord/callback` (keep localhost for dev).

### Cluster

Copy `.env.production` to the server privately (it holds the bot token and
OAuth secret; it is gitignored and must never be committed), then:

```sh
kubectl create secret generic gamersunite-env --from-env-file=.env.production
kubectl apply -f k8s/
kubectl rollout status deploy/gamersunite
kubectl logs deploy/gamersunite   # expect: schema sync, "Empty database - seeding...", Next.js ready
curl -I http://localhost:30080    # expect 200
```

`DATABASE_URL` in the secret is ignored — the Deployment pins it to
`file:/data/gamersunite.db` on the persistent volume.

Keel: the Deployment carries `keel.sh/policy: force` + `keel.sh/match-tag: "true"`
labels, so the native webhook (`{"name": "ghcr.io/kyle678/gamersunite",
"tag": "latest"}`) triggers the update. Make sure Keel's native webhook
receiver is enabled and reachable at the URL you stored in the secret.

### Cloudflare

Route gamersunite.us to `<node-ip>:30080`. TLS terminates at Cloudflare; the
app serves plain HTTP. Session cookies are `secure`, so the site must be
reached over HTTPS. Verify end-to-end by logging in with Discord on the live
domain.

## Everyday deploys

```sh
git push        # that's it - Actions builds, publishes, and pings Keel
```

Watch it: `gh run watch`, then `kubectl get pods -w` on the server.

## Day-2 operations

```sh
# Roll back to a previous commit's image:
kubectl set image deploy/gamersunite web=ghcr.io/kyle678/gamersunite:sha-<full-commit-sha>
# (roll forward again by re-setting :latest)

# Re-seed the game catalog after editing prisma/seed.ts or adding covers
# (WARNING: prunes games whose slug isn't in the seed list):
kubectl exec deploy/gamersunite -- npx tsx prisma/seed.ts

# Back up the database:
kubectl cp $(kubectl get pod -l app=gamersunite -o name | cut -d/ -f2):/data/gamersunite.db ./backup-$(date +%F).db

# Changed .env.production? Recreate the secret and restart:
kubectl delete secret gamersunite-env
kubectl create secret generic gamersunite-env --from-env-file=.env.production
kubectl rollout restart deploy/gamersunite
```

## Notes / constraints

- **Keep `replicas: 1`.** SQLite + the in-process voice-channel sweeper
  (`instrumentation.ts`) assume a single instance; the `Recreate` strategy
  prevents two pods from ever sharing the DB file.
- The NodePort is fixed at **30080** (change in `k8s/service.yaml` if it
  collides with something on your cluster).
- Demo users (PixelPenny etc.) seeded on first run are data-only — password
  login/signup endpoints return 410, auth is Discord-only.
