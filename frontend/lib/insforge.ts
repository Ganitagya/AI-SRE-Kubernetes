/**
 * lib/insforge.ts – InsForge SDK client singleton.
 * Configured with project URL and anon key from environment.
 */

import { createClient } from '@insforge/sdk';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://vsij6uxi.eu-central.insforge.app';
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

if (!INSFORGE_ANON_KEY) {
  console.warn('NEXT_PUBLIC_INSFORGE_ANON_KEY not set - some features may not work');
}

export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

