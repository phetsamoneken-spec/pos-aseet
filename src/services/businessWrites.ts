export type BusinessWriteKind='ADD_CUSTOMER'|'DELETE_CUSTOMER'|'DELETE_ALL_CUSTOMERS'|'ADD_TRANSACTION'|'CANCEL_TRANSACTION'|'NEW_CONTRACT'|'UPDATE_BUDGET'|'REPRICE';
export interface PendingBusinessWrite {id:string;kind:BusinessWriteKind;data:Record<string,unknown>;actorId:string;endpoint:string;createdAt:string}
export interface BusinessWriteResult {success:boolean;message:string;entityId?:string}
export interface BusinessWriteState {status:'idle'|'saving'|'error'|'saved';message:string;pending:boolean}
export function businessWriteKey(actorId:string,endpoint:string){return 'foc-pending-write-v1:'+actorId+':'+endpoint;}
export function newBusinessWriteId(){return 'OP-'+crypto.randomUUID();}
