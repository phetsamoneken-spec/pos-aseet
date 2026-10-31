import express from 'express';
import crypto from 'node:crypto';
import { SheetStore } from './sheets.mjs';
import { hashPassword, verifyPassword, randomToken, tokenDigest } from './crypto.mjs';

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'16kb'}));
app.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  next();
});
const store=new SheetStore();
const teams=new Set(['B1','B2','B3','B4','B5','B6','B7']);
const validName=s=>typeof s==='string'&&/^[a-z0-9._-]{3,64}$/.test(s);
const publicUser=u=>({id:u.id,username:u.username,fullName:u.fullName,role:u.role,team:u.team,email:u.email,isActive:u.isActive==='true'});
const error=(res,status,message)=>res.status(status).json({error:message});
const expiry=()=>new Date(Date.now()+30*60*1000).toISOString();
const origin=process.env.APP_ORIGIN;
if(!origin||!/^https:\/\//.test(origin)) throw new Error('APP_ORIGIN must be an HTTPS origin');
app.use((req,res,next)=>{
  if(req.headers.origin&&req.headers.origin!==origin) return error(res,403,'Origin not allowed');
  if(req.method!=='GET'&&req.headers.origin!==origin) return error(res,403,'Origin required');
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(204);
  next();
});
const attempts=new Map();
function throttle(req,res,next){
  const key=req.ip+'|'+String(req.body?.username||'').toLowerCase();
  const entry=attempts.get(key)||{count:0,until:0};
  if(Date.now()<entry.until) return error(res,429,'Too many attempts');
  req.attemptKey=key;next();
}
function fail(req){const e=attempts.get(req.attemptKey)||{count:0,until:0};e.count++;e.until=e.count>=5?Date.now()+15*60*1000:0;attempts.set(req.attemptKey,e);}
async function requireAuth(req,res,next){
  try {
    const match=/^Bearer ([A-Za-z0-9_-]{40,100})$/.exec(req.get('Authorization')||'');
    if(!match) return error(res,401,'Unauthorized');
    const digest=tokenDigest(match[1]);
    const session=(await store.records('AUTH_SESSIONS')).find(s=>s.tokenHash===digest&&!s.revokedAt&&Date.parse(s.expiresAt)>Date.now());
    if(!session) return error(res,401,'Session expired');
    const user=(await store.records('AUTH_USERS')).find(u=>u.id===session.userId&&u.isActive==='true');
    if(!user) return error(res,401,'Unauthorized');
    req.user=user;req.session=session;next();
  }catch(e){next(e);}
}
function admin(req,res,next){if(req.user.role!=='ADMIN') return error(res,403,'Admin required');next();}
app.get('/health',(_req,res)=>res.json({ok:true}));
app.post('/auth/login',throttle,async(req,res,next)=>{
  try {
    const username=String(req.body?.username||'').trim().toLowerCase(),password=req.body?.password;
    if(!validName(username)||typeof password!=='string') return error(res,400,'Invalid credentials');
    const user=(await store.records('AUTH_USERS')).find(u=>u.username===username);
    if(!user||user.isActive!=='true'||(user.lockedUntil&&Date.parse(user.lockedUntil)>Date.now())||!await verifyPassword(password,user)){
      fail(req);return error(res,401,'Invalid credentials');
    }
    attempts.delete(req.attemptKey);
    const token=randomToken();
    await store.add('AUTH_SESSIONS',{tokenHash:tokenDigest(token),userId:user.id,expiresAt:expiry(),createdAt:new Date().toISOString()});
    res.json({token,expiresInSeconds:1800,user:publicUser(user)});
  }catch(e){next(e);}
});
app.post('/auth/logout',requireAuth,async(req,res,next)=>{
  try {req.session.revokedAt=new Date().toISOString();await store.update('AUTH_SESSIONS',req.session);res.json({ok:true});}catch(e){next(e);}
});
app.get('/auth/me',requireAuth,(req,res)=>res.json({user:publicUser(req.user)}));
app.get('/users',requireAuth,admin,async(req,res,next)=>{
  try{res.json({users:(await store.records('AUTH_USERS')).map(publicUser)});}catch(e){next(e);}
});
app.post('/users',requireAuth,admin,async(req,res,next)=>{
  try{
    const {username,fullName,role,team,email,password}=req.body||{};
    if(!validName(username)||typeof fullName!=='string'||!fullName.trim()||fullName.length>120||!['ADMIN','TEAM_USER'].includes(role)||(role==='ADMIN'?team!=='ALL':!teams.has(team))||typeof password!=='string') return error(res,400,'Invalid user');
    const users=await store.records('AUTH_USERS');
    if(users.some(u=>u.username===username)) return error(res,409,'Username exists');
    const passwordRecord=await hashPassword(password);
    const now=new Date().toISOString();
    const user={id:crypto.randomUUID(),username,fullName:fullName.trim(),role,team,email:typeof email==='string'?email.trim():'',isActive:'true',...passwordRecord,createdAt:now,updatedAt:now};
    await store.add('AUTH_USERS',user);
    res.status(201).json({user:publicUser(user)});
  }catch(e){if(e.message?.startsWith('Password must'))return error(res,400,e.message);next(e);}
});
app.get('/budgets/team/:team',requireAuth,(req,res)=>{
  const team=req.params.team;
  if(!teams.has(team)) return error(res,400,'Invalid team');
  if(req.user.role!=='ADMIN'&&req.user.team!==team) return error(res,403,'Forbidden');
  return error(res,501,'Budget server-side migration not yet implemented');
});
app.use((err,req,res,next)=>{console.error('Request failed',err?.message);error(res,500,'Internal server error');});
await store.setup();
const port=Number(process.env.PORT||8080);
app.listen(port,()=>console.log('Auth service listening on '+port));
