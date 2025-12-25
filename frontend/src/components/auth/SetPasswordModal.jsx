import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store';
import { Loader2, AlertCircle, Lock, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
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

export default function SetPasswordModal({ open, onOpenChange }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);
  
  const { setPassword: setPasswordAction, dismissPasswordPrompt } = useAuthStore();

  const validatePassword = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    return {
      checks,
      strength: passedChecks <= 2 ? 'weak' : passedChecks <= 4 ? 'medium' : 'strong',
      valid: Object.values(checks).every(Boolean)
    };
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    
    if (pwd.length > 0) {
      setPasswordStrength(validatePassword(pwd));
    } else {
      setPasswordStrength(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    try {
      await setPasswordAction(password);
      setSuccess('Password set successfully! You can now sign in with email and password.');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setPassword('');
        setConfirmPassword('');
        setPasswordStrength(null);
      }, 2000);
    } catch (err) {
      console.error('Set password error:', err);
      setError(err.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleLater = () => {
    dismissPasswordPrompt();
    onOpenChange(false);
    setPassword('');
    setConfirmPassword('');
    setPasswordStrength(null);
    setError(null);
  };

  const getStrengthColor = () => {
    if (!passwordStrength) return '';
    switch (passwordStrength.strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return '';
    }
  };

  const getStrengthBarWidth = () => {
    if (!passwordStrength) return '0%';
    switch (passwordStrength.strength) {
      case 'weak': return '33%';
      case 'medium': return '66%';
      case 'strong': return '100%';
      default: return '0%';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Set Your Password
          </DialogTitle>
          <DialogDescription className="text-center">
            Enable email/password sign-in as an alternative to Google. You can set this now or later in your profile settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter a strong password"
                value={password}
                onChange={handlePasswordChange}
                className="pl-10 pr-10"
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground z-10"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className={`font-medium capitalize ${getStrengthColor()}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: getStrengthBarWidth() }}
                    transition={{ duration: 0.3 }}
                    className={`h-full ${
                      passwordStrength.strength === 'weak' ? 'bg-red-500' :
                      passwordStrength.strength === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Password requirements */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Password must contain:</p>
            {passwordStrength && (
              <>
                <div className={`text-xs flex items-center gap-2 ${passwordStrength.checks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${passwordStrength.checks.length ? 'border-green-600 bg-green-600' : 'border-muted-foreground'}`}>
                    {passwordStrength.checks.length && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  At least 8 characters
                </div>
                <div className={`text-xs flex items-center gap-2 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${passwordStrength.checks.uppercase ? 'border-green-600 bg-green-600' : 'border-muted-foreground'}`}>
                    {passwordStrength.checks.uppercase && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  One uppercase letter
                </div>
                <div className={`text-xs flex items-center gap-2 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${passwordStrength.checks.lowercase ? 'border-green-600 bg-green-600' : 'border-muted-foreground'}`}>
                    {passwordStrength.checks.lowercase && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  One lowercase letter
                </div>
                <div className={`text-xs flex items-center gap-2 ${passwordStrength.checks.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${passwordStrength.checks.number ? 'border-green-600 bg-green-600' : 'border-muted-foreground'}`}>
                    {passwordStrength.checks.number && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  One number
                </div>
                <div className={`text-xs flex items-center gap-2 ${passwordStrength.checks.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${passwordStrength.checks.special ? 'border-green-600 bg-green-600' : 'border-muted-foreground'}`}>
                    {passwordStrength.checks.special && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  One special character (!@#$%^&*...)
                </div>
              </>
            )}
            {!passwordStrength && (
              <>
                <p className="text-xs text-muted-foreground">• At least 8 characters</p>
                <p className="text-xs text-muted-foreground">• One uppercase letter</p>
                <p className="text-xs text-muted-foreground">• One lowercase letter</p>
                <p className="text-xs text-muted-foreground">• One number</p>
                <p className="text-xs text-muted-foreground">• One special character (!@#$%^&*...)</p>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleLater}
              disabled={loading}
            >
              Set Later
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </div>
        </form>

        {/* Info note */}
        <p className="text-xs text-center text-muted-foreground">
          💡 You'll be able to sign in with both Google and email/password after setting this.
        </p>
      </DialogContent>
    </Dialog>
  );
}
