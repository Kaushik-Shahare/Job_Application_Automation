# Job Application Automation — Setup Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local script testing)
- Python 3.9+ (for resume manager)
- n8n account or self-hosted instance
- Apify account (for LinkedIn scraping)
- Azure OpenAI API access

---

## 1. Start Services

```bash
cd /Users/kaushik/Projects/n8n/job-application-automation
docker compose up -d
```

This starts:
- **n8n** on `http://localhost:5678`
- **latex** container (stays alive for `docker exec` calls)

## 2. Configure n8n Credentials

Open `http://localhost:5678` and add:

### Apify API
- Go to **Settings → Credentials → Add Credential**
- Type: `Apify API`
- API Token: your Apify token from [console.apify.com](https://console.apify.com/account/integrations)

### Azure OpenAI API
- Go to **Settings → Credentials → Add Credential**
- Type: `Azure OpenAI API`
- API Key: your `AZURE_OPENAI_API_KEY`
- Resource Name: `ai-storyloomsolutions6867ai941196547896`
- API Version: `2024-02-15-preview`
- Deployment Name: `gpt-4o`

> [!IMPORTANT]
> After adding credentials, you must update the credential IDs in the workflow JSON, or re-link them in the n8n UI after importing.

## 3. Import Workflow

1. Open n8n UI → **Workflows → Import from File**
2. Select `Job Application Automation.json`
3. Re-link the `Azure OpenAI Chat Model` node to your Azure credential
4. Re-link the `Scrape Jobs from Linkedin` node to your Apify credential

## 4. Customize Job Search

Edit the **Linkedin Jobs URL** node to change:
- `keywords=SDE` → your desired job title
- `location=Mumbai` → your target city
- `f_E=1%2C2` → experience levels (1=Intern, 2=Entry)
- `f_TPR=r604800` → time range (r604800 = past week)

## 5. Run the Workflow

1. Click **Execute workflow** in n8n
2. The pipeline will:
   - Scrape LinkedIn jobs via Apify
   - Score each job using Azure OpenAI
   - Generate tailored resumes for good fits (score ≥ 6)
   - Compile PDFs via Docker LaTeX
   - Queue jobs for application

## 6. Review Results

- **Resumes**: `latex/generated/` (versioned PDFs)
- **Send-ready**: `latex/sent/Kaushik-Shahare.pdf`
- **Job Queue**: `data/job_queue.json`
- **Resume Index**: `metadata/resume_index.json`

---

## Resume Management CLI

```bash
cd scripts/

# Generate a new resume code
python resume_manager.py generate "Software Engineer" "Mumbai"

# Store a resume entry
python resume_manager.py store CODE TITLE_CODE LOC_CODE "Job Title" "Location" "Company"

# Copy to Kaushik-Shahare.pdf for sending
python resume_manager.py send CODE

# Search resumes
python resume_manager.py search "Django"

# List all resumes
python resume_manager.py list
```

---

## OpenClaw + Claude Code Setup (Overnight Automation)

### Install OpenClaw
```bash
# Install globally
npm install -g openclaw

# Or use npx
npx openclaw init
```

### Configure
1. Copy `config/openclaw_config.json` to OpenClaw's config directory
2. Set your Claude Code API key
3. Configure rate limits (recommended: 5 applications/hour)

### Run Overnight
```bash
# Start the application agent
openclaw apply --config config/openclaw_config.json --queue data/job_queue.json

# Or with ClawdCursor
clawdcursor start --resume latex/sent/Kaushik-Shahare.pdf --queue data/job_queue.json
```

> [!WARNING]
> LinkedIn may flag accounts for automated Easy Apply at scale. Run with rate limiting and review the queue before unattended runs.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| LaTeX compilation fails | Run `docker compose up -d latex` to restart container |
| n8n can't find files | Check volume mounts in `docker-compose.yml` |
| Azure OpenAI 401 | Re-check API key and endpoint in n8n credentials |
| Apify timeout | Reduce `count` in scraper config or increase timeout |
| PDF not in sent/ | Run `python scripts/resume_manager.py send CODE` |
