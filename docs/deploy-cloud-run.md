# Deploy API To Cloud Run

## 1. Configure Environment

```bash
cd api
cp ../.env.example .env
```

Set:

```bash
STORE_MODE=elastic
GEMINI_API_KEY=...
ELASTICSEARCH_NODE=...
ELASTICSEARCH_API_KEY=...
ELASTIC_INDEX_PREFIX=memory
```

## 2. Build And Deploy

```bash
gcloud run deploy memory-dock-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars STORE_MODE=elastic,ELASTICSEARCH_NODE="$ELASTICSEARCH_NODE",ELASTICSEARCH_API_KEY="$ELASTICSEARCH_API_KEY",GEMINI_API_KEY="$GEMINI_API_KEY",ELASTIC_INDEX_PREFIX=memory
```

## 3. Verify

```bash
curl https://YOUR_CLOUD_RUN_URL/health
```

Use the Cloud Run URL in the macOS app Settings tab.

