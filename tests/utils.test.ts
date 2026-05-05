import { describe, expect, it } from "vitest";
import { projectKey, slugify, slugifyAscii } from "@/lib/utils";

describe("utils", () => {
  it("normalizes workspace slugs", () => {
    expect(slugify("Team Alpha")).toBe("team-alpha");
    expect(slugify("研发 工作区")).toBe("研发-工作区");
  });

  it("normalizes project keys", () => {
    expect(projectKey("Kite")).toBe("KITE");
    expect(projectKey("ops-123")).toBe("OPS123");
  });

  it("normalizes workspace slugs for URLs", () => {
    expect(slugifyAscii("Team Alpha")).toBe("team-alpha");
    expect(slugifyAscii("Kite 研发")).toBe("kite");
  });
});
