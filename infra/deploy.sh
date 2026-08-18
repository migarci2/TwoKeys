#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID to a billing-enabled project}"
: "${GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH:?Capture and set the approved Google Ads snapshot hash}"

GCP_REGION="${GCP_REGION:-europe-west1}"
FIRESTORE_LOCATION="${FIRESTORE_LOCATION:-eur3}"
SERVICE_NAME="${SERVICE_NAME:-twokeys}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-twokeys}"
RUNTIME_SERVICE_ACCOUNT="twokeys-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/web:$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET_IDS=(
  twokeys-session-secret
  twokeys-finance-access-code
  twokeys-ceo-access-code
  twokeys-gemini-api-key
  twokeys-google-ads-developer-token
  twokeys-google-ads-client-id
  twokeys-google-ads-client-secret
  twokeys-google-ads-refresh-token
  twokeys-google-ads-customer-id
  twokeys-google-ads-campaign-id
  twokeys-google-ads-login-customer-id
)

if [[ ! "${GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH}" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  echo "GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH must be a SHA-256 digest." >&2
  exit 1
fi

if [[ "$(gcloud beta billing projects describe "${GCP_PROJECT_ID}" --format='value(billingEnabled)')" != "True" ]]; then
  echo "Project ${GCP_PROJECT_ID} does not have billing enabled." >&2
  exit 1
fi

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  generativelanguage.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  --project="${GCP_PROJECT_ID}"

if existing_owner="$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" \
  --format='value(metadata.labels.twokeys_owner)' 2>/dev/null)"; then
  if [[ "${existing_owner}" != "deploy-script" ]]; then
    echo "Refusing to replace existing unowned Cloud Run service: ${SERVICE_NAME}" >&2
    exit 1
  fi
fi

for secret in "${SECRET_IDS[@]}"; do
  if ! gcloud secrets versions describe latest --secret="${secret}" \
    --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
    echo "Missing Secret Manager version: ${secret}" >&2
    exit 1
  fi
done

if repository_format="$(gcloud artifacts repositories describe "${ARTIFACT_REPOSITORY}" \
  --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" \
  --format='value(format)' 2>/dev/null)"; then
  if [[ "${repository_format}" != "DOCKER" ]]; then
    echo "Artifact Registry repository ${ARTIFACT_REPOSITORY} is not a Docker repository." >&2
    exit 1
  fi
else
  gcloud artifacts repositories create "${ARTIFACT_REPOSITORY}" \
    --repository-format=docker --location="${GCP_REGION}" \
    --description="TwoKeys Cloud Run images" --project="${GCP_PROJECT_ID}"
fi

if ! gcloud iam service-accounts describe "${RUNTIME_SERVICE_ACCOUNT}" \
  --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create twokeys-runtime \
    --display-name="TwoKeys Cloud Run runtime" --project="${GCP_PROJECT_ID}"
fi

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
  --role=roles/datastore.user --condition=None >/dev/null

if database_info="$(gcloud firestore databases describe --database='(default)' \
  --project="${GCP_PROJECT_ID}" \
  --format='value(type,locationId,deleteProtectionState)' 2>/dev/null)"; then
  read -r database_type database_location delete_protection <<<"${database_info}"
  if [[ "${database_type}" != "FIRESTORE_NATIVE" || "${database_location}" != "${FIRESTORE_LOCATION}" ]]; then
    echo "Existing Firestore database must be FIRESTORE_NATIVE in ${FIRESTORE_LOCATION}." >&2
    exit 1
  fi
  if [[ "${delete_protection}" != "DELETE_PROTECTION_ENABLED" ]]; then
    gcloud firestore databases update --database='(default)' --delete-protection \
      --project="${GCP_PROJECT_ID}"
  fi
else
  gcloud firestore databases create --database='(default)' \
    --location="${FIRESTORE_LOCATION}" --type=firestore-native \
    --delete-protection --project="${GCP_PROJECT_ID}"
fi

for secret in "${SECRET_IDS[@]}"; do
  gcloud secrets add-iam-policy-binding "${secret}" \
    --member="serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
    --role=roles/secretmanager.secretAccessor \
    --condition=None \
    --project="${GCP_PROJECT_ID}" >/dev/null
done

BUILD_SERVICE_ACCOUNT="$(gcloud builds get-default-service-account --project="${GCP_PROJECT_ID}")"
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role=roles/artifactregistry.writer --condition=None >/dev/null

gcloud builds submit "${ROOT_DIR}/web" --tag="${IMAGE}" --project="${GCP_PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}" \
  --region="${GCP_REGION}" \
  --labels="app=twokeys,twokeys_owner=deploy-script" \
  --service-account="${RUNTIME_SERVICE_ACCOUNT}" \
  --allow-unauthenticated \
  --cpu=1 --memory=512Mi --concurrency=20 --min-instances=0 --max-instances=3 \
  --set-env-vars="STATE_BACKEND=firestore,EXECUTOR_MODE=google_ads,FIRESTORE_DATABASE_ID=(default),GEMINI_MODEL=gemini-3.7-flash,GOOGLE_ADS_API_VERSION=v25,GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH=${GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH}" \
  --set-secrets="SESSION_SECRET=twokeys-session-secret:latest,FINANCE_ACCESS_CODE=twokeys-finance-access-code:latest,CEO_ACCESS_CODE=twokeys-ceo-access-code:latest,GEMINI_API_KEY=twokeys-gemini-api-key:latest,GOOGLE_ADS_DEVELOPER_TOKEN=twokeys-google-ads-developer-token:latest,GOOGLE_ADS_CLIENT_ID=twokeys-google-ads-client-id:latest,GOOGLE_ADS_CLIENT_SECRET=twokeys-google-ads-client-secret:latest,GOOGLE_ADS_REFRESH_TOKEN=twokeys-google-ads-refresh-token:latest,GOOGLE_ADS_CUSTOMER_ID=twokeys-google-ads-customer-id:latest,GOOGLE_ADS_CAMPAIGN_ID=twokeys-google-ads-campaign-id:latest,GOOGLE_ADS_LOGIN_CUSTOMER_ID=twokeys-google-ads-login-customer-id:latest" \
  --project="${GCP_PROJECT_ID}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" --format='value(status.url)')"
gcloud run services update "${SERVICE_NAME}" --region="${GCP_REGION}" \
  --update-env-vars="APP_ORIGIN=${SERVICE_URL}" --project="${GCP_PROJECT_ID}" >/dev/null

curl --fail --silent --show-error "${SERVICE_URL}/api/health"
echo
echo "TwoKeys deployed: ${SERVICE_URL}/demo"
