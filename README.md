# Data Science Club Portal

A modern, production-grade web application for managing Data Science Club activities with QR-based attendance, event management, and member administration.

## Features

### 🔐 Authentication
- Separate login for members and admins
- Signup with admin approval required
- JWT-based authentication
- Role-based access control

### 👥 Member Features
- Dashboard with attendance stats
- Event calendar with attendance status
- QR code scanning for attendance
- View study materials and resources
- Personal profile and statistics

### 🛠️ Admin Features
- Comprehensive admin dashboard
- Create and manage events
- Start/stop QR attendance sessions
- Approve/reject member registrations
- View member statistics and attendance records
- Activate/deactivate members
- Remove members from the system

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **SQLite** - Database (can be swapped for PostgreSQL)
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **React Router** - Navigation

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file (already provided) with:
```
DATABASE_URL=sqlite:///./ds_club.db
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ADMIN_EMAIL=admin@dsclub.com
ADMIN_PASSWORD=Admin@123
```

5. Run the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Default Admin Credentials

```
Email: admin@dsclub.com
Password: Admin@123
```

**IMPORTANT:** Change these credentials in production!

## Project Structure

```
ds-club-portal/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth middleware
│   │   ├── utils/           # Helper functions
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database setup
│   │   └── main.py          # FastAPI app
│   ├── uploads/             # Uploaded files
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/      # React components
    │   │   ├── auth/        # Login/Signup
    │   │   ├── common/      # Reusable components
    │   │   ├── member/      # Member pages
    │   │   └── admin/       # Admin pages
    │   ├── contexts/        # React context
    │   ├── services/        # API services
    │   ├── App.jsx          # Main app component
    │   └── main.jsx         # Entry point
    ├── package.json
    └── vite.config.js
```

## Usage Flow

### For New Members
1. Go to signup page
2. Create account with email and password
3. Wait for admin approval
4. Once approved, login and access member dashboard

### For Admin
1. Login with admin credentials
2. Approve pending member requests
3. Create events
4. Start QR attendance sessions for events
5. View member statistics and manage members

### Marking Attendance
1. Admin starts an attendance session for an event
2. QR code is displayed on admin screen
3. Members scan the QR code (or manually enter token)
4. Attendance is automatically recorded

## Deployment

### Backend (Heroku/Railway/Render)
```bash
# Build command
pip install -r requirements.txt

# Start command
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel/Netlify)
```bash
# Build command
npm run build

# Output directory
dist
```

**Important:** Update the API base URL in `frontend/vite.config.js` proxy settings for production.

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - Database connection string
- `SECRET_KEY` - JWT secret (generate with: `openssl rand -hex 32`)
- `ADMIN_EMAIL` - Default admin email
- `ADMIN_PASSWORD` - Default admin password

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- CORS configuration
- Session-based QR tokens with expiration
- One attendance per session enforcement
- SQL injection protection via SQLAlchemy ORM

## Future Enhancements

- Email notifications for approvals
- CSV export of attendance records
- Advanced analytics and charts
- File upload for resources
- Mobile app
- Push notifications
- Batch operations

## License

MIT License - Feel free to use this for your club!

## Support

For issues or questions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for Data Science Clubs everywhere