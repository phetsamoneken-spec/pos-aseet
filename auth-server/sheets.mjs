import { google } from 'googleapis';
const USERS = 'AUTH_USERS';
const SESSIONS = 'AUTH_SESSIONS';
const HEADERS = {
  [USERS]: ['id','username','fullName','role','team','email','isActive','algorithm','salt','hash','createdAt','updatedAt','failedAttempts','lockedUntil'],
  [SESSIONS]: ['tokenHash','userId','expiresAt','revokedAt','createdAt']
};
const col = n => { let s=''; for (n++; n; n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; };
export class SheetStore {
  constructor() {
    if (!process.env.SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is required');
    this.id=process.env.SPREADSHEET_ID;
    this.api=google.sheets({version:'v4',auth:new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets']})});
  }
  async setup() {
    const meta=await this.api.spreadsheets.get({spreadsheetId:this.id,fields:'sheets.properties.title'});
    const existing=new Set((meta.data.sheets||[]).map(s=>s.properties.title));
    const requests=Object.keys(HEADERS).filter(name=>!existing.has(name)).map(title=>({addSheet:{properties:{title}}}));
    if(requests.length) await this.api.spreadsheets.batchUpdate({spreadsheetId:this.id,requestBody:{requests}});
    for(const name of Object.keys(HEADERS)) {
      const rows=await this.read(name);
      if(!rows.length) await this.api.spreadsheets.values.update({spreadsheetId:this.id,range:`'${name}'!A1`,valueInputOption:'RAW',requestBody:{values:[HEADERS[name]]}});
      else if(JSON.stringify(rows[0])!==JSON.stringify(HEADERS[name])) throw new Error('Unexpected headers in '+name);
    }
  }
  async read(name) {
    const result=await this.api.spreadsheets.values.get({spreadsheetId:this.id,range:`'${name}'!A:O`});
    return result.data.values||[];
  }
  async records(name) {
    const rows=await this.read(name);
    if(!rows.length) throw new Error('Missing sheet '+name+'; run setup first');
    if(JSON.stringify(rows[0])!==JSON.stringify(HEADERS[name])) throw new Error('Unexpected headers '+name);
    return rows.slice(1).map((values,i)=>({row:i+2,...Object.fromEntries(HEADERS[name].map((key,j)=>[key,values[j]??'']))})).filter(r=>r[HEADERS[name][0]]);
  }
  async add(name,record) {
    const values=HEADERS[name].map(k=>String(record[k]??''));
    await this.api.spreadsheets.values.append({spreadsheetId:this.id,range:`'${name}'!A:${col(values.length-1)}`,valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[values]}});
  }
  async update(name,record) {
    if(!Number.isSafeInteger(record.row)||record.row<2) throw new Error('Invalid row');
    const values=HEADERS[name].map(k=>String(record[k]??''));
    await this.api.spreadsheets.values.update({spreadsheetId:this.id,range:`'${name}'!A${record.row}:${col(values.length-1)}${record.row}`,valueInputOption:'RAW',requestBody:{values:[values]}});
  }
}
