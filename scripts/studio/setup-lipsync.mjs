import { mkdir, writeFile, readFile, access, cp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(".studio-tools"),
  version = "1.14.0";
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0)
    throw new Error(
      `${command} failed. On Apple Silicon install the build prerequisites with: brew install cmake boost`,
    );
}
async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
async function main() {
  if (process.platform !== "darwin")
    throw new Error(
      "This setup command targets the macOS voice service. On other systems set STUDIO_RHUBARB_PATH to your Rhubarb executable.",
    );
  await mkdir(root, { recursive: true });
  const folder = path.join(root, `Rhubarb-Lip-Sync-${version}-macOS`),
    archive = path.join(root, "rhubarb-macOS.zip");
  if (!(await exists(path.join(folder, "res")))) {
    const response = await fetch(
      `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${version}/Rhubarb-Lip-Sync-${version}-macOS.zip`,
    );
    if (!response.ok)
      throw new Error("Could not download official Rhubarb release");
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
    run("unzip", ["-q", "-o", archive, "-d", root]);
  }
  if (process.arch === "arm64") {
    const source = path.join(root, "rhubarb-source"),
      build = path.join(root, "rhubarb-build");
    if (!(await exists(path.join(source, "CMakeLists.txt"))))
      run("git", [
        "clone",
        "--depth",
        "1",
        "--branch",
        "v" + version,
        "https://github.com/DanielSWolf/rhubarb-lip-sync.git",
        source,
      ]);
    const cmake = path.join(source, "CMakeLists.txt");
    await writeFile(
      cmake,
      (await readFile(cmake, "utf8")).replace(
        'add_subdirectory("extras/EsotericSoftwareSpine")',
        "# Studio builds the CLI only.",
      ),
    );
    run("cmake", [
      "-S",
      source,
      "-B",
      build,
      "-DCMAKE_BUILD_TYPE=Release",
      "-DCMAKE_POLICY_VERSION_MINIMUM=3.5",
    ]);
    run("cmake", ["--build", build, "--target", "rhubarb", "-j", "6"]);
    await cp(path.join(folder, "res"), path.join(build, "rhubarb", "res"), {
      recursive: true,
    });
    run(path.join(build, "rhubarb", "rhubarb"), ["--version"]);
  } else run(path.join(folder, "rhubarb"), ["--version"]);
  console.log(
    "Local lip-sync engine is ready. Restart the renderer and generate character voices.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
