#!/usr/bin/env node
// Render what the hero crop will actually show, for a flyer, at a viewport width.
//
// This exists because nothing else in this repo can answer that question. There
// is no jsdom, so the hero cannot be render-tested; every visual defect in the
// motif work — a moon that drew nothing, icons that read as lampshades, stripes
// painted invisible — got past a full green suite and was only caught by
// rasterising and looking. lib/heroCrop pins the arithmetic; this pins the
// picture.
//
//   node scripts/render-hero.mjs <flyer.(png|jpg)> [viewportWidth] [focusPct]
//
// Writes .verify/hero-<width>.png. Requires rsvg-convert or ImageMagick with an
// SVG delegate; prints a clear message and exits 2 if neither is present.

import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { basename } from "node:path";

// Kept in step with src/lib/heroCrop.ts. Duplicated rather than imported
// because this is a plain node script and that module is TypeScript; the unit
// tests are what stop the two drifting.
const ART_WIDTH_PCT = 0.5;
const ART_ASPECT = 0.75;
const MIN_SECTION_H = 420;

const [, , flyer, widthArg = "1745", focusArg = "0"] = process.argv;

if (!flyer || !existsSync(flyer)) {
  console.error("usage: node scripts/render-hero.mjs <flyer.png> [viewportWidth] [focusPct]");
  process.exit(1);
}

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

let identify;
try {
  identify = sh("identify", ["-format", "%w %h", flyer]);
} catch {
  console.error("ImageMagick `identify` not found. Install imagemagick to use this script.");
  process.exit(2);
}
const [fw, fh] = identify.split(" ").map(Number);

const viewportW = Number(widthArg);
const focus = Number(focusArg) / 100;
const regionW = Math.round(viewportW * ART_WIDTH_PCT);
const regionH = Math.round(Math.max(regionW * ART_ASPECT, MIN_SECTION_H));

// object-fit: cover against a portrait poster in a landscape band always scales
// to the width, so the source slice follows from the ratio.
const scale = regionW / fw;
const srcH = Math.min(fh, Math.round(regionH / scale));
const srcY = Math.round((fh - srcH) * focus);
const pct = ((srcH / fh) * 100).toFixed(0);

mkdirSync(".verify", { recursive: true });
const out = `.verify/hero-${viewportW}.png`;

// Downscale the render so it is viewable; proportions are what matter.
const display = 1200;
const s = display / viewportW;
const dw = display;
const dh = Math.round(regionH * s);
const rwd = Math.round(regionW * s);

sh("convert", [
  flyer, "-crop", `${fw}x${srcH}+0+${srcY}`, "+repage",
  "-resize", `${rwd}x${dh}!`, "/tmp/.hero-slice.png",
]);
sh("convert", [
  "-size", `${dw}x${dh}`, "xc:#f0e4c8",
  "/tmp/.hero-slice.png", "-geometry", `+${dw - rwd}+0`, "-composite",
  "-bordercolor", "#cfc3a4", "-border", "1",
  out,
]);

console.log(
  `${basename(flyer)}  ${fw}x${fh}  viewport ${viewportW}  ` +
    `section ${regionW}x${regionH}  focus ${focusArg}%  shows top ${pct}%  ->  ${out}`,
);
