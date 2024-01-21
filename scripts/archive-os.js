import { execSync } from "child_process";

function runCommand(command) {
  execSync(command, { stdio: "inherit" });
}

function archiveForWindows() {
  runCommand("npm run createWinExe");
  runArchiveCommand("get-guardian.exe");
}

function archiveForMac() {
  const isArmMac = process.arch === "arm64";
  console.log("TCL ~ archiveForMac ~ isArmMac:", isArmMac);
  if (isArmMac) {
    runCommand("npm run createMacBin");
    runArchiveCommand("get-guardian-mac");
  } else {
    runCommand("npm run createMacBinIntel");
    runArchiveCommand("get-guardian-mac-intel");
  }
}

function archiveForLinux() {
  runCommand("npm run createLinuxBin");
  runArchiveCommand("get-guardian-linux");
}

function runArchiveCommand(archiveCommand) {
  runCommand(`node ./scripts/archive.js ${archiveCommand}`);
}

try {
  switch (process.platform) {
    case "win32": // Windows
      archiveForWindows();
      break;
    case "darwin": // macOS
      archiveForMac();
      break;
    case "linux": // Linux
      archiveForLinux();
      break;
    default:
      console.error(`Unsupported platform: ${process.platform}`);
      process.exit(1);
  }
} catch (error) {
  console.error(`Execution failed: ${error}`);
  process.exit(1);
}
