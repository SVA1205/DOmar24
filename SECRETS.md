# GCP CI/CD Setup Guide

This guide provides the exact steps to generate the three secrets required for the GitHub Actions deployment pipeline (`GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT`, and `GCP_WORKLOAD_IDENTITY_PROVIDER`).

---

## Prerequisites
1.  **Google Cloud Project**: You must have an active GCP project.
2.  **gcloud SDK**: Installed and authenticated (`gcloud auth login`).
3.  **Project ID**: Replace `YOUR_PROJECT_ID` in the commands below with your actual Project ID.

---

## Step 1: Initial Variables
Set these variables in your terminal to make the following commands copy-pasteable:
```bash
export GCP_PROJECT_ID="YOUR_PROJECT_ID"
export GITHUB_REPO="YOUR_USERNAME/YOUR_REPO" # e.g., firdousali86/DOmar24
```

---

## Step 2: Create a Service Account
This identity will perform the deployments.
```bash
# Create the service account
gcloud iam service-accounts create github-deployer \
    --project="${GCP_PROJECT_ID}" \
    --display-name="GitHub Actions Deployer"

# Assign necessary roles
for ROLE in "roles/run.admin" "roles/artifactregistry.admin" "roles/iam.serviceAccountUser" "roles/secretmanager.secretAccessor"; do
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
      --member="serviceAccount:github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
      --role="${ROLE}"
done
```
**Value for GitHub Secret (`GCP_SERVICE_ACCOUNT`):**
`github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com`

---

## Step 3: Setup Workload Identity Federation
This allows GitHub to securely connect to GCP without using sensitive JSON keys.

### 1. Create the Pool
```bash
gcloud iam workload-identity-pools create "github-pool" \
    --project="${GCP_PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"
```

### 2. Create the Provider (with security condition)
```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --project="${GCP_PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="attribute.repository == '${GITHUB_REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com"
```

### 3. Grant the Pool access to the Service Account
You need your **Project Number** for this step.
```bash
# Get your project number
export PROJECT_NUMBER=$(gcloud projects describe "${GCP_PROJECT_ID}" --format="value(projectNumber)")

# Link the provider to the service account
gcloud iam service-accounts add-iam-policy-binding "github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --project="${GCP_PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"
```

---

## Step 4: Collect your GitHub Secrets

Run these commands to get the final values to paste into **GitHub > Settings > Secrets and variables > Actions**:

1.  **`GCP_PROJECT_ID`**:
    ```bash
    echo ${GCP_PROJECT_ID}
    ```
2.  **`GCP_SERVICE_ACCOUNT`**:
    ```bash
    echo "github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
    ```
3.  **`GCP_WORKLOAD_IDENTITY_PROVIDER`**:
    ```bash
    gcloud iam workload-identity-pools providers describe "github-provider" \
        --project="${GCP_PROJECT_ID}" \
        --location="global" \
        --workload-identity-pool="github-pool" \
        --format="value(name)"
    ```
