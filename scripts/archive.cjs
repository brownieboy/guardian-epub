const archiver = require("archiver");
const fs = require("fs");
const archive = archiver("zip");
const output = fs.createWriteStream("guardian-epub.zip");

const fileName = process.argv[2]; // This will get 'get-guardian.exe' from the command line

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
  console.log("Archive created successfully!");
});
