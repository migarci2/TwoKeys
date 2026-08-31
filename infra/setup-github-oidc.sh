#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GITHUB_REPOSITORY_ID:?Set the immutable numeric GitHub repository ID}"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
GCP_REGION="${GCP_REGION:-europe-west1}"
SERVICE_NAME="${SERVICE_NAME:-twokeys}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-twokeys}"
POOL_ID="${POOL_ID:-twokeys-github}"
PROVIDER_ID="${PROVIDER_ID:-twokeys}"
DEPLOY_SERVICE_ACCOUNT_NAME="${DEPLOY_SERVICE_ACCOUNT_NAME:-twokeys-deploy}"
DEPLOY_SERVICE_ACCOUNT="${DEPLOY_SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SERVICE_ACCOUNT="twokeys-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

if [[ ! "${GITHUB_REPOSITORY_ID}" =~ ^[0-9]+$ ]]; then
  echo "GITHUB_REPOSITORY_ID must be numeric." >&2
  exit 1
fi

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com \
  --project="${GCP_PROJECT_ID}"

PROJECT_NUMBER="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
if ! owner="$(gcloud run services describe "${SERVICE_NAME}" --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" --format='value(metadata.labels.twokeys_owner)' 2>/dev/null)" || \
  [[ "${owner}" != "deploy-script" ]]; then
  echo "Run infra/deploy.sh once before configuring GitHub deployment." >&2
  exit 1
fi

gcloud artifacts repositories describe "${ARTIFACT_REPOSITORY}" \
  --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null
gcloud iam service-accounts describe "${RUNTIME_SERVICE_ACCOUNT}" \
  --project="${GCP_PROJECT_ID}" >/dev/null

if ! gcloud iam workload-identity-pools describe "${POOL_ID}" --location=global \
  --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${POOL_ID}" --location=global \
    --display-name="TwoKeys GitHub Actions" --project="${GCP_PROJECT_ID}"
fi

ATTRIBUTE_MAPPING="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository=assertion.repository,attribute.ref=assertion.ref"
ATTRIBUTE_CONDITION="assertion.repository_id == '${GITHUB_REPOSITORY_ID}' && assertion.ref == 'refs/heads/${DEPLOY_BRANCH}'"
if gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --workload-identity-pool="${POOL_ID}" --location=global \
  --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "${PROVIDER_ID}" \
    --workload-identity-pool="${POOL_ID}" --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com/" \
    --attribute-mapping="${ATTRIBUTE_MAPPING}" \
    --attribute-condition="${ATTRIBUTE_CONDITION}" \
    --project="${GCP_PROJECT_ID}"
else
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --workload-identity-pool="${POOL_ID}" --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com/" \
    --attribute-mapping="${ATTRIBUTE_MAPPING}" \
    --attribute-condition="${ATTRIBUTE_CONDITION}" \
    --project="${GCP_PROJECT_ID}"
fi

if ! gcloud iam service-accounts describe "${DEPLOY_SERVICE_ACCOUNT}" \
  --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${DEPLOY_SERVICE_ACCOUNT_NAME}" \
    --display-name="TwoKeys GitHub deployer" --project="${GCP_PROJECT_ID}"
fi

gcloud artifacts repositories add-iam-policy-binding "${ARTIFACT_REPOSITORY}" \
  --location="${GCP_REGION}" --member="serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role=roles/artifactregistry.writer --project="${GCP_PROJECT_ID}" >/dev/null

gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --region="${GCP_REGION}" --member="serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role=roles/run.developer --project="${GCP_PROJECT_ID}" >/dev/null

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role=roles/serviceusage.serviceUsageConsumer --condition=None >/dev/null

gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SERVICE_ACCOUNT}" \
  --member="serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role=roles/iam.serviceAccountUser \
  --project="${GCP_PROJECT_ID}" >/dev/null

gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SERVICE_ACCOUNT}" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository_id/${GITHUB_REPOSITORY_ID}" \
  --role=roles/iam.workloadIdentityUser \
  --project="${GCP_PROJECT_ID}" >/dev/null

echo "Set these GitHub Actions repository variables:"
echo "GCP_PROJECT_ID=${GCP_PROJECT_ID}"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
echo "GCP_DEPLOY_SERVICE_ACCOUNT=${DEPLOY_SERVICE_ACCOUNT}"
