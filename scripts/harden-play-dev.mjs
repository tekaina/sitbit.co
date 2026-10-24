import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

if (process.env.GITHUB_REF_NAME !== 'play-web-redesign-2026-10-23') throw Error('Development branch only');
const require = createRequire(path.join(process.env.SITBIT_TOOL_ROOT, 'package.json'));
const {parse} = require('acorn');
const {JSDOM} = require('jsdom');
const target = 'js/play-app.js';
let source = fs.readFileSync(target, 'utf8');
const original = createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex');
assert.equal(original, 'aec72edce6cd7d8849abceb86be657d63270b393', 'Source changed; review instead of overwriting');
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['start','end','loc'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
};
const ast = text => parse(text, {ecmaVersion:'latest', sourceType:'module'});
let edits = [], verified = 0, profiles = 0, escapeFunctions = 0;
walk(ast(source), n => {
  if (n.type === 'FunctionDeclaration' && n.id?.name === 'isEmailVerifiedUser') {
    verified++;
    edits.push({start:n.start,end:n.end,text:'function isEmailVerifiedUser(user) { return Boolean(user && !user.isAnonymous && user.emailVerified === true); }'});
  }
  if (n.type === 'FunctionDeclaration' && n.id?.name === 'escapeHtml') {
    escapeFunctions++;
    edits.push({start:n.start,end:n.end,text:'function escapeHtml(value) { return escapeText(value); }'});
  }
  if (n.type === 'ObjectExpression') {
    const properties = n.properties;
    const names = properties.map(p => p.key?.name || p.key?.value);
    if (names.includes('displayName') && names.includes('level') && names.includes('skillScore') && names.includes('email')) {
      const i = names.indexOf('email');
      assert.ok(i + 1 < properties.length, 'Unexpected profile structure');
      edits.push({start:properties[i].start,end:properties[i+1].start,text:''});
      profiles++;
    }
  }
});
assert.equal(verified,1); assert.equal(profiles,2); assert.equal(escapeFunctions,1, 'Unexpected HTML helper structure');
for (const e of edits.sort((a,b)=>b.start-a.start)) source=source.slice(0,e.start)+e.text+source.slice(e.end);
edits=[];let sinks=0;
walk(ast(source), n => {
  if (n.type==='AssignmentExpression' && n.left.type==='MemberExpression' && n.left.property.name==='innerHTML') {
    assert.equal(n.operator,'=', 'Unsupported compound HTML assignment');
    edits.push({start:n.right.start,end:n.right.start,text:'safeHtml('},{start:n.right.end,end:n.right.end,text:')'});sinks++;
  }
  if(n.type==='TemplateLiteral') {
    for(const x of n.expressions) {
      const scalar=x.type==='MemberExpression';
      const named=x.type==='Identifier';
      if(scalar||named)edits.push({start:x.start,end:x.start,text:'escapeText('},{start:x.end,end:x.end,text:')'});
    }
  }
  if(n.type==='MemberExpression' && ['outerHTML','srcdoc','insertAdjacentHTML','createContextualFragment'].includes(n.property.name)) throw Error('Additional HTML sink requires manual review');
});
assert.ok(sinks>0);
for(const e of edits.sort((a,b)=>b.start-a.start)) source=source.slice(0,e.start)+e.text+source.slice(e.end);
source="import { safeHtml, escapeText } from './web-safety.mjs';\n"+source;
let checked=0;
walk(ast(source), n=>{
 if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.property.name==='innerHTML') {
  assert.equal(n.right.type,'CallExpression');assert.equal(n.right.callee.name,'safeHtml');checked++;
 }
});
assert.equal(checked,sinks);
const vendor=path.dirname(path.dirname(require.resolve('dompurify')));
fs.mkdirSync('vendor/dompurify',{recursive:true});
fs.copyFileSync(path.join(vendor,'dist/purify.es.mjs'),'vendor/dompurify/purify.es.mjs');
fs.copyFileSync(path.join(vendor,'LICENSE'),'vendor/dompurify/LICENSE');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://sitbit.co/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;
const safety=await import(pathToFileURL(path.resolve('js/web-safety.mjs')).href);
let tests=0;
for(const payload of [
 '<img src="https://evil.invalid/a" onerror="alert(1)">',
 '<svg onload="alert(1)"></svg>',
 '<a href="javascript:alert(1)">bad</a>',
 '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
 '<input autofocus onfocus="alert(1)">'
]) {
 const holder=dom.window.document.createElement('div');holder.innerHTML=safety.safeHtml(payload);
 assert.equal(holder.querySelectorAll('script,iframe,svg,object,embed').length,0);
 for(const element of holder.querySelectorAll('*')) for(const a of element.attributes) {
  assert.ok(!a.name.toLowerCase().startsWith('on'));assert.ok(!/^javascript:/i.test(a.value));
 }
 tests++;
}
assert.equal(safety.safeAvatar('javascript:alert(1)'),'');tests++;
assert.equal(safety.safeAvatar('https://firebasestorage.googleapis.com.evil.invalid/a'),'');tests++;
assert.equal(safety.safeAvatar('https://firebasestorage.googleapis.com/a'),'https://firebasestorage.googleapis.com/a');tests++;
const holder=dom.window.document.createElement('div');holder.innerHTML=safety.safeHtml('<button id="join" data-id="abc">Join</button><form id="wizard"><input name="title"></form>');
assert.ok(holder.querySelector('#join'));assert.ok(holder.querySelector('#wizard'));tests++;
const hostile='"><img src=x onerror=alert(1)>';
holder.innerHTML=safety.safeHtml('<img src="https://firebasestorage.googleapis.com/a" alt="'+safety.escapeText(hostile)+'">');
assert.equal(holder.querySelectorAll('img').length,1);assert.equal(holder.querySelector('img').getAttribute('alt'),hostile);tests++;
const f=[];walk(ast(source),n=>{if(n.type==='FunctionDeclaration'&&n.id?.name==='isEmailVerifiedUser')f.push(n);});
const verifiedUser=new Function('return ('+source.slice(f[0].start,f[0].end)+')')();
assert.equal(verifiedUser({emailVerified:false,isAnonymous:false}),false);tests++;
assert.equal(verifiedUser({emailVerified:true,isAnonymous:false}),true);tests++;
assert.equal(verifiedUser({emailVerified:true,isAnonymous:true}),false);tests++;
assert.equal(verifiedUser(null),false);tests++;
fs.writeFileSync(target,source);
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/web-hardening-report.json',JSON.stringify({originalBlob:original,htmlSinksWrapped:sinks,profileEmailPropertiesRemoved:profiles,testsPassed:tests,dompurify:'3.4.17',scope:'Development source and jsdom unit tests only; no Firebase/browser integration or production verification'},null,2)+'\n');
console.log(JSON.stringify({htmlSinksWrapped:sinks,testsPassed:tests}));
