export async function run() {
  const { AddonManager } = ChromeUtils.importESModule(
    'resource://gre/modules/AddonManager.sys.mjs',
  );
  const install = await AddonManager.getInstallForFile(
    Zotero.File.pathToFile(`${hostRoot}/dist/margincarry-0.1.0.xpi`),
  );
  await install.install();
  const addon = await AddonManager.getAddonByID('margincarry@0then0.github.io');
  const bytes = await IOUtils.read(
    `${hostValidationRoot}/profile/extensions/margincarry@0then0.github.io.xpi`,
  );
  const digest = await Zotero.getMainWindow().crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const report = {
    version: Zotero.version,
    os: Services.appinfo.OS,
    addonVersion: addon.version,
    active: addon.isActive,
    installedSHA256: hash,
    menuPresent: !!Zotero.getMainWindow().document.getElementById('margincarry-menu'),
  };
  await IOUtils.writeJSON(`${hostValidationReportRoot}/host-install.json`, report);
  return report;
}
