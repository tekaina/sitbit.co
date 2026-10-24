import DOMPurify from '../vendor/dompurify/purify.es.mjs';

const avatarHosts = new Set(['firebasestorage.googleapis.com', 'storage.googleapis.com', 'lh3.googleusercontent.com']);
export function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeAvatar(value) {
  try {
    const url = new URL(String(value), window.location.origin);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (url.origin !== window.location.origin && !avatarHosts.has(url.hostname) && !url.hostname.endsWith('.googleusercontent.com')) return '';
    return url.href;
  } catch { return ''; }
}
DOMPurify.addHook('uponSanitizeAttribute', (node, attribute) => {
  const name = attribute.attrName.toLowerCase();
  if (name.startsWith('on') || name === 'srcdoc' || name === 'srcset') attribute.keepAttr = false;
  if (name === 'src' && !safeAvatar(attribute.attrValue)) attribute.keepAttr = false;
  if (['href', 'action', 'formaction'].includes(name)) {
    try {
      const url = new URL(attribute.attrValue, window.location.origin);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
      const localLink = local && url.origin === window.location.origin && url.protocol === 'http:';
      if (url.username || url.password || (!localLink && !['https:', 'mailto:', 'tel:'].includes(url.protocol))) attribute.keepAttr = false;
      if (['action', 'formaction'].includes(name) && url.origin !== window.location.origin) attribute.keepAttr = false;
    } catch { attribute.keepAttr = false; }
  }
});
export function safeHtml(value) {
  return DOMPurify.sanitize(String(value ?? ''), {
    USE_PROFILES: {html: true},
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base'],
    FORBID_ATTR: ['srcdoc', 'srcset'],
    ALLOW_DATA_ATTR: true
  });
}
