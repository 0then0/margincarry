// Optional developer harness, never included in the product XPI.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const project = resolve('.');
const root = resolve('.local'),
  profile = resolve('.local/profile'),
  data = resolve('.local/data');
try {
  await readFile(`${profile}/user.js`);
  throw new Error('Existing profile: refuse to overwrite its configuration.');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
await mkdir(`${root}/harness`, { recursive: true });
await mkdir(`${profile}/extensions`, { recursive: true });
await mkdir(data, { recursive: true });
const manifest = {
  manifest_version: 2,
  name: 'MarginCarry isolated test harness',
  version: '0.1.0',
  applications: {
    zotero: {
      id: 'margincarry-harness@local.test',
      update_url: 'https://example.invalid/margincarry-harness.json',
      strict_min_version: '10.0.5',
      strict_max_version: '10.0.*',
    },
  },
};
await writeFile(`${root}/harness/manifest.json`, JSON.stringify(manifest, null, 2));
const bootstrap = `var timer;
async function startup() {
 await Zotero.initializationPromise;
 const root = ${JSON.stringify(root)}, project = ${JSON.stringify(project)};
 const profile = Services.dirsvc.get('ProfD', Ci.nsIFile).path;
 if (profile !== ${JSON.stringify(profile)} || Zotero.DataDirectory.dir !== ${JSON.stringify(data)}) return;
 let busy = false;
 timer = setInterval(async () => {
  if (busy || !(await IOUtils.exists(root+'/command.js'))) return;
  busy = true;
  try {
   const code = await IOUtils.readUTF8(root+'/command.js');
   await IOUtils.remove(root+'/command.js');
   const result = await new Function('Zotero','Services','IOUtils','PathUtils','ChromeUtils','Cu','Cc','Ci','return (async()=>{'+code+'})()')(Zotero,Services,IOUtils,PathUtils,ChromeUtils,Cu,Cc,Ci);
   await IOUtils.writeJSON(root+'/result.json',{ok:true,result:result??null});
  } catch(e) { await IOUtils.writeJSON(root+'/result.json',{ok:false,error:String(e),stack:e.stack}); }
  finally { busy=false; }
 },500);
 await IOUtils.writeJSON(root+'/harness-ready.json',{version:Zotero.version,os:Services.appinfo.OS,profile,project});
}
function shutdown(){clearInterval(timer);}
function install(){}
function uninstall(){}
`;
await writeFile(`${root}/harness/bootstrap.js`, bootstrap);
// Normal local-development extension registration, without changing signature/security preferences.
await writeFile(`${profile}/extensions/margincarry-harness@local.test`, `${root}/harness`);
await writeFile(
  `${profile}/user.js`,
  `user_pref("extensions.zotero.useDataDir", true);\nuser_pref("extensions.zotero.dataDir", ${JSON.stringify(data)});\n`,
);
execFileSync('python3', [
  '-c',
  "import pathlib,sys,zipfile\np=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:\n for f in sorted(p.iterdir()): z.write(f,f.name)",
  `${root}/harness`,
  `${root}/harness.xpi`,
]);
console.log(
  `Isolated profile: ${profile}\nData directory: ${data}\nTest-only harness: ${root}/harness.xpi`,
);
