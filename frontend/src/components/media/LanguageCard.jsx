import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

// Language configurations with colors and gradients
const LANGUAGE_CONFIG = {
  en: { name: 'English', nativeName: 'English', color: 'from-blue-500 to-blue-700', icon: '🇬🇧' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', color: 'from-orange-500 to-red-600', icon: '🇮🇳' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', color: 'from-yellow-500 to-orange-600', icon: '🌺' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', color: 'from-red-500 to-pink-600', icon: '🏛️' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', color: 'from-yellow-400 to-red-500', icon: '🪷' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', color: 'from-green-500 to-teal-600', icon: '🌴' },
  mr: { name: 'Marathi', nativeName: 'मराठी', color: 'from-orange-400 to-orange-600', icon: '🏔️' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', color: 'from-green-400 to-emerald-600', icon: '🌸' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', color: 'from-red-400 to-rose-600', icon: '🦁' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', color: 'from-orange-500 to-amber-600', icon: '🌾' },
  ur: { name: 'Urdu', nativeName: 'اردو', color: 'from-green-600 to-emerald-700', icon: '🌙' },
  es: { name: 'Spanish', nativeName: 'Español', color: 'from-red-500 to-yellow-500', icon: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', color: 'from-blue-500 to-red-500', icon: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', color: 'from-gray-800 to-yellow-500', icon: '🇩🇪' },
  ja: { name: 'Japanese', nativeName: '日本語', color: 'from-red-500 to-pink-500', icon: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', color: 'from-blue-500 to-red-500', icon: '🇰🇷' },
  zh: { name: 'Chinese', nativeName: '中文', color: 'from-red-600 to-yellow-500', icon: '🇨🇳' },
  ar: { name: 'Arabic', nativeName: 'العربية', color: 'from-green-600 to-green-800', icon: '🕌' },
  pt: { name: 'Portuguese', nativeName: 'Português', color: 'from-green-500 to-yellow-500', icon: '🇵🇹' },
  ru: { name: 'Russian', nativeName: 'Русский', color: 'from-blue-600 to-red-500', icon: '🇷🇺' },
};

/**
 * LanguageCard - Individual language card component
 */
export function LanguageCard({ 
  language, 
  contentCount = 0, 
  onClick,
  index = 0,
}) {
  const config = LANGUAGE_CONFIG[language] || {
    name: language,
    nativeName: language,
    color: 'from-gray-500 to-gray-700',
    icon: '🌐',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl cursor-pointer',
        'aspect-[4/3] md:aspect-[3/2]',
        'transition-transform duration-300 hover:scale-105',
      )}
    >
      {/* Gradient background */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br',
        config.color,
        'opacity-90 group-hover:opacity-100 transition-opacity'
      )} />
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:20px_20px]" />
      
      {/* Content */}
      <div className="absolute inset-0 p-3 sm:p-4 lg:p-1.5 flex flex-col justify-between">
        {/* Icon */}
        <div className="text-2xl sm:text-3xl md:text-4xl mb-0">
          {config.icon}
        </div>
        
        {/* Text */}
        <div>
          <h3 className="text-white text-base sm:text-lg md:text-xl font-bold leading-tight">
            {config.name}
          </h3>
          <p className="text-white/80 text-xs sm:text-sm font-medium">
            {config.nativeName}
          </p>
          <p className="text-white/70 text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium">
            {contentCount > 0 ? `${contentCount} ${contentCount === 1 ? 'track' : 'tracks'}` : 'No tracks yet'}
          </p>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
          <Play className="h-6 w-6 text-white fill-white" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * LanguageCardGrid - Grid of language cards
 */
export function LanguageCardGrid({ 
  languages, 
  onLanguageSelect,
  title = "Browse by Language",
}) {
  if (!languages || languages.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        {languages.length > 6 && (
          <Link 
            to="/browse/languages" 
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {languages.slice(0, 12).map((lang, index) => (
          <LanguageCard
            key={lang.code}
            language={lang.code}
            contentCount={lang.count}
            onClick={() => onLanguageSelect?.(lang.code)}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * CompactLanguageBadges - Horizontal scrollable language badges
 */
export function CompactLanguageBadges({
  languages,
  selectedLanguage,
  onLanguageSelect,
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onLanguageSelect?.(null)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          !selectedLanguage
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted hover:bg-muted/80 text-foreground'
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        All Languages
      </button>
      
      {languages.map((lang) => {
        const config = LANGUAGE_CONFIG[lang.code] || { name: lang.code, icon: '🌐' };
        return (
          <button
            key={lang.code}
            onClick={() => onLanguageSelect?.(lang.code)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedLanguage === lang.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            )}
          >
            <span>{config.icon}</span>
            {config.name}
            {lang.count > 0 && (
              <span className={cn(
                'ml-1 text-xs px-1.5 rounded-full',
                selectedLanguage === lang.code
                  ? 'bg-primary-foreground/20'
                  : 'bg-foreground/10'
              )}>
                {lang.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageCard;
