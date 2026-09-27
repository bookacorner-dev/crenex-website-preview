# Website measurement

GA4 property: **Crenex — Website**, `556151138`, in BookACorner account `301350676`.
Web stream: **Crenex Website**, `15855209878`, `https://crenex.io`.
Public measurement ID: `G-MYNTDFN8VX`.

`assets/js/analytics.js` only loads the Google tag on the production hostname after the visitor allows analytics. Rejecting keeps the tag unloaded. The footer preferences control allows withdrawal; this disables collection, removes this site's GA cookies and attribution context, and reloads the page to remove the tag's listeners.

Consent preference and GA cookies expire after 180 days. Attribution lasts up to 30 minutes of inactivity in session storage. Page locations use canonical URLs without queries or fragments; referrers are reduced to origins. Only short campaign codes are accepted. Form field values are never passed to Analytics.

## Events

- `page_view`: one explicit page view per page load after consent.
- `demo_cta_click`: a link to the demo; placement is header, footer or content.
- `demo_form_start`: first form input.
- `demo_submit_attempt`: valid native submission attempt, before FormSubmit verification.
- `demo_form_offline`: submission blocked because the browser reports no connection.
- `generate_lead`: return from the form provider matched to the recent random submission reference in the same tab; counted once.

`generate_lead` measures the browser return flow, not server-side proof of acceptance or delivery to the mailbox. Visitors who reject analytics and returns without a matching recent session reference do not contribute to this event. Browser extensions may also block measurement.

Enhanced measurement is disabled in the web stream to avoid automatic form events and duplicate page views. Google signals and user-provided-data collection are not enabled. The tag denies advertising storage, ad user data and ad personalisation, and disables Google signals.

## Checks

Run `node --test docs/check_demo_measurement.cjs` and `python3 docs/check_seo.py`. The behavior tests exercise consent, withdrawal, privacy filtering, disabled measurement on local previews and form confirmation without external requests.

After deployment check the banner on mobile, reject/accept/withdraw via the UI, and confirm a visit and demo click in GA4 Realtime. Do not send a real demo request solely to test analytics unless explicitly authorised. Changes to the consent stylesheet require a new asset query version because static assets are cached.

CSP origins follow Google's non-advertising guidance: https://developers.google.com/tag-platform/security/guides/csp
