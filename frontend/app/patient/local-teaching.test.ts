import { expect, it } from "vitest";
import { parseTeachingManifest, videoRange } from "./local-teaching";

it("accepts only fixed video identifiers and strips private source metadata", () => {
  expect(parseTeachingManifest([
    { id: "teaching-01", title: "起势", duration_seconds: 10.7, source_name: "/private/video.MOV" },
    { id: "../secret", title: "unsafe", duration_seconds: 1 },
    { id: "teaching-01", title: "duplicate", duration_seconds: 2 },
    { id: "teaching-02", title: "invalid", duration_seconds: -1 },
  ])).toEqual([{ id: "teaching-01", title: "起势", duration_seconds: 10.7 }]);
});

it("supports seeking ranges and rejects malformed or out-of-bounds ranges", () => {
  expect(videoRange(null, 100)).toEqual({ start: 0, end: 99 });
  expect(videoRange("bytes=20-29", 100)).toEqual({ start: 20, end: 29 });
  expect(videoRange("bytes=20-", 100)).toEqual({ start: 20, end: 99 });
  expect(videoRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  for (const invalid of ["bytes=100-", "bytes=30-20", "bytes=1-2,5-6", "bytes=-0", "bytes=-", "anything"]) {
    expect(videoRange(invalid, 100)).toBeNull();
  }
});
