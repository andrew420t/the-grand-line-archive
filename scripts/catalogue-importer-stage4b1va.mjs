#!/usr/bin/env node
// Stage 4B-1V-A: pinned-source dry-run planner. No Supabase SDK, credentials, network or write path.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const SOURCE_COMMIT='619965ec198047de519dc6eb098c7a56aed9bd58';
export const TESTING_PROJECT_REF='ehzqsnfkmwphyllhaqhe';
export const DESTINATIONS={set:'catalogue_release_sets',product:'catalogue_release_products',card:'catalogue_cards',printing:'catalogue_printings',printing_locator:'catalogue_printing_images',product_set:'catalogue_product_sets',printing_product:'catalogue_product_printings',card_observation:'catalogue_card_observations'};
export const PROTECTED=['public.products','public.cards','public.sets','public.product_images','public.orders','public.order_items','public.profiles','public.catalogue_inventory_links'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const jsonl=f=>fs.readFileSync(f,'utf8').split(/\r?\n/).filter(Boolean).map((s,i)=>{try{return JSON.parse(s)}catch{throw Error(`Invalid JSON at ${f}:${i+1}`)}}); 
const langKey=(l,k)=>l+':'+k;
export function plan(root,{projectRef=TESTING_PROJECT_REF,sourceCommit=SOURCE_COMMIT}={}){
 if(projectRef!==TESTING_PROJECT_REF)throw Error('Wrong project: Testing project reference required');
 if(sourceCommit!==SOURCE_COMMIT)throw Error('Wrong pinned source commit');
 const mb=fs.readFileSync(path.join(root,'manifest.json')),m=JSON.parse(mb);
 if(m.schema_version!==1||Object.keys(m.files||{}).length!==27)throw Error('Incomplete/unsupported manifest');
 const data={},fileReport={};
 for(const [p,v] of Object.entries(m.files)){
  const b=fs.readFileSync(path.join(root,p)),rows=jsonl(path.join(root,p)),h=hash(b);
  if(h!==v.sha256)throw Error('SHA256 mismatch: '+p);
  if(rows.length!==v.rows)throw Error('Row count mismatch: '+p);
  data[p]=rows;fileReport[p]={type:v.type,sourceRows:rows.length,sha256:h,destination:DESTINATIONS[v.type]||null,eligibleSourceRows:0,excludedSourceRows:rows.length};
 }
 const get=p=>data['data/'+p+'.jsonl']||[], group=(d,l)=>data[`data/${d}/${l}.jsonl`]||[];
 const wanted=/^(OP-(0[1-9]|1[0-8])|EB-0[1-5]|PRB-0[1-2])$/;
 const sets=get('sets').filter(x=>wanted.test(x.code||x.key)),setKeys=new Set(sets.map(x=>x.key));
 const allProducts=['en','jp'].flatMap(l=>group('products',l).map(x=>({...x,language:l})));
 const productsByKey=new Map(allProducts.map(x=>[x.key,x]));
 const productSets=get('product_sets').filter(x=>setKeys.has(x.set_key)&&productsByKey.has(x.product_key));
 const productKeys=new Set(productSets.map(x=>x.product_key));
 const products=allProducts.filter(x=>productKeys.has(x.key)&&x.kind!=='bucket');
 const pp=['en','jp'].flatMap(l=>group('printing_products',l).map(x=>({...x,language:l}))).filter(x=>productKeys.has(x.product_key));
 const ppKeys=new Set(pp.map(x=>langKey(x.language,x.printing_key)));
 const printings=['en','jp'].flatMap(l=>group('printings',l).map(x=>({...x,language:l}))).filter(x=>ppKeys.has(langKey(x.language,x.key))&&x.site===x.language);
 const printingKeys=new Set(printings.map(x=>langKey(x.language,x.key)));
 const cardKeys=new Set(printings.map(x=>langKey(x.language,x.card_key)));
 const cards=get('cards').flatMap(x=>['en','jp'].filter(l=>cardKeys.has(langKey(l,x.key))).map(l=>({...x,language:l})));
 const observations=['en','jp'].flatMap(l=>group('card_observations',l).map(x=>({...x,language:l}))).filter(x=>cardKeys.has(langKey(x.language,x.card_key)));
 const locators=['en','jp'].flatMap(l=>group('printing_locators',l).map(x=>({...x,language:l}))).filter(x=>printingKeys.has(langKey(x.language,x.printing_key)));
 const errors=[];
 for(const p of printings)if(!cardKeys.has(langKey(p.language,p.card_key)))errors.push('missing card '+p.key);
 for(const x of pp)if(!printingKeys.has(langKey(x.language,x.printing_key)))errors.push('missing printing '+x.key);
 const officialImages=locators.filter(l=>{const p=printings.find(x=>x.language===l.language&&x.key===l.printing_key);return p?.image_url&&/^https:\/\/(en|www)\.onepiece-cardgame\.com\//.test(p.image_url)});
 const derivedSetEdges=new Set();
 for(const x of pp)for(const ps of productSets)if(ps.product_key===x.product_key)derivedSetEdges.add([ps.set_key,x.language,x.printing_key].join('|'));
 const eligible={'data/sets.jsonl':sets.length,'data/cards.jsonl':new Set(cards.map(x=>x.key)).size,'data/product_sets.jsonl':productSets.length};
 for(const folder of ['products','printings','printing_products','printing_locators','card_observations'])for(const l of ['en','jp'])eligible[`data/${folder}/${l}.jsonl`]=({products,printings,printing_products:pp,printing_locators:locators,card_observations:observations})[folder].filter(x=>x.language===l).length;
 for(const [p,n] of Object.entries(eligible)){fileReport[p].eligibleSourceRows=n;fileReport[p].excludedSourceRows=fileReport[p].sourceRows-n}
 const totals={catalogue_release_sets:sets.length,catalogue_release_products:products.length,catalogue_cards:cards.length,catalogue_printings:printings.length,catalogue_printing_images:officialImages.length,catalogue_product_sets:productSets.length,catalogue_product_printings:pp.length,catalogue_set_printings:derivedSetEdges.size,catalogue_card_observations:observations.length,catalogue_inventory_links:0};
 const unsupported=Object.entries(m.files).filter(([,v])=>!DESTINATIONS[v.type]).map(([file,v])=>({file,rows:v.rows,type:v.type,reason:'No lossless destination in approved Stage 4B-1R/1T schema'}));
 const setCoverage=sets.map(s=>{const pkeys=new Set(productSets.filter(x=>x.set_key===s.key).map(x=>x.product_key));return {set:s.code||s.key,en:new Set(pp.filter(x=>x.language==='en'&&pkeys.has(x.product_key)).map(x=>x.printing_key)).size,jp:new Set(pp.filter(x=>x.language==='jp'&&pkeys.has(x.product_key)).map(x=>x.printing_key)).size}});
 return {stage:'4B-1V-A',mode:'DRY_RUN_ONLY',status:errors.length?'BLOCKED':'PLAN_WITH_EXPLICIT_EXCLUSIONS',sourceCommit,manifestGeneratedAt:m.generated_at,manifestSha256:hash(mb),sourceRows:Object.values(fileReport).reduce((n,x)=>n+x.sourceRows,0),sourceFiles:fileReport,plannedDestinationRows:totals,languageTotals:Object.fromEntries(['en','jp'].map(l=>[l,{cards:cards.filter(x=>x.language===l).length,printings:printings.filter(x=>x.language===l).length,products:products.filter(x=>x.language===l).length,observations:observations.filter(x=>x.language===l).length}])),setCoverage,unsupportedFiles:unsupported,relationshipErrors:errors,protectedTables:PROTECTED,writesPerformed:0,notes:['No database connection or write capability exists in this stage.','CN and TCGCSV are excluded from the English/Japanese catalogue.','OP-18 and EB-05 are absent from this feed and require separate local official supplements.','Design, distribution, DON-design and retired-printing source types have no lossless destination in the approved schema.','Reconcile derived set edges against the Stage 4B-1Q official manifest before any live import.']};
}
if(import.meta.url===`file://${process.argv[1]}`){
 try{const a=process.argv.slice(2),i=a.indexOf('--source-dir');if(!a.includes('--dry-run'))throw Error('Only --dry-run is supported');if(i<0)throw Error('--source-dir required');const r=plan(a[i+1]);const out=JSON.stringify(r,null,2)+'\n',o=a.indexOf('--output');if(o>=0)fs.writeFileSync(a[o+1],out);process.stdout.write(out);if(r.status==='BLOCKED')process.exitCode=2}catch(e){console.error(e.message);process.exitCode=1}
}
