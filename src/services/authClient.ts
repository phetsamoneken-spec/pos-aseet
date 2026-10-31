// Session token is held in memory only. Never write it to localStorage.
export type Team = 'B1'|'B2'|'B3'|'B4'|'B5'|'B6'|'B7';
export interface AuthUser { id:string; username:string; fullName:string; role:'ADMIN'|'TEAM_USER'; team:Team|'ALL'; email?:string; isActive:boolean }
let token: string | null = null;
let user: AuthUser | null = null;
const endpoint=(import.meta.env.VITE_AUTH_API_URL as string|undefined)?.replace(/\/$/,'');
async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  if(!endpoint || !/^https:\/\//.test(endpoint)) throw new Error('Private authentication API is not configured');
  const headers=new Headers(init.headers);
  headers.set('Content-Type','application/json');
  if(token) headers.set('Authorization','Bearer '+token);
  const response=await fetch(endpoint+path,{...init,headers,cache:'no-store'});
  const json=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(json.error||'Authentication request failed');
  return json as T;
}
export const authClient={
  getUser:()=>user,
  async login(username:string,password:string){
    const result=await request<{token:string;user:AuthUser}>('/auth/login',{method:'POST',body:JSON.stringify({username,password})});
    token=result.token;user=result.user;return result.user;
  },
  async me(){const result=await request<{user:AuthUser}>('/auth/me');user=result.user;return user;},
  async logout(){
    try {if(token) await request('/auth/logout',{method:'POST'});}finally{token=null;user=null;}
  },
  async listUsers(){return request<{users:AuthUser[]}>('/users');},
  async createUser(data:{username:string;fullName:string;role:'ADMIN'|'TEAM_USER';team:Team|'ALL';email?:string;password:string}){
    return request<{user:AuthUser}>('/users',{method:'POST',body:JSON.stringify(data)});
  }
};
