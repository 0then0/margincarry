export async function run() {
  const { AddonManager } = ChromeUtils.importESModule(
    'resource://gre/modules/AddonManager.sys.mjs',
  );
  const addon = await AddonManager.getAddonByID('margincarry@0then0.github.io');
  if (!addon?.isActive) throw new Error('Install the built XPI in the isolated profile first.');
  const scope = {
    Zotero,
    Services,
    IOUtils,
    PathUtils,
    Cu,
    Cc,
    Ci,
    crypto: Zotero.getMainWindow().crypto,
    Intl,
  };
  Services.scriptloader.loadSubScriptWithOptions(addon.getResourceURI('margincarry.js').spec, {
    target: scope,
    ignoreCache: true,
  });
  Zotero.MarginCarryTest = scope.MarginCarry;
  return { version: Zotero.version, active: addon.isActive, addonVersion: addon.version };
}
