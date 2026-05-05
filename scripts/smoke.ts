const baseUrl = process.env.SMOKE_URL ?? "http://localhost:3000";

async function check(path: string, expected: number[]) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (!expected.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}, expected ${expected.join("/")}`);
  }
  console.log(`${path} -> ${response.status}`);
}

async function main() {
  await check("/login", [200]);
  await check("/register", [200, 307]);
  await check("/workspaces", [307]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
