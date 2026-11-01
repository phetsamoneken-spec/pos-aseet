import type {BusinessSnapshot} from './businessData';
import type {User,AppSettings,ActivityLog} from '../types';
import {sharedSettings} from './sharedSettings';
export interface BrowserRecovery {id:string;createdAt:string;actorId:string;endpoint:string;spreadsheetId:string;reason:string;business:BusinessSnapshot;users:Omit<User,'password'>[];settings:Partial<AppSettings>;logs:ActivityLog[]}
export function makeBrowserRecovery(snapshot:BusinessSnapshot,users:User[],settings:AppSettings,logs:ActivityLog[],actor:User,reason:string):BrowserRecovery {
 const customers=snapshot.customers.filter(c=>actor.role==='ADMIN'||c.team===actor.team),codes=new Set(customers.map(c=>c.code));
 const business:BusinessSnapshot={customers,conditions:snapshot.conditions.filter(c=>codes.has(c.customerCode)),contracts:snapshot.contracts.filter(c=>codes.has(c.customerCode)&&(actor.role==='ADMIN'||c.team===actor.team)),budgets:snapshot.budgets.filter(c=>codes.has(c.customerCode)&&(actor.role==='ADMIN'||c.team===actor.team)),transactions:snapshot.transactions.filter(c=>codes.has(c.customerCode)&&(actor.role==='ADMIN'||c.team===actor.team))};
 return JSON.parse(JSON.stringify({id:'REC-'+crypto.randomUUID(),createdAt:new Date().toISOString(),actorId:actor.id,endpoint:settings.appsScriptUrl,spreadsheetId:settings.spreadsheetId,reason,business,users:users.filter(user=>actor.role==='ADMIN'||user.id===actor.id).map(user=>({id:user.id,username:user.username,fullName:user.fullName,email:user.email,role:user.role,team:user.team,isActive:user.isActive,createdAt:user.createdAt,lastLogin:user.lastLogin,status:user.status,updatedAt:user.updatedAt,deletedAt:user.deletedAt})),settings:sharedSettings(settings),logs:logs.filter(log=>actor.role==='ADMIN'||log.team===actor.team&&log.user===actor.username)}));
}
