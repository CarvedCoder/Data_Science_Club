# DS Club Portal - Backend Deployment Guide

## 🏗️ Architecture

- **Backend**: FastAPI (Python 3.11)
- **Database**: Supabase PostgreSQL
- **Containerization**: Docker
- **Auth**: Custom JWT-based authentication

## 🚀 Quick Start

### Prerequisites

1. Docker installed
2. Supabase project created
3. Database schema initialized

### 1. Initialize Supabase Database

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and run the contents of `supabase_schema.sql`
4. Verify tables are created

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```bash
# Get from Supabase Dashboard > Settings > Database > Connection String
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Generate secure keys
SECRET_KEY=$(openssl rand -hex 32)
QR_SIGNING_SECRET=$(openssl rand -hex 32)
```

### 3. Build and Run with Docker

```bash
# Build the image
docker build -t ds-club-backend .

# Run the container
docker run -d \
  --name ds-club-backend \
  -p 8000:8000 \
  --env-file .env \
  ds-club-backend

# View logs
docker logs -f ds-club-backend

# Stop
docker stop ds-club-backend
```

### 4. Using Docker Compose

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing key (256-bit hex) |
| `QR_SIGNING_SECRET` | ✅ | QR code signing key (256-bit hex) |
| `ADMIN_EMAIL` | ✅ | Initial admin email |
| `ADMIN_PASSWORD` | ✅ | Initial admin password |
| `PORT` | ❌ | Server port (default: 8000) |
| `CORS_ORIGINS` | ❌ | Allowed origins (comma-separated) |
| `LOG_LEVEL` | ❌ | Logging level (default: INFO) |

## 🏥 Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "database": "connected"}
```

## 🚢 Deployment Platforms

### Railway

1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (first time)
fly launch

# Deploy
fly deploy

# Set secrets
fly secrets set DATABASE_URL="postgresql://..." SECRET_KEY="..."
```

### AWS ECS / Fargate

1. Push image to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account].dkr.ecr.us-east-1.amazonaws.com
docker tag ds-club-backend:latest [account].dkr.ecr.us-east-1.amazonaws.com/ds-club-backend:latest
docker push [account].dkr.ecr.us-east-1.amazonaws.com/ds-club-backend:latest
```

2. Create ECS Task Definition with environment variables
3. Create ECS Service

### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/[PROJECT-ID]/ds-club-backend

# Deploy
gcloud run deploy ds-club-backend \
  --image gcr.io/[PROJECT-ID]/ds-club-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars "DATABASE_URL=..."
```

## 🔒 Security Checklist

- [ ] `SECRET_KEY` is unique and secure (256-bit)
- [ ] `QR_SIGNING_SECRET` is different from `SECRET_KEY`
- [ ] `ADMIN_PASSWORD` is strong
- [ ] `CORS_ORIGINS` is restricted in production
- [ ] Database credentials are not committed
- [ ] HTTPS is enabled in production

## 🧹 Database Reset

To completely reset the database:

1. Go to Supabase SQL Editor
2. Run:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
3. Re-run `supabase_schema.sql`

## 📊 Monitoring

### Logs

```bash
# Docker
docker logs -f ds-club-backend

# Docker Compose
docker-compose logs -f backend
```

### Metrics

Health endpoint: `GET /health`

## 🐛 Troubleshooting

### Connection Refused

- Check `DATABASE_URL` format
- Verify Supabase project is active
- Check if IP is whitelisted (Supabase > Settings > Database)

### Authentication Errors

- Ensure `SECRET_KEY` is set correctly
- Check token expiration settings

### CORS Issues

- Add frontend origin to `CORS_ORIGINS`
- Ensure protocol (http/https) matches

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app entry
│   ├── config.py         # Settings management
│   ├── database.py       # PostgreSQL connection
│   ├── models/           # SQLAlchemy models
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth middleware
│   ├── services/         # Business logic
│   └── utils/            # Utilities
├── uploads/              # File uploads (mounted volume)
├── Dockerfile            # Container image
├── docker-compose.yml    # Local development
├── requirements.txt      # Python dependencies
├── supabase_schema.sql   # Database schema
└── .env.example          # Environment template
```
