// No SDK download or analytics connection until a project token is configured.
const config = window.UNSTALL_ANALYTICS;
if (config?.key?.trim()) {
  import('./assets/posthog.js').then(({default: posthog}) => {
    const utm = {};
    const query = new URLSearchParams(location.search);
    for (const name of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      if (query.has(name)) utm[name] = query.get(name).slice(0, 200);
    }
    // Keep attribution, omit referrer/query fragments that may contain content.
    let referrer = '';
    try { referrer = new URL(document.referrer).origin; } catch {}
    const attribution = {referrer, ...utm};
    posthog.init(config.key, {
      api_host: config.host || 'https://us.i.posthog.com',
      persistence: 'memory',
      person_profiles: 'never',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      advanced_disable_flags: true,
      enable_heatmaps: false,
      capture_performance: false,
      capture_exceptions: false,
      disable_external_dependency_loading: true,
      ip: false,
      save_referrer: false,
      save_campaign_params: false,
      request_batching: false,
      disable_compression: true,
      before_send: event => {
        // SDK-generated device/session metadata is deliberately not retained.
        if (!['$pageview', 'download_clicked'].includes(event.event)) return null;
        const keys = ['token', 'distinct_id', '$current_url', '$pathname', '$host', '$geoip_disable',
          '$process_person_profile', 'location', 'referrer', ...Object.keys(utm)];
        event.properties = Object.fromEntries(Object.entries(event.properties || {}).filter(([key]) => keys.includes(key)));
        event.properties.$current_url = location.origin + location.pathname;
        event.properties.$pathname = location.pathname;
        event.properties.$host = location.host;
        event.properties.$geoip_disable = true;
        event.properties.$process_person_profile = false;
        return event;
      },
      loaded: ph => {
        ph.capture('$pageview', attribution);
        document.querySelectorAll('[data-download]').forEach(button => {
          button.addEventListener('click', () => {
            ph.capture('download_clicked', {location: button.dataset.download, ...attribution}, {transport: 'sendBeacon'});
          });
        });
      },
    });
  }).catch(() => { /* Analytics never blocks the download. */ });
}
