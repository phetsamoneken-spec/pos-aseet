import LZString from 'lz-string';

export function encodeSheetPublication(value: PendingSheetPublish): string { return 'lz1:'+LZString.compressToUTF16(JSON.stringify(value)); }
export function decodeSheetPublication(text: string): PendingSheetPublish { return JSON.parse(text.startsWith('lz1:')?LZString.decompressFromUTF16(text.slice(4)):text); }

export interface SheetPublishSource { fileName?: string; importedCount?: number; }
export interface PendingSheetPublish extends SheetPublishSource {
  id: string;
  actorId: string;
  endpoint: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

// A lock timeout means Apps Script did not enter the write handler. Retry only
// that explicit response, keeping the exact revision and payload unchanged.
export async function publishWithLockRetry<T extends {success:boolean;message?:string;error?:string}>(
  send: () => Promise<T>,
  onWait: (attempt:number, delayMs:number) => void,
  wait: (ms:number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve,ms))
): Promise<T> {
  for(let attempt=0;;attempt++){
    const result=await send();
    if(result.success||attempt>=3||!/Lock timeout|another process was holding the lock|could not acquire.*lock/i.test(result.message||result.error||''))return result;
    const delayMs=2000*2**attempt;
    onWait(attempt+1,delayMs);
    await wait(delayMs);
  }
}
