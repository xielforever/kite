import { describe, expect, it } from "vitest";
import { canTransitionIssueStatus, issueStatusTransitions } from "@/lib/constants";

describe("issue status lifecycle", () => {
  it("allows only defined forward or review-return transitions", () => {
    expect(canTransitionIssueStatus("TODO", "IN_PROGRESS")).toBe(true);
    expect(canTransitionIssueStatus("IN_PROGRESS", "REVIEW")).toBe(true);
    expect(canTransitionIssueStatus("REVIEW", "DONE")).toBe(true);
    expect(canTransitionIssueStatus("REVIEW", "IN_PROGRESS")).toBe(true);
    expect(canTransitionIssueStatus("IN_PROGRESS", "TODO")).toBe(true);
    expect(canTransitionIssueStatus("TODO", "CLOSED")).toBe(true);
  });

  it("prevents terminal statuses and direct lifecycle jumps", () => {
    expect(canTransitionIssueStatus("DONE", "TODO")).toBe(false);
    expect(canTransitionIssueStatus("DONE", "IN_PROGRESS")).toBe(false);
    expect(canTransitionIssueStatus("CLOSED", "TODO")).toBe(false);
    expect(canTransitionIssueStatus("TODO", "DONE")).toBe(false);
    expect(canTransitionIssueStatus("IN_PROGRESS", "DONE")).toBe(false);
  });

  it("keeps done and closed terminal", () => {
    expect(issueStatusTransitions.DONE).toEqual([]);
    expect(issueStatusTransitions.CLOSED).toEqual([]);
  });
});
