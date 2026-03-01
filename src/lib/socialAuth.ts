// ─────────────────────────────────────────────────────────────────────────────
// Social Auth — Google · Facebook · Apple
//
// In DEMO mode (no env vars): shows a realistic mock popup.
// In LIVE mode (env vars set): calls the real provider SDK.
//
// Required env vars (add to .env.local):
//   VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
//   VITE_FACEBOOK_APP_ID=xxxx
//   VITE_APPLE_CLIENT_ID=com.yourhotel.web
//   VITE_APPLE_REDIRECT_URI=https://yourdomain.com/auth/apple/callback
// ─────────────────────────────────────────────────────────────────────────────

export interface SocialUser {
    provider: 'google' | 'facebook' | 'apple' | 'demo';
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    token?: string;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
const APPLE_REDIRECT = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;

export const HAS_GOOGLE = Boolean(GOOGLE_CLIENT_ID);
export const HAS_FACEBOOK = Boolean(FACEBOOK_APP_ID);
export const HAS_APPLE = Boolean(APPLE_CLIENT_ID);

// ── Script loader helper ──────────────────────────────────────────────────────
function loadScript(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) { resolve(); return; }
        const s = document.createElement('script');
        s.id = id; s.src = src; s.async = true; s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE Sign-In
// ─────────────────────────────────────────────────────────────────────────────
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (cfg: object) => void;
                    prompt: () => void;
                    renderButton: (el: HTMLElement, cfg: object) => void;
                };
                oauth2?: {
                    initTokenClient: (cfg: object) => { requestAccessToken: () => void };
                };
            };
        };
        FB?: {
            init: (cfg: object) => void;
            login: (cb: (res: { authResponse?: { accessToken: string } }) => void, opts: object) => void;
            api: (path: string, opts: object, cb: (res: Record<string, string>) => void) => void;
        };
        AppleID?: {
            auth: {
                init: (cfg: object) => void;
                signIn: () => Promise<{
                    authorization: { id_token: string };
                    user?: { name?: { firstName?: string; lastName?: string }; email?: string };
                }>;
            };
        };
    }
}

