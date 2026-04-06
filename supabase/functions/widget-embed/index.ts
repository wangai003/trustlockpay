// Widget Embed — serves the TrustLock checkout widget JavaScript
// External sites embed: <script src="https://<project>.supabase.co/functions/v1/widget-embed?v=1" data-site-id="..." data-vendor-id="..."></script>

const WIDGET_JS = (baseUrl: string) => `
(function() {
  'use strict';

  // ─── Read config from script tag ─────────────────────────
  var scripts = document.querySelectorAll('script[data-site-id]');
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  var siteId = currentScript.getAttribute('data-site-id') || '';
  var vendorId = currentScript.getAttribute('data-vendor-id') || '';
  var mode = currentScript.getAttribute('data-mode') || 'sandbox';
  var position = currentScript.getAttribute('data-position') || 'bottom-right';
  var platformFee = currentScript.getAttribute('data-platform-fee') || '';
  var platformName = currentScript.getAttribute('data-platform-name') || '';
  var offeringId = currentScript.getAttribute('data-offering-id') || '';

  if (!siteId || !vendorId) {
    console.warn('[TrustLock] Missing data-site-id or data-vendor-id');
    return;
  }

  // ─── Inject styles ──────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#tl-widget-btn{',
      'position:fixed;z-index:999999;',
      (position === 'bottom-left' ? 'left:20px;' : 'right:20px;'),
      'bottom:20px;',
      'width:56px;height:56px;border-radius:50%;',
      'background:linear-gradient(135deg,#1a56db,#0ea5e9);',
      'border:none;cursor:pointer;',
      'box-shadow:0 4px 20px rgba(26,86,219,0.4);',
      'display:flex;align-items:center;justify-content:center;',
      'transition:transform 0.2s,box-shadow 0.2s;',
      'animation:tl-pulse 2s infinite;',
    '}',
    '#tl-widget-btn:hover{',
      'transform:scale(1.1);',
      'box-shadow:0 6px 28px rgba(26,86,219,0.5);',
    '}',
    '@keyframes tl-pulse{',
      '0%,100%{box-shadow:0 4px 20px rgba(26,86,219,0.4)}',
      '50%{box-shadow:0 4px 28px rgba(26,86,219,0.6)}',
    '}',
    '#tl-widget-badge{',
      'position:absolute;top:-4px;right:-4px;',
      'background:#10b981;color:#fff;font-size:9px;',
      'padding:2px 5px;border-radius:8px;font-weight:700;',
      'font-family:system-ui,sans-serif;',
      'line-height:1;pointer-events:none;',
    '}',
    '#tl-widget-overlay{',
      'display:none;position:fixed;top:0;left:0;right:0;bottom:0;',
      'z-index:9999999;background:rgba(0,0,0,0.5);',
      'animation:tl-fade-in 0.2s ease;',
    '}',
    '#tl-widget-overlay.tl-open{display:flex;align-items:center;justify-content:center;}',
    '@keyframes tl-fade-in{from{opacity:0}to{opacity:1}}',
    '#tl-widget-frame-wrap{',
      'position:relative;width:100%;max-width:480px;height:90vh;max-height:700px;',
      'background:#fff;border-radius:16px;overflow:hidden;',
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);',
      'animation:tl-slide-up 0.3s ease;',
    '}',
    '@keyframes tl-slide-up{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '#tl-widget-frame-wrap iframe{width:100%;height:100%;border:none;}',
    '#tl-widget-close{',
      'position:absolute;top:12px;right:12px;z-index:10;',
      'width:32px;height:32px;border-radius:50%;',
      'background:rgba(0,0,0,0.1);border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'color:#333;font-size:18px;font-weight:700;',
      'transition:background 0.2s;',
    '}',
    '#tl-widget-close:hover{background:rgba(0,0,0,0.2);}',
    '#tl-widget-header{',
      'position:absolute;top:0;left:0;right:0;height:48px;',
      'background:linear-gradient(135deg,#1a56db,#0ea5e9);',
      'display:flex;align-items:center;padding:0 16px;z-index:5;',
    '}',
    '#tl-widget-header svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;}',
    '#tl-widget-header span{color:#fff;font-size:13px;font-weight:600;margin-left:8px;font-family:system-ui,sans-serif;}',
    '#tl-widget-sandbox-tag{',
      'margin-left:auto;background:rgba(255,255,255,0.2);',
      'color:#fff;font-size:10px;padding:2px 8px;border-radius:6px;',
      'font-weight:600;font-family:system-ui,sans-serif;',
    '}',
    '@media(max-width:520px){',
      '#tl-widget-frame-wrap{max-width:100%;height:100vh;max-height:100vh;border-radius:0;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  // ─── Shield SVG icon ────────────────────────────────────
  var shieldSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>';

  // ─── Create floating button ─────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'tl-widget-btn';
  btn.innerHTML = shieldSvg;
  btn.title = 'Pay securely with TrustLock Escrow';
  if (mode === 'sandbox') {
    var badge = document.createElement('span');
    badge.id = 'tl-widget-badge';
    badge.textContent = 'DEMO';
    btn.appendChild(badge);
  }
  document.body.appendChild(btn);

  // ─── Create overlay + iframe ────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = 'tl-widget-overlay';

  var frameWrap = document.createElement('div');
  frameWrap.id = 'tl-widget-frame-wrap';

  // Header
  var header = document.createElement('div');
  header.id = 'tl-widget-header';
  header.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg><span>TrustLock Escrow</span>';
  if (mode === 'sandbox') {
    var tag = document.createElement('span');
    tag.id = 'tl-widget-sandbox-tag';
    tag.textContent = 'SANDBOX';
    header.appendChild(tag);
  }
  frameWrap.appendChild(header);

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.id = 'tl-widget-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close';
  frameWrap.appendChild(closeBtn);

  // Iframe
  var iframe = document.createElement('iframe');
  var checkoutUrl = '${baseUrl}/pay/widget-checkout'
    + '?vendor=' + encodeURIComponent(vendorId)
    + '&site=' + encodeURIComponent(siteId)
    + '&mode=' + encodeURIComponent(mode)
    + '&embed=true'
    + (platformFee ? '&platform_fee=' + encodeURIComponent(platformFee) : '')
    + (platformName ? '&platform_name=' + encodeURIComponent(platformName) : '');
  iframe.src = 'about:blank';
  iframe.setAttribute('allow', 'payment');
  iframe.style.marginTop = '48px';
  iframe.style.height = 'calc(100% - 48px)';
  frameWrap.appendChild(iframe);

  overlay.appendChild(frameWrap);
  document.body.appendChild(overlay);

  // ─── Event handlers ─────────────────────────────────────
  function openWidget() {
    iframe.src = checkoutUrl;
    overlay.classList.add('tl-open');
    document.body.style.overflow = 'hidden';
  }

  function closeWidget() {
    overlay.classList.remove('tl-open');
    document.body.style.overflow = '';
    // Reset iframe after animation
    setTimeout(function() { iframe.src = 'about:blank'; }, 300);
  }

  btn.addEventListener('click', openWidget);
  closeBtn.addEventListener('click', closeWidget);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeWidget();
  });

  // Listen for messages from the iframe
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'tl:close') closeWidget();
    if (e.data.type === 'tl:payment_complete') {
      // Dispatch custom event for the host page
      var evt = new CustomEvent('trustlock:payment', { detail: e.data.payload });
      window.dispatchEvent(evt);
    }
  });

  console.log('[TrustLock] Widget loaded — mode: ' + mode + ', vendor: ' + vendorId);
})();
`;

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Determine base URL for the checkout iframe
  const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";

  const js = WIDGET_JS(baseUrl);

  return new Response(js, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-TrustLock-Version": "1.0.0",
    },
  });
});
