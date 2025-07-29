#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

function runCommand(command) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function getAppName() {
  const rawAppName = path.basename(process.cwd());
  return rawAppName.replace(/^flows-app-/, "");
}

function listVersions(bucket, endpointUrl, appName) {
  const command = `aws s3 ls s3://${bucket}/core/apps/${appName}/versions/ --endpoint-url ${endpointUrl} --recursive`;
  const output = runCommand(command);

  return output
    .split("\n")
    .filter((line) => line.includes(".tar.gz"))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const filePath = parts[3];
      return filePath
        .replace(`core/apps/${appName}/versions/`, "")
        .replace(".tar.gz", "");
    })
    .filter((version) => version);
}

function getChecksum(bucket, endpointUrl, appName, version) {
  try {
    const command = `aws s3api head-object --bucket ${bucket} --key "core/apps/${appName}/versions/${version}.tar.gz" --endpoint-url ${endpointUrl} --query 'Metadata.sha256' --output text`;
    const result = runCommand(command);
    return result === "None" ? "unknown" : result;
  } catch {
    return "unknown";
  }
}

function generateVersionsJson(bucket, endpointUrl, appName) {
  const versions = listVersions(bucket, endpointUrl, appName);

  const versionEntries = versions.map((version) => {
    const checksum = getChecksum(bucket, endpointUrl, appName, version);
    const artifactUrl = `https://registry.useflows.com/core/apps/${appName}/versions/${version}.tar.gz`;

    return {
      version,
      artifactUrl,
      artifactChecksum: `sha256:${checksum}`,
    };
  });

  return {
    versions: versionEntries,
  };
}

function uploadVersionsJson(bucket, endpointUrl, appName, versionsJson) {
  const jsonContent = JSON.stringify(versionsJson, null, 2);
  const tempFile = `/tmp/versions.json`;

  require("fs").writeFileSync(tempFile, jsonContent);

  const command = `aws s3 cp ${tempFile} s3://${bucket}/core/apps/${appName}/versions.json --endpoint-url ${endpointUrl} --content-type application/json`;
  runCommand(command);

  console.log(`✅ Uploaded versions.json for ${appName}`);
  console.log(jsonContent);
}

function main() {
  const bucket = process.env.R2_BUCKET;
  const endpointUrl = process.env.R2_ENDPOINT_URL;

  if (!bucket || !endpointUrl) {
    console.error(
      "❌ Missing required environment variables: R2_BUCKET, R2_ENDPOINT_URL",
    );
    process.exit(1);
  }

  const appName = getAppName();
  console.log(`📦 Indexing versions for app: ${appName}`);

  const versionsJson = generateVersionsJson(bucket, endpointUrl, appName);
  uploadVersionsJson(bucket, endpointUrl, appName, versionsJson);
}

if (require.main === module) {
  main();
}
