import { Platform } from 'react-native';

let DEFAULT_GRAPHQL_UPSTREAM_URL = 'https://miliki.ke/graphql';
let DEFAULT_PORTAL_URL = 'https://miliki.ke/properties';
let DEFAULT_WS_UPSTREAM_URL = 'wss://miliki.ke/graphql';

if (__DEV__ && Platform.OS === 'web') {
    // Use local backend during development if env vars are not set.
    DEFAULT_GRAPHQL_UPSTREAM_URL = 'http://victor-personal:8000/graphql';
    DEFAULT_PORTAL_URL = 'http://victor-personal:8000/properties';
    DEFAULT_WS_UPSTREAM_URL = 'ws://victor-personal:8000/graphql';
}

const WEB_DEV_PROXY_GRAPHQL_URL = '/api/graphql';

// Upstream backend target (used by native directly and by web proxy route).
export const GRAPHQL_UPSTREAM_URL =
	process.env.EXPO_PUBLIC_GRAPHQL_UPSTREAM_URL ?? DEFAULT_GRAPHQL_UPSTREAM_URL;

// Dev web uses same-origin proxy to avoid CORS; all other environments use upstream URL.
export const API_URL =
	process.env.EXPO_PUBLIC_API_URL ??
	(Platform.OS === 'web' && __DEV__ ? WEB_DEV_PROXY_GRAPHQL_URL : GRAPHQL_UPSTREAM_URL);

export const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? DEFAULT_PORTAL_URL;

// Keep websocket URL absolute; API_URL can be relative when web dev proxy is enabled.
export const WS_API_URL = process.env.EXPO_PUBLIC_WS_API_URL ?? DEFAULT_WS_UPSTREAM_URL;


export const TOKEN_KEY = 'monerom_auth_token';
export const REFRESH_TOKEN_KEY = 'monerom_refresh_token';
export const ACTIVE_COMPANY_KEY = 'monerom_active_company';
export const LAST_REFRESH_KEY = 'monerom_last_refresh';
export const HAS_SUBSCRIPTION_KEY = 'monerom_has_subscription';
