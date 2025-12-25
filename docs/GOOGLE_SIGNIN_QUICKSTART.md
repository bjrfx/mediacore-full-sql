# Google Sign-In - Quick Start

## 🚀 Setup (5 minutes)

### 1. Get Google OAuth Credentials
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 Client ID (Web application)
3. Add JavaScript origins: `https://app.mediacore.in`, `http://localhost:3000`
4. Copy your Client ID

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Frontend** (`frontend/.env`):
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Start Servers
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm start
```

---

## ✨ Features

- ✅ **Google Sign-In Button** in login modal
- ✅ **Auto Password Prompt** after Google sign-in
- ✅ **Profile Management** - Set password anytime
- ✅ **Dual Authentication** - Sign in with Google OR email/password
- ✅ **Account Linking** - Links Google to existing email accounts
- ✅ **Password Strength Validation** with real-time feedback

---

## 📝 User Flow

1. **New User via Google**:
   - Click "Continue with Google" → Select account → Modal to set password → Done!
   - Can choose "Set Later" and set password from Profile

2. **Existing User Linking Google**:
   - Sign in with Google → Automatically links to existing email account

3. **Setting Password**:
   - After Google sign-in OR from Profile page
   - Enter password (8+ chars, uppercase, lowercase, number, special char)
   - Confirm password → Submit

4. **Sign In Both Ways**:
   - Google: One-click with Google button
   - Email/Password: Traditional login form

---

## 🔧 What Was Implemented

### Backend
- `POST /auth/google` - Authenticate with Google token
- `POST /auth/set-password` - Set password for Google users
- Google token verification with `google-auth-library`
- Account creation/linking logic

### Frontend
- GoogleLogin button in LoginModal
- SetPasswordModal component with validation
- Profile page Account Security section
- Auth store with Google login action
- Auto-trigger password modal for new Google users

---

## 📂 Files Changed

**Backend** (4 files):
- `backend/auth/controllers.js`
- `backend/routes/auth.js`
- `backend/.env`
- `backend/package.json`

**Frontend** (8 files):
- `frontend/src/index.js`
- `frontend/src/services/auth.js`
- `frontend/src/store/authStore.js`
- `frontend/src/components/auth/LoginModal.jsx`
- `frontend/src/components/auth/SetPasswordModal.jsx` (NEW)
- `frontend/src/App.jsx`
- `frontend/src/pages/Profile.jsx`
- `frontend/.env`

---

## 🎯 Testing

1. **Google Sign-In**: Click button, select account, get signed in ✓
2. **Password Prompt**: Should appear for new Google users ✓
3. **Profile**: Check Account Security section shows Google status ✓
4. **Set Password**: Enter password with validation feedback ✓
5. **Dual Auth**: Sign in with both Google and email/password ✓

---

## 🔐 Security Notes

- All Google tokens verified server-side
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens for both auth methods
- Email auto-verified for Google users
- Strong password requirements enforced

---

## 📚 Full Documentation

See [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) for:
- Detailed setup instructions
- Technical architecture
- Troubleshooting guide
- Security considerations
- Future enhancements

---

**Status**: ✅ Ready to use! Just add your Google OAuth credentials.
