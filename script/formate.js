const fs = require("fs");
const glob = require("glob");
const { execSync } = require("child_process");

function sortImports(content) {
  const lines = content.split("\n");

  let useClient = [];
  let imports = [];
  let others = [];

  let currentImportBlock = "";
  let isCollectingImport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith('"use client"') ||
      trimmed.startsWith("'use client'")
    ) {
      useClient.push(line);
      continue;
    }

    if (trimmed.startsWith("import") || isCollectingImport) {
      currentImportBlock += line + "\n";

      if (trimmed.includes("{") && !trimmed.includes("}")) {
        isCollectingImport = true;
      }

      if (
        trimmed.includes("}") ||
        (trimmed.endsWith(";") && !isCollectingImport) ||
        trimmed === ""
      ) {
        if (isCollectingImport && !trimmed.includes("}")) {
          continue;
        }

        imports.push(currentImportBlock.trimEnd());
        currentImportBlock = "";
        isCollectingImport = false;
      }
    } else {
      others.push(line);
    }
  }

  imports.sort((a, b) => a.length - b.length);

  return [...useClient, ...imports, ...others].join("\n");
}

function sortCssContent(content) {
  const lines = content.split("\n");
  let sortedContent = [];
  let stack = [];

  function flushBlock(block) {
    if (block.lines.length > 0) {
      block.lines.sort((a, b) => a.trim().length - b.trim().length);
      block.sortedResult.push(...block.lines);
      block.lines = [];
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.endsWith("{")) {
      stack.push({ sortedResult: [line], lines: [] });
    } else if (trimmed === "}") {
      const finishedBlock = stack.pop();
      flushBlock(finishedBlock);
      finishedBlock.sortedResult.push(line);

      if (stack.length > 0) {
        stack[stack.length - 1].sortedResult.push(
          ...finishedBlock.sortedResult,
        );
      } else {
        sortedContent.push(...finishedBlock.sortedResult);
      }
    } else {
      if (stack.length > 0) {
        if (
          trimmed.includes(":") &&
          (trimmed.endsWith(";") || trimmed.endsWith("!important"))
        ) {
          stack[stack.length - 1].lines.push(line);
        } else {
          stack[stack.length - 1].sortedResult.push(line);
        }
      } else {
        sortedContent.push(line);
      }
    }
  });

  return sortedContent.join("\n");
}

function sortProject() {
  console.log("🚀 Starting script...");

  const cssFiles = glob.sync("src/**/*.module.css");
  cssFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    const finalContent = sortCssContent(content);
    fs.writeFileSync(file, finalContent, "utf-8");
    console.log(`✅ Sorted CSS in: ${file}`);
  });

  const codeFiles = glob.sync("src/**/*.{js,jsx,ts,tsx}");
  codeFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    const finalContent = sortImports(content);
    fs.writeFileSync(file, finalContent, "utf-8");
    console.log(`✅ Sorted Imports in: ${file}`);
  });

  try {
    console.log("✨ Running Prettier for final touch...");
    execSync("npx prettier --write .", { stdio: "inherit" });
    console.log("🎉 All done! Project is clean and sorted.");
  } catch (err) {
    console.error(
      "⚠️ Prettier failed. Make sure it is installed (npm install --save-dev prettier)",
    );
  }
}

if (require.main === module) {
  sortProject();
}

module.exports = { sortProject };
