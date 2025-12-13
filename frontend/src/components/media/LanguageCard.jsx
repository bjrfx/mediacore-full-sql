import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, getLanguageName, getLanguageCode } from '../../lib/utils';

// Language configurations with colors and gradients
const LANGUAGE_CONFIG = {
  en: { name: 'English', nativeName: 'English', color: 'from-red-100 to-white-700' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', color: 'from-orange-500 to-red-600' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', color: 'from-yellow-100 to-orange-600' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', color: 'from-red-500 to-pink-600' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', color: 'from-yellow-400 to-red-500' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', color: 'from-green-500 to-teal-600' },
  mr: { name: 'Marathi', nativeName: 'मराठी', color: 'from-orange-400 to-orange-600' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', color: 'from-green-400 to-emerald-600' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', color: 'from-red-400 to-rose-600' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', color: 'from-orange-500 to-amber-600' },
  ur: { name: 'Urdu', nativeName: 'اردو', color: 'from-green-600 to-emerald-700' },
  es: { name: 'Spanish', nativeName: 'Español', color: 'from-red-500 to-yellow-500' },
  fr: { name: 'French', nativeName: 'Français', color: 'from-blue-500 to-red-500' },
  de: { name: 'German', nativeName: 'Deutsch', color: 'from-gray-800 to-yellow-500' },
  ja: { name: 'Japanese', nativeName: '日本語', color: 'from-red-500 to-pink-500' },
  ko: { name: 'Korean', nativeName: '한국어', color: 'from-blue-500 to-red-500' },
  zh: { name: 'Chinese', nativeName: '中文', color: 'from-red-600 to-yellow-500' },
  ar: { name: 'Arabic', nativeName: 'العربية', color: 'from-green-600 to-green-800' },
  pt: { name: 'Portuguese', nativeName: 'Português', color: 'from-green-500 to-yellow-500' },
  ru: { name: 'Russian', nativeName: 'Русский', color: 'from-blue-600 to-red-500' },
};

/**
 * LanguageCard - Circular language card similar to artist cards
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
  };

  const displayCode = getLanguageCode(language);
  const displayName = getLanguageName(language);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={onClick}
      className="group flex flex-col items-center gap-2 sm:gap-3 cursor-pointer"
    >
      {/* Circular Card */}
      <div className={cn(
        'w-32 sm:w-36 md:w-40 aspect-square',
        'rounded-full overflow-hidden',
        'shadow-md transition-shadow duration-300',
        'group-hover:shadow-xl group-hover:scale-95 transition-transform duration-300 relative'
      )}>
        {/* Gradient background */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br',
          config.color,
          'opacity-90 group-hover:opacity-100 transition-opacity duration-300'
        )} />
        
        {/* Content - centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm group-hover:backdrop-blur-md transition-all duration-1000">
          {/* Large language code/letter */}
          <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-white/90 leading-none  group-hover:scale-110 transition-transform duration-1000" style={{fontFamily: 'Poppins, sans-serif', fontWeight: '300'}}>
            {displayCode}
          </div>
        </div>

        {/* Hover play button */}
        {/* <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/30 backdrop-blur-md rounded-full p-3 hover:bg-white/40 transition-colors duration-300">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div> */}
      </div>

      {/* Language name below card */}
      <div className="text-center">
        <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-1" style={{fontFamily: 'Poppins, sans-serif', fontWeight: '350'}}>
          {displayName}
        </h3>
        {contentCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {contentCount} {contentCount === 1 ? 'track' : 'tracks'}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * LanguageCardGrid - Grid of language cards (horizontal scrollable layout)
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
    <section className="w-full">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold truncate">{title}</h2>
        </div>
        {languages.length > 6 && (
          <Link 
            to="/browse/languages" 
            className="text-xs sm:text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors flex-shrink-0"
          >
            All <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      
      {/* Horizontal scrolling container */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
          {languages.slice(0, 12).map((lang, index) => (
            <div key={lang.code} className="flex-shrink-0 snap-start">
              <LanguageCard
                language={lang.code}
                contentCount={lang.count}
                onClick={() => onLanguageSelect?.(lang.code)}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * CompactLanguageBadges - Horizontal scrollable language badges (for filter)
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
          'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          !selectedLanguage
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted hover:bg-muted/80 text-foreground'
        )}
      >
        All Languages
      </button>
      
      {languages.map((lang) => {
        const displayName = getLanguageName(lang.code);
        return (
          <button
            key={lang.code}
            onClick={() => onLanguageSelect?.(lang.code)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedLanguage === lang.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            )}
          >
            {displayName}
            {lang.count > 0 && (
              <span className={cn(
                'ml-2 text-xs px-1.5 rounded-full',
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
