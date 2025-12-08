import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store';
import { Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
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

export default function LoginModal({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { login } = useAuthStore();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setError(null);
      setEmail('');
      setPassword('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Welcome Back</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to access your library, playlists, and more
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleEmailLogin} className="space-y-4 py-4">
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

          {/* Sign in button */}
          <Button 
            type="submit" 
            className="w-full h-11" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Divider */}
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
              <p>Email: <span className="text-primary font-semibold">admin@mediacore.com</span></p>
              <p>Password: <span className="text-primary font-semibold">Admin@MediaCore123!</span></p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Change password after first login in production
            </p>
          </div>
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
