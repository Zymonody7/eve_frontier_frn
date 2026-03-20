import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const contractDir = path.join(rootDir, "contracts", "response-network");
const rpcUrl = "https://fullnode.testnet.sui.io:443";
const keystorePath = path.join(process.env.HOME ?? "", ".sui", "sui_config", "sui.keystore");

class CurlJsonRpcTransport {
  constructor(url) {
    this.url = url;
    this.requestId = 0;
  }

  async request(input) {
    this.requestId += 1;

    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: this.requestId,
      method: input.method,
      params: input.params
    });

    const raw = execFileSync(
      "curl",
      [
        "-sS",
        this.url,
        "-H",
        "content-type: application/json",
        "--data",
        payload
      ],
      {
        encoding: "utf8"
      }
    );

    const response = JSON.parse(raw);

    if (response.error) {
      throw new Error(`${response.error.code}: ${response.error.message}`);
    }

    return response.result;
  }

  async subscribe() {
    throw new Error("Subscriptions are not implemented for CurlJsonRpcTransport.");
  }
}

function loadKeypair() {
  const [encodedPrivateKey] = JSON.parse(readFileSync(keystorePath, "utf8"));

  if (!encodedPrivateKey) {
    throw new Error(`No private keys found in ${keystorePath}`);
  }

  const decoded = Buffer.from(encodedPrivateKey, "base64");
  const secretKey = decoded.subarray(1);

  return Ed25519Keypair.fromSecretKey(secretKey);
}

function buildPackage() {
  execFileSync("sui", ["move", "build"], {
    cwd: contractDir,
    stdio: "inherit"
  });

  const modulePath = path.join(
    contractDir,
    "build",
    "response_network",
    "bytecode_modules",
    "response_network.mv"
  );

  return {
    modules: [readFileSync(modulePath).toString("base64")],
    dependencies: ["0x1", "0x2"]
  };
}

function extractPublishedIds(result) {
  const publishedChange = result.objectChanges?.find((change) => change.type === "published");
  const registryChange = result.objectChanges?.find(
    (change) =>
      change.type === "created" &&
      typeof change.objectType === "string" &&
      change.objectType.endsWith("::response_network::Registry")
  );

  return {
    packageId: publishedChange?.packageId ?? null,
    registryId: registryChange?.objectId ?? null
  };
}

async function main() {
  const keypair = loadKeypair();
  const transport = new CurlJsonRpcTransport(rpcUrl);
  const client = new SuiJsonRpcClient({
    network: "testnet",
    transport
  });
  const { modules, dependencies } = buildPackage();

  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules,
    dependencies
  });
  tx.transferObjects([upgradeCap], keypair.toSuiAddress());

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showRawEffects: true
    }
  });

  const { packageId, registryId } = extractPublishedIds(result);

  console.log(
    JSON.stringify(
      {
        address: keypair.toSuiAddress(),
        digest: result.digest,
        packageId,
        registryId,
        objectChanges: result.objectChanges ?? []
      },
      null,
      2
    )
  );

  if (!packageId || !registryId) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
