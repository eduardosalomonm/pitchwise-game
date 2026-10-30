import { headers } from 'next/headers';

// Sites supplies these headers after sign-in and strips caller-supplied values.
// The Sites Vite plugin provides the same contract on loopback during preview.
export async function getChatGPTUser() {
  const values = await headers();
  const id = values.get('oai-authenticated-user-id');
  const email = values.get('oai-authenticated-user-email');
  return id && email ? { id, email } : null;
}
export function chatGPTSignInPath() {
  return '/signin-with-chatgpt?return_to=%2Fplaytest';
}
