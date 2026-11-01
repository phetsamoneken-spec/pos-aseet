import type { User } from '../types';
import type { BusinessSnapshot } from './businessData';
export interface AccountResponse { success: boolean; message?: string; error?: string; user?: User; users?: User[]; token?: string; expiresAt?: string; dataVersion?:number; scope?:string; snapshot?:BusinessSnapshot; spreadsheetId?:string; writeVersion?:number; retryable?:boolean; mutationId?:string; customerCodes?:string[]; patch?:BusinessSnapshot; entityId?:string; businessRevision?:string; settingsVersion?:number; settings?:unknown; }
let memory: { endpoint: string; token: string; expiresAt: string } | null = null;
function key(endpoint: string) { return 'mkt-sheet-session:' + endpoint; }
export function remoteSession(endpoint: string) {
  try { const value = sessionStorage.getItem(key(endpoint)); if (value) memory = { endpoint, ...JSON.parse(value) }; } catch {}
  return memory?.endpoint === endpoint && Date.parse(memory.expiresAt) > Date.now() ? memory : null;
}
export function clearRemoteSession(endpoint: string) {
  if (memory?.endpoint === endpoint) memory = null;
  try { sessionStorage.removeItem(key(endpoint)); } catch {}
}
export async function accountRequest(endpoint: string, action: string, payload: Record<string, unknown> = {}): Promise<AccountResponse> {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/.test(endpoint)) return { success:false, message:'Set the deployed Apps Script /exec URL in Settings or Sign In.' };
  try {
    const response = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,payload,authToken:remoteSession(endpoint)?.token})});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json() as AccountResponse;
    if (result.success !== true) return {success:false,message:result.message || result.error || 'Account operation failed',writeVersion:result.writeVersion,retryable:result.retryable};
    if (result.token && result.expiresAt) {
      memory = {endpoint,token:result.token,expiresAt:result.expiresAt};
      try { sessionStorage.setItem(key(endpoint), JSON.stringify({token:result.token,expiresAt:result.expiresAt})); } catch {}
    }
    return result;
  } catch (error) { return {success:false,message:error instanceof Error ? error.message : String(error)}; }
}
