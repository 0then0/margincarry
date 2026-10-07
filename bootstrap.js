var chromeHandle;
var MarginCarry;
function install() {}
function uninstall() {}
async function startup({ rootURI }) {
  await Zotero.initializationPromise;
  const registrar = Cc['@mozilla.org/addons/addon-manager-startup;1'].getService(
    Ci.amIAddonManagerStartup,
  );
  chromeHandle = registrar.registerChrome(Services.io.newURI(`${rootURI}manifest.json`), [
    ['content', 'margincarry', `${rootURI}content/`],
  ]);
  Services.scriptloader.loadSubScript(`${rootURI}margincarry.js`, this);
  MarginCarry.start(rootURI);
}
function onMainWindowLoad({ window }) {
  MarginCarry?.install(window);
}
function onMainWindowUnload({ window }) {
  window.document.getElementById('margincarry-menu')?.remove();
}
function shutdown() {
  MarginCarry?.stop();
  chromeHandle?.destruct();
  MarginCarry = undefined;
}
