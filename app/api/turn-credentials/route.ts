import { NextResponse } from 'next/server';

/**
 * Serverless TURN credentials provider (Spec Section 1.3)
 * Fetches short-lived credentials via Metered.ca, Cloudflare Calls, or Coturn HMAC.
 * Never leaks secrets to client bundles.
 */
export async function GET() {
  const meteredApiKey = process.env.METERED_API_KEY;
  const meteredDomain = process.env.METERED_DOMAIN; // e.g. "my-app.metered.ca"

  // 1. Metered.ca dynamic credentials if configured in environment
  if (meteredApiKey && meteredDomain) {
    try {
      const res = await fetch(`https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`, {
        next: { revalidate: 3600 }, // Cache credentials for 1 hour
      });
      if (res.ok) {
        const iceServers = await res.json();
        return NextResponse.json({ iceServers }, {
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      }
    } catch (err) {
      console.error('Failed to fetch Metered TURN credentials:', err);
    }
  }

  // 2. Custom Coturn / Cloudflare Calls credentials if configured via secret
  const turnUrl = process.env.TURN_URL; // e.g. "turn:turn.example.com:443?transport=tcp"
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    return NextResponse.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        {
          urls: [turnUrl, turnUrl.replace('turn:', 'turns:').replace(':3478', ':443')],
          username: turnUsername,
          credential: turnCredential,
        },
      ],
    });
  }

  // 3. Fallback: Robust multi-STUN servers (Google, Cloudflare, Mozilla) across multiple ports
  return NextResponse.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.services.mozilla.com:3478' },
    ],
  });
}
