import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Globe, Check, Ban, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useSubscriptionStore } from '../../store';
import { canAccessLanguage, SUBSCRIPTION_TIERS } from '../../config/subscription';

// Language code to name mapping
const LANGUAGE_NAMES = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ur: { name: 'Urdu', nativeName: 'اردو' },
  es: { name: 'Spanish', nativeName: 'Español' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  zh: { name: 'Chinese', nativeName: '中文' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  ru: { name: 'Russian', nativeName: 'Русский' },
};

/**
 * LanguageSelector component for media players
 * Shows available language options for the current content
 * 
 * @param {Object} props
 * @param {string} props.currentLanguage - Current language code
 * @param {Array} props.availableLanguages - Array of available language objects [{code, name, mediaId}]
 * @param {Function} props.onLanguageChange - Callback when language is changed
 * @param {boolean} props.isVideoMode - Whether player is in video mode (for styling)
 * @param {string} props.variant - 'mini' for mini player, 'full' for expanded player
 * @param {boolean} props.disabled - Whether the selector is disabled
 */
export default function LanguageSelector({
  currentLanguage = 'en',
  availableLanguages = [],
  onLanguageChange,
  isVideoMode = false,
  variant = 'full',
  disabled = false,
}) {
  const { tier, showUpgrade } = useSubscriptionStore();
  const hasMultipleLanguages = availableLanguages.length > 1;
  const currentLangInfo = LANGUAGE_NAMES[currentLanguage] || { name: currentLanguage, nativeName: currentLanguage };
  
  // Check if user can access non-English languages
  const canAccessAllLanguages = tier === SUBSCRIPTION_TIERS.PREMIUM || 
    tier === SUBSCRIPTION_TIERS.PREMIUM_PLUS || 
    tier === SUBSCRIPTION_TIERS.ENTERPRISE;

  // Handle language selection with subscription check
  const handleLanguageSelect = (lang) => {
    if (lang.code === currentLanguage) return;
    
    // Check if user can access this language
    if (!canAccessLanguage(tier, lang.code)) {
      showUpgrade('language');
      return;
    }
    
    onLanguageChange?.(lang);
  };
  
  // If no languages available or only one language
  if (availableLanguages.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={variant === 'mini' ? 'iconSm' : 'icon'}
              disabled
              className={cn(
                'relative opacity-50',
                isVideoMode && variant === 'full' && 'text-white hover:bg-white/20'
              )}
            >
              <Languages className={cn(variant === 'mini' ? 'h-4 w-4' : 'h-5 w-5')} />
              {/* Strike-through indicator for single language */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  'w-full h-0.5 bg-current rotate-45 opacity-60',
                  variant === 'mini' ? 'max-w-3' : 'max-w-4'
                )} />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>No alternate languages available</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!hasMultipleLanguages) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={variant === 'mini' ? 'iconSm' : 'icon'}
              disabled
              className={cn(
                'relative opacity-50',
                isVideoMode && variant === 'full' && 'text-white hover:bg-white/20'
              )}
            >
              <Languages className={cn(variant === 'mini' ? 'h-4 w-4' : 'h-5 w-5')} />
              {/* Strike-through indicator for single language */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  'w-full h-0.5 bg-current rotate-45 opacity-60',
                  variant === 'mini' ? 'max-w-3' : 'max-w-4'
                )} />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Only {currentLangInfo.name} available</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={variant === 'mini' ? 'iconSm' : 'icon'}
                disabled={disabled}
                className={cn(
                  'relative',
                  isVideoMode && variant === 'full' && 'text-white hover:bg-white/20',
                  hasMultipleLanguages && 'text-primary'
                )}
              >
                <Languages className={cn(variant === 'mini' ? 'h-4 w-4' : 'h-5 w-5')} />
                {/* Language count badge */}
                {hasMultipleLanguages && (
                  <span className={cn(
                    'absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold',
                    variant === 'mini' ? 'h-3.5 w-3.5' : 'h-4 w-4',
                    isVideoMode && variant === 'full' ? 'bg-white text-black' : 'bg-primary text-primary-foreground'
                  )}>
                    {availableLanguages.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Audio & Language ({availableLanguages.length} available)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Audio & Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableLanguages.map((lang) => {
          const langInfo = LANGUAGE_NAMES[lang.code] || { name: lang.code, nativeName: lang.code };
          const isSelected = lang.code === currentLanguage;
          const isLocked = !canAccessLanguage(tier, lang.code);
          
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageSelect(lang)}
              className={cn(
                'flex items-center justify-between cursor-pointer',
                isSelected && 'bg-accent',
                isLocked && 'opacity-75'
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{langInfo.name}</span>
                <span className="text-xs text-muted-foreground">{langInfo.nativeName}</span>
              </div>
              <div className="flex items-center gap-2">
                {isLocked && (
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                )}
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact language indicator badge for showing current language
 */
export function LanguageBadge({ language, className }) {
  const langInfo = LANGUAGE_NAMES[language] || { name: language, nativeName: language };
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary',
      className
    )}>
      <Globe className="h-3 w-3" />
      {langInfo.name}
    </span>
  );
}