export async function signInWithGoogle(): Promise<SocialUser> {
    if (!HAS_GOOGLE) return signInDemo('google');

    await loadScript('https://accounts.google.com/gsi/client', 'google-gsi');

    return new Promise((resolve, reject) => {
        window.google!.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: { credential: string }) => {
                try {
                    // Decode JWT payload (no crypto verification needed here; server handles that)
                    const payloadB64 = response.credential.split('.')[1];
                    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
                    resolve({
                        provider: 'google',
                        providerId: payload.sub,
                        email: payload.email,
                        firstName: payload.given_name || '',
                        lastName: payload.family_name || '',
                        avatar: payload.picture,
                        token: response.credential,
                    });
                } catch {
                    reject(new Error('Failed to parse Google credential'));
                }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
        });
        window.google!.accounts.id.prompt();
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK Login
// ─────────────────────────────────────────────────────────────────────────────
export async function signInWithFacebook(): Promise<SocialUser> {
    if (!HAS_FACEBOOK) return signInDemo('facebook');

    await loadScript('https://connect.facebook.net/en_US/sdk.js', 'fb-sdk');

    window.FB!.init({ appId: FACEBOOK_APP_ID, version: 'v19.0', cookie: true, xfbml: true });

    return new Promise((resolve, reject) => {
        window.FB!.login(
            (response) => {
                if (!response.authResponse) { reject(new Error('Facebook login cancelled')); return; }
                const token = response.authResponse.accessToken;
                window.FB!.api('/me', { fields: 'id,first_name,last_name,email,picture.width(200)' }, (user) => {
                    if (!user || !user.email) { reject(new Error('Facebook did not return email — check app permissions.')); return; }
                    resolve({
                        provider: 'facebook',
                        providerId: user['id'],
                        email: user['email'],
                        firstName: user['first_name'] || '',
                        lastName: user['last_name'] || '',
                        avatar: (user as any).picture?.data?.url,
                        token,
                    });
                });
            },
            { scope: 'email,public_profile' }
        );
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLE Sign-In
// ─────────────────────────────────────────────────────────────────────────────
export async function signInWithApple(): Promise<SocialUser> {
    if (!HAS_APPLE) return signInDemo('apple');

    await loadScript(
        'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
        'apple-sign-in'
    );

    window.AppleID!.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: APPLE_REDIRECT || window.location.origin,
        usePopup: true,
    });

    const result = await window.AppleID!.auth.signIn();
    const token = result.authorization.id_token;

    // Decode JWT (name/email only available on first sign-in)
    let email = result.user?.email || '';
    let firstName = result.user?.name?.firstName || '';
    let lastName = result.user?.name?.lastName || '';

    if (!email && token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            email = payload.email || '';
            const sub = payload.sub || String(Date.now());
            return { provider: 'apple', providerId: sub, email, firstName, lastName, token };
        } catch { /* ignore */ }
    }

    return {
        provider: 'apple',
        providerId: String(Date.now()),
        email, firstName, lastName, token,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO simulation — realistic mock OAuth
// presents a modal-like resolution via Promise that the UI layer controls
// ─────────────────────────────────────────────────────────────────────────────
type DemoProvider = 'google' | 'facebook' | 'apple';

// Each demo provider returns a seeded fake user
const DEMO_USERS: Record<DemoProvider, Omit<SocialUser, 'provider'>> = {
    google: {
        providerId: 'google-demo-001',
        email: 'marco.demo@gmail.com',
        firstName: 'Marco',
        lastName: 'Demo',
        avatar: 'https://ui-avatars.com/api/?name=Marco+Demo&background=4285f4&color=fff&size=128',
        token: 'demo-google-token',
    },
    facebook: {
        providerId: 'facebook-demo-001',
        email: 'sophie.demo@facebook.com',
        firstName: 'Sophie',
        lastName: 'Demo',
        avatar: 'https://ui-avatars.com/api/?name=Sophie+Demo&background=1877f2&color=fff&size=128',
        token: 'demo-facebook-token',
    },
    apple: {
        providerId: 'apple-demo-001',
        email: 'james.demo@icloud.com',
        firstName: 'James',
        lastName: 'Demo',
        avatar: 'https://ui-avatars.com/api/?name=James+Demo&background=000000&color=fff&size=128',
        token: 'demo-apple-token',
    },
};

// We use a module-level Promise pair so the UI can resolve/reject externally
let _demoResolve: ((u: SocialUser) => void) | null = null;
let _demoReject: ((e: Error) => void) | null = null;
let _pendingProvider: DemoProvider | null = null;

export function getPendingDemoProvider(): DemoProvider | null { return _pendingProvider; }
export function getDemoUserForProvider(p: DemoProvider) { return DEMO_USERS[p]; }

export function confirmDemoSignIn(email?: string, firstName?: string, lastName?: string): void {
    if (!_demoResolve || !_pendingProvider) return;
    const base = DEMO_USERS[_pendingProvider];
    _demoResolve({
        ...base,
        provider: _pendingProvider,
        email: email || base.email,
        firstName: firstName || base.firstName,
        lastName: lastName || base.lastName,
    });
    _demoResolve = null; _demoReject = null; _pendingProvider = null;
}

export function cancelDemoSignIn(): void {
    _demoReject?.(new Error('Sign-in cancelled'));
    _demoResolve = null; _demoReject = null; _pendingProvider = null;
}

function signInDemo(provider: DemoProvider): Promise<SocialUser> {
    _pendingProvider = provider;
    return new Promise((resolve, reject) => {
        _demoResolve = resolve;
        _demoReject = reject;
        // The UI component listens for `_pendingProvider` to show the demo modal
        // It will call confirmDemoSignIn() or cancelDemoSignIn()
        window.dispatchEvent(new CustomEvent('social-auth-demo', { detail: { provider } }));
    });
}
