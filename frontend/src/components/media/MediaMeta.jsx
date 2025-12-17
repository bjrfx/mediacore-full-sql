import { useEffect } from 'react';

/**
 * MediaMeta Component
 * 
 * Dynamically updates document head with Open Graph and Twitter Card meta tags
 * for social media sharing and SEO optimization.
 * 
 * Features:
 * - Open Graph meta tags for Facebook, LinkedIn, etc.
 * - Twitter Card meta tags
 * - Dynamic title and description
 * - Proper thumbnail/image handling
 * 
 * Note: For proper SSR support, consider using react-helmet-async or Next.js
 */

const APP_NAME = 'MediaCore';
const APP_DOMAIN = process.env.REACT_APP_DOMAIN || 'https://app.mediacore.in';

export default function MediaMeta({ media, type = 'page' }) {
  useEffect(() => {
    if (!media) return;

    const isVideo = media.type === 'video';
    const shareType = isVideo ? 'watch' : 'listen';
    const pageUrl = `${APP_DOMAIN}/${shareType}/${media.id}`;
    
    // Generate meta content
    const title = `${media.title} - ${APP_NAME}`;
    const description = media.description || 
      `${isVideo ? 'Watch' : 'Listen to'} "${media.title}" by ${media.artistName || 'Unknown'} on ${APP_NAME}`;
    const image = media.thumbnail || media.thumbnailUrl || `${APP_DOMAIN}/og-default.png`;
    const imageAlt = `${media.title} thumbnail`;

    // Update document title
    const originalTitle = document.title;
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (property, content, isOg = false) => {
      const attr = isOg ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${property}"]`);
      
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      
      tag.setAttribute('content', content);
      return tag;
    };

    // Store original values to restore on unmount
    const originalMetas = {};
    const metaTags = [];

    const trackMeta = (property, content, isOg = false) => {
      const attr = isOg ? 'property' : 'name';
      const existing = document.querySelector(`meta[${attr}="${property}"]`);
      if (existing) {
        originalMetas[`${attr}:${property}`] = {
          attr,
          property,
          content: existing.getAttribute('content'),
          existed: true
        };
      } else {
        originalMetas[`${attr}:${property}`] = {
          attr,
          property,
          existed: false
        };
      }
      metaTags.push(setMetaTag(property, content, isOg));
    };

    // Basic meta tags
    trackMeta('description', description);
    
    // Open Graph tags
    trackMeta('og:title', title, true);
    trackMeta('og:description', description, true);
    trackMeta('og:image', image, true);
    trackMeta('og:image:alt', imageAlt, true);
    trackMeta('og:url', pageUrl, true);
    trackMeta('og:site_name', APP_NAME, true);
    trackMeta('og:type', isVideo ? 'video.other' : 'music.song', true);
    
    // Video/Audio specific OG tags
    if (isVideo) {
      trackMeta('og:video:type', 'text/html', true);
      trackMeta('og:video:url', `${APP_DOMAIN}/embed/${media.id}`, true);
      if (media.duration) {
        trackMeta('og:video:duration', String(media.duration), true);
      }
    } else {
      trackMeta('og:audio:type', 'audio/mpeg', true);
      if (media.duration) {
        trackMeta('og:audio:duration', String(media.duration), true);
      }
    }

    // Twitter Card tags
    trackMeta('twitter:card', isVideo ? 'player' : 'summary_large_image');
    trackMeta('twitter:title', title);
    trackMeta('twitter:description', description);
    trackMeta('twitter:image', image);
    trackMeta('twitter:image:alt', imageAlt);
    
    if (isVideo) {
      trackMeta('twitter:player', `${APP_DOMAIN}/embed/${media.id}`);
      trackMeta('twitter:player:width', '560');
      trackMeta('twitter:player:height', '315');
    }

    // Cleanup on unmount
    return () => {
      document.title = originalTitle;
      
      Object.entries(originalMetas).forEach(([key, meta]) => {
        const tag = document.querySelector(`meta[${meta.attr}="${meta.property}"]`);
        if (tag) {
          if (meta.existed) {
            tag.setAttribute('content', meta.content);
          } else {
            tag.remove();
          }
        }
      });
    };
  }, [media]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Generate static HTML for meta tags (useful for SSR or pre-rendering)
 */
export function generateMediaMetaTags(media) {
  if (!media) return '';

  const isVideo = media.type === 'video';
  const shareType = isVideo ? 'watch' : 'listen';
  const pageUrl = `${APP_DOMAIN}/${shareType}/${media.id}`;
  
  const title = `${media.title} - ${APP_NAME}`;
  const description = media.description || 
    `${isVideo ? 'Watch' : 'Listen to'} "${media.title}" by ${media.artistName || 'Unknown'} on ${APP_NAME}`;
  const image = media.thumbnail || media.thumbnailUrl || `${APP_DOMAIN}/og-default.png`;

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:site_name" content="${APP_NAME}" />
    <meta property="og:type" content="${isVideo ? 'video.other' : 'music.song'}" />
    ${isVideo ? `<meta property="og:video:url" content="${APP_DOMAIN}/embed/${media.id}" />` : ''}
    ${media.duration ? `<meta property="og:${isVideo ? 'video' : 'audio'}:duration" content="${media.duration}" />` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="${isVideo ? 'player' : 'summary_large_image'}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    ${isVideo ? `
    <meta name="twitter:player" content="${APP_DOMAIN}/embed/${media.id}" />
    <meta name="twitter:player:width" content="560" />
    <meta name="twitter:player:height" content="315" />
    ` : ''}
  `.trim();
}

// Helper to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text?.replace(/[&<>"']/g, m => map[m]) || '';
}
