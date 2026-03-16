const fs = require("fs");
const path = require("path");

module.exports = async function (context) {
  // Find the app directory in the output
  const appOutDir = context.appOutDir;

  // macOS: Telepath.app/Contents/Resources/app/
  // Linux/Win: resources/app/
  const macApp = path.join(appOutDir, context.packager.appInfo.productFilename + ".app",
    "Contents", "Resources", "app");
  const linuxApp = path.join(appOutDir, "resources", "app");

  const appDir = fs.existsSync(macApp) ? macApp : linuxApp;

  if (!fs.existsSync(appDir)) {
    console.log("afterPack: app dir not found at", macApp, "or", linuxApp);
    return;
  }

  const pkgPath = path.join(appDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    const pkg = {
      name: "telepath",
      version: "1.0.0",
      main: "dist-electron/main.js",
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log("afterPack: created", pkgPath);
  } else {
    console.log("afterPack: package.json already exists");
  }
};
