import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, randomToken, tokenDigest } from '../crypto.mjs';
test('unique salts, verification and opaque tokens', async()=>{
 const a=await hashPassword('long-test-password-A!'), b=await hashPassword('long-test-password-A!');
 assert.notEqual(a.salt,b.salt); assert.notEqual(a.hash,b.hash);
 assert.equal(await verifyPassword('long-test-password-A!',a),true);
 assert.equal(await verifyPassword('wrong-password',a),false);
 assert.notEqual(randomToken(),randomToken());
 assert.match(tokenDigest(randomToken()),/^[a-f0-9]{64}$/);
});
test('reject short password',async()=>assert.rejects(hashPassword('short')));
