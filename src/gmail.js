import { profile } from './data.js'

const email = profile.email
const subject = encodeURIComponent('Hey Shimul')
export const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}`

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

export function openGmail() {
  if (isMobile() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const started = Date.now()
    window.location.href = `googlegmail://co?to=${encodeURIComponent(email)}&subject=${subject}`
    setTimeout(() => {
      if (Date.now() - started < 2500) window.location.href = gmailHref
    }, 900)
    return
  }
  if (isMobile() && /Android/i.test(navigator.userAgent)) {
    const fallback = encodeURIComponent(gmailHref)
    window.location.href = `intent://co?to=${encodeURIComponent(email)}&subject=${subject}#Intent;scheme=googlegmail;package=com.google.android.gm;S.browser_fallback_url=${fallback};end`
    return
  }
  window.open(gmailHref, '_blank', 'noopener,noreferrer')
}
