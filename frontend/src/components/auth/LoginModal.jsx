import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store';
import { Loader2, AlertCircle, Mail, Lock, User, CheckCircle, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function LoginModal({ open, onOpenChange, mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  
  const { login } = useAuthStore();

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Listen for sign-up mode trigger
  useEffect(() => {
    const handleShowSignUp = () => {
      setMode('signup');
    };
    window.addEventListener('show-signup-modal', handleShowSignUp);
    return () => window.removeEventListener('show-signup-modal', handleShowSignUp);
  }, []);

  // Reset mode when modal closes
  useEffect(() => {
    if (!open) {
      setMode('login');
    }
  }, [open]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await login(email, password);
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Show success message
      setSuccess('Account created successfully! You can now sign in.');
      
      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
      
      // Switch to login mode after 2 seconds
      setTimeout(() => {
        setMode('login');
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setMode('login');
    }
    onOpenChange(isOpen);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  const isSignUpMode = mode === 'signup';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isSignUpMode ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignUpMode 
              ? 'Sign up to access your library, playlists, and more' 
              : 'Sign in to access your library, playlists, and more'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={isSignUpMode ? handleSignUp : handleEmailLogin} className="space-y-4 py-4">
          {/* Success message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm"
              >
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Display Name field (Sign Up only) */}
          {isSignUpMode && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium">
                Display Name (optional)
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@mediacore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit button */}
          <Button 
            type="submit" 
            className="w-full h-11" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUpMode ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUpMode ? 'Create Account' : 'Sign In'
            )}
          </Button>

          {/* Mode toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={loading}
            >
              {isSignUpMode 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          {/* Divider - only show for login mode */}
          {!isSignUpMode && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Default Credentials
                  </span>
                </div>
              </div>

              {/* Default admin info */}
              <div className="text-center text-sm space-y-2 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium text-muted-foreground">Test Account:</p>
                <div className="font-mono text-xs space-y-1">
                  <p>
                    Email:{' '}
                    <span
                      onClick={() => copyToClipboard('admin@mediacore.com', 'email')}
                      className="text-primary font-semibold cursor-pointer hover:underline inline-flex items-center gap-1"
                      title="Click to copy"
                    >
                      admin@mediacore.com
                      {copiedField === 'email' ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-50" />
                      )}
                    </span>
                  </p>
                  <p>
                    Password:{' '}
                    <span
                      onClick={() => copyToClipboard('Admin@MediaCore123!', 'password')}
                      className="text-primary font-semibold cursor-pointer hover:underline inline-flex items-center gap-1"
                      title="Click to copy"
                    >
                      Admin@MediaCore123!
                      {copiedField === 'password' ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-50" />
                      )}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Change password after first login in production
                </p>
              </div>
            </>
          )}
        </form>

        {/* Features preview */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          {[
            { label: 'Library', desc: 'Save favorites' },
            { label: 'Playlists', desc: 'Create & share' },
            { label: 'History', desc: 'Track plays' },
          ].map((feature) => (
            <div key={feature.label} className="text-center">
              <p className="font-medium text-sm">{feature.label}</p>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Security note */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          🔐 Secured with JWT authentication. Your password is encrypted.
        </p>
      </DialogContent>
    </Dialog>
  );
}
