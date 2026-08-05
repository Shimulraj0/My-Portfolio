import { profile } from './data.js'

const email = profile.email
export const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent('Hey Shimul')}`

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

export function gmailComposeHref({ subject = 'Hey Shimul', body = '' } = {}) {
  const params = new URLSearchParams({ view: 'cm', fs: 1, to: email })
  if (subject) params.set('su', subject)
  if (body) params.set('body', body)
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function openGmailCompose({ subject = 'Hey Shimul', body = '' } = {}) {
  const href = gmailComposeHref({ subject, body })
  if (isMobile() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const started = Date.now()
    window.location.href = `googlegmail://co?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`
    setTimeout(() => {
      if (Date.now() - started < 2500) window.location.href = href
    }, 900)
    return
  }
  if (isMobile() && /Android/i.test(navigator.userAgent)) {
    const fallback = encodeURIComponent(href)
    window.location.href = `intent://co?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}#Intent;scheme=googlegmail;package=com.google.android.gm;S.browser_fallback_url=${fallback};end`
    return
  }
  window.open(href, '_blank', 'noopener,noreferrer')
}

export function openGmail() {
  openGmailCompose({})
}
