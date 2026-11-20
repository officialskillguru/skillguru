# Resume PDF worker (Google Cloud Run)

This is an isolated LaTeX-to-PDF compiler for the AI Resume Builder. **It has not been deployed yet, and no templates are registered.**

The `resume-pdf` Supabase Edge Function calls it with an HMAC-signed `POST /compile { requestId, templateId, resumeData }`. The worker then:

1. Verifies the HMAC signature (shared secret, 5-minute replay window).
2. Loads the approved template from the image (`resume-templates/`), but only if it is `active`.
3. Validates `resumeData` with the app's own Zod schema and builds a fully escaped view model.
4. Rejects characters the engine can't typeset (e.g. Devanagari in a pdfLaTeX template) with `UNSUPPORTED_CHARACTERS`.
5. Renders the `<< >>` template; there is no raw-insertion path.
6. Compiles the template in a sandboxed temp directory: `-no-shell-escape`, TeX `openin/openout_any=p`, wall-clock timeout plus `prlimit` (CPU, memory, file size), and the temp directory is always deleted.
7. Validates the PDF: `%PDF-` header, size, page count, and `pdftotext` must contain the student's key details.
8. Returns `application/pdf`, or a JSON `{ code }`. TeX logs go to Cloud Logging only.

The Edge Function stores the PDF in the private `student-resumes` bucket and records a version.

## Local

Root `npm test` already runs the worker's unit tests. The compile test reports `ENGINE_MISSING` when no TeX is installed.

```bash
docker build -f services/resume-pdf-worker/Dockerfile -t resume-pdf-worker .   # from repo root
docker run --rm -p 8080:8080 -e RESUME_PDF_WORKER_SECRET=<32+ chars> resume-pdf-worker
curl localhost:8080/healthz
```

## Deploying to Cloud Run (requires approval: this creates billable resources)

```bash
PROJECT=<gcp-project> REGION=asia-south1
gcloud artifacts repositories create resume --repository-format=docker --location=$REGION
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT/resume/resume-pdf-worker:1 \
  --config=<(echo '{"steps":[{"name":"gcr.io/cloud-builders/docker","args":["build","-f","services/resume-pdf-worker/Dockerfile","-t","'$REGION'-docker.pkg.dev/'$PROJECT'/resume/resume-pdf-worker:1","."]}],"images":["'$REGION'-docker.pkg.dev/'$PROJECT'/resume/resume-pdf-worker:1"]}')
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create resume-pdf-worker-secret --data-file=-
gcloud run deploy resume-pdf-worker \
  --image $REGION-docker.pkg.dev/$PROJECT/resume/resume-pdf-worker:1 --region $REGION \
  --concurrency 1 --cpu 1 --memory 1Gi --timeout 60 --max-instances 5 --min-instances 0 \
  --set-secrets RESUME_PDF_WORKER_SECRET=resume-pdf-worker-secret:latest \
  --ingress all --allow-unauthenticated   # request auth = HMAC; see "Hardening" below
```

Then set the Supabase secrets (same secret value):

```bash
supabase secrets set RESUME_PDF_WORKER_URL=https://resume-pdf-worker-xxxx.a.run.app RESUME_PDF_WORKER_SECRET=<same value>
```

### Hardening options

- **No outbound network**: the worker needs none. Attach a Serverless VPC connector with `--vpc-egress=all-traffic` and no Cloud NAT, so compilations cannot reach the internet.
- **IAM in front of HMAC**: deploy with `--no-allow-unauthenticated`. The Edge Function would then also need to send a Google-signed ID token. That needs a service-account key in Supabase secrets, which is not implemented yet; the HMAC signature is the authentication in place today. `RESUME_PDF_WORKER_AUDIENCE` is reserved for that.
- **Max instances**: keep `--max-instances` low to cap cost. `--concurrency 1` keeps one compilation per instance.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `RESUME_PDF_WORKER_SECRET` | (required, ≥32 chars) | HMAC key shared with the Edge Function; refuses to start without it |
| `RESUME_TEMPLATES_DIR` | `/app/resume-templates` | approved templates baked into the image |
| `RESUME_COMPILE_TIMEOUT_MS` | `20000` | wall-clock compile limit |
| `RESUME_MAX_PAGES` | `4` | PDFs longer than this are rejected |
| `RESUME_WORKER_ALLOW_TESTING` | unset | `1` also allows `status: "testing"` templates (QA only) |
