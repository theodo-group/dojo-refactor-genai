import { fail } from "assert";
import path from "path";

script({
  model: "anthropic:claude-3-7-sonnet-latest",
  system: ["system.files"],
  maxTokens: 16000,
});

const testFiles = await workspace.findFiles(`**/*.e2e-spec.ts`);

for (const testFile of testFiles) {
  const response = await runPrompt(async (_) => {

    const serviceNameMatch = path.parse(testFile.filename).name.match(/([^\.]+)\.e2e-spec$/);
    const serviceName = serviceNameMatch[1]

    const serviceFile = await workspace.findFiles(`**/${serviceName}.service.ts`)

    if (serviceFile.length === 0)
      fail("no service")

    _.def("SERVICE FILE", serviceFile);

    _.$`Create unit tests for my service file. Generate only a single test case (one it.()) for the moment`

    _.defFileOutput("src/**", "Generated test file");
  }, {
    system: ["system.files"]
  });

  if (response.fileEdits === undefined || response.fileEdits === null)
    continue;

  const keys = Object.keys(response.fileEdits);

  if (keys.length === 0)
    continue;

  const createdFile = keys[0];

  await host.exec(`pnpm test ${createdFile}`);
}
