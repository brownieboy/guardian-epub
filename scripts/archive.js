import archiver from "archiver";
import fs from "fs";
const fileName = process.argv[2]; // This will get 'get-guardian.exe' or similar from the command line

// Determine the platform from the file name and construct the ZIP file name
let zipFileName;
if (fileName.includes(".exe")) {
  zipFileName = "guardian-epub-win.zip";
} else if (fileName.includes("mac")) {
  zipFileName = "guardian-epub-mac.zip";
} else if (fileName.includes("linux")) {
  zipFileName = "guardian-epub-linux.zip";
} else {
  console.error("Unknown platform");
  process.exit(1);
}

const archive = archiver("zip");
const output = fs.createWriteStream(zipFileName);

archive.file(fileName, { name: `bin/${fileName}` });
archive.file("src/guardian-toc-html.ejs", {
  name: "bin/guardian-toc-html.ejs",
});
archive.file("src/guardian-toc-ncx.ejs", { name: "bin/guardian-toc-ncx.ejs" });
// Include the templates folder
archive.directory("node_modules/epub-gen/templates", "templates");

archive.finalize();

archive.pipe(output);

output.on("close", () => {
  console.log(`Archive ${zipFileName} created successfully!`);
});
