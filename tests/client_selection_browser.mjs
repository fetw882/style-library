import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/tmp/preview-deps/package.json");
const puppeteer = require("puppeteer-core");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.SHOT_DIR || "/opt/cursor/artifacts";
const chrome = process.env.CHROME || "/usr/bin/google-chrome";

function startServer() {
  const port = "8765";
  const child = spawn("python3", ["-m", "http.server", port, "--bind", "127.0.0.1"], {
    cwd: root,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ child, port }), 400);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("server exited " + code));
    });
  });
}

function track(page, bag) {
  page.on("pageerror", (err) => bag.pageerrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") bag.console.push(msg.text());
  });
  page.on("requestfailed", (req) => {
    bag.failed.push(`${req.failure()?.errorText || "failed"} ${req.url()}`);
  });
}

async function overflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, ok: root.scrollWidth <= root.clientWidth + 1 };
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const server = await startServer();
  const base = `http://127.0.0.1:${server.port}`;
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    timeout: 20000,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const report = { logic: [], network: [], shots: [] };
  const bag = { pageerrors: [], console: [], failed: [] };
  try {
    const page = await browser.newPage();
    track(page, bag);
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(base + "/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("[data-mine]");
    await page.waitForFunction(() => {
      try {
        return activeItems().length === 703 && document.querySelectorAll("#authorf option").length > 10;
      } catch (err) {
        return false;
      }
    }, { timeout: 15000 });

    const counts = await page.evaluate(() => {
      const text = document.body.innerText;
      const banned = ["官方风格参考", "外部作品参考", "可制作的风格", "草稿", "已认可", "Anatomy Iso Object", "Brand Title Opener", "Lemo-Opuscar", "EianLu", "2nd1st", "署名", "制作说明"];
      const all = allEntries();
      const authors = [...document.querySelectorAll("#authorf option")].map((opt) => opt.value).filter(Boolean);
      const kinds = [...document.querySelectorAll("#kind option")].map((opt) => opt.value);
      return {
        mine: document.querySelectorAll("[data-mine]").length,
        offNote: !!document.querySelector("#offnote"),
        creditBox: !!document.querySelector(".credit-box"),
        creditLinks: document.querySelectorAll('a[href*="credits.html"]').length,
        creditText: /署名|Lemo-Opuscar|CC BY|制作说明/.test(text),
        banned: banned.filter((word) => text.includes(word)),
        lead: document.querySelector(".lead")?.textContent || "",
        detailsOpen: document.querySelector("#more")?.open === true,
        en: document.querySelectorAll(".grid .en").length,
        total: all.length,
        off: all.filter((item) => item.source === "off").length,
        ext: all.filter((item) => item.source === "ext").length,
        authors: authors.length,
        hasContributors: authors.includes("2nd1st") && authors.includes("EianLu"),
        hasPaint: kinds.includes("绘画插画"),
        hasMotion: kinds.includes("动态图形"),
      };
    });
    report.logic.push(["mine-count-7", counts.mine === 7, counts.mine]);
    report.logic.push(["catalog-809", counts.total === 809 && counts.off === 99 && counts.ext === 703, counts]);
    report.logic.push(["client-filters", counts.hasPaint && counts.hasMotion && counts.authors > 2 && counts.hasContributors]);
    report.logic.push(["first-screen-client", counts.banned.length === 0 && counts.lead === "看样片，选画面。" && counts.detailsOpen === false && counts.en === 0, counts.banned]);
    report.logic.push(["no-offnote", counts.offNote === false]);
    report.logic.push(["no-credit-box", counts.creditBox === false]);
    report.logic.push(["no-credit-links", counts.creditLinks === 0, counts.creditLinks]);
    report.logic.push(["no-credit-text", counts.creditText === false]);

    await page.screenshot({ path: path.join(outDir, "selection-desktop-1280.png") });
    report.shots.push("selection-desktop-1280.png");
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.screenshot({ path: path.join(outDir, "selection-mobile-390.png") });
    report.shots.push("selection-mobile-390.png");
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    await page.evaluate(() => {
      window.__log = [];
      const orig = stopOffVideo;
      window.stopOffVideo = function () {
        window.__log.push(["stop", [...document.querySelectorAll("#pan video")].map((v) => v.getAttribute("src"))]);
        return orig();
      };
    });

    await page.click('[data-mine="anatomy-iso-object"]');
    await page.waitForSelector("#dlg.on");
    const anatomy = await page.evaluate(() => ({
      videos: document.querySelectorAll("#pan video").length,
      text: document.querySelector("#pan .scope")?.textContent || "",
    }));
    report.logic.push(["anatomy-no-player", anatomy.videos === 0, anatomy.videos]);
    report.logic.push(["anatomy-not-ours", anatomy.text.includes("不是我们自己的成片") && anatomy.text.includes("也不能当作我们已经能做这个风格的证明"), anatomy.text]);
    await page.click("#pan .x");
    await page.waitForSelector("#dlg.on", { hidden: true });

    await page.click('[data-mine="brand-title-opener"]');
    await page.waitForSelector("#pan video");
    const brandSrc = await page.$eval("#pan video", (v) => v.getAttribute("src") || "");
    const brandControls = await page.$eval("#pan video", (v) => v.hasAttribute("controls"));
    report.logic.push(["brand-src", brandSrc.includes("brand-title-opener/test.mp4"), brandSrc]);
    report.logic.push(["brand-controls", brandControls === true]);
    try {
      await page.waitForFunction(() => document.querySelector("#pan video")?.readyState >= 1, { timeout: 8000 });
      await page.evaluate(() => {
        const v = document.querySelector("#pan video");
        v.currentTime = Math.min(0.4, (v.duration || 1) / 2);
      });
      await page.waitForFunction(() => {
        const v = document.querySelector("#pan video");
        return v && v.currentTime > 0.05;
      }, { timeout: 4000 });
      report.logic.push(["brand-seek", true]);
    } catch (err) {
      report.network.push(["brand-seek-or-decode", String(err).split("\n")[0]]);
      report.logic.push(["brand-seek", false, "see network"]);
    }
    const brandLayout = await page.evaluate(() => {
      const video = document.querySelector("#pan video").getBoundingClientRect();
      const title = document.querySelector("#pan h2").getBoundingClientRect();
      const scope = document.querySelector("#pan .scope").getBoundingClientRect();
      return {
        titleAbove: title.bottom <= video.top + 1,
        scopeBelow: scope.top >= video.bottom - 1,
      };
    });
    report.logic.push(["desktop-controls-clear-title", brandLayout.titleAbove && brandLayout.scopeBelow, brandLayout]);
    await page.screenshot({ path: path.join(outDir, "detail-desktop-1280.png") });
    report.shots.push("detail-desktop-1280.png");

    await page.evaluate(() => openS("pixel-rpg-25d-explainer"));
    await page.waitForFunction(() => (document.querySelector("#pan video")?.getAttribute("src") || "").includes("pixel-rpg"));
    const switched = await page.evaluate(() => ({
      srcs: [...document.querySelectorAll("#pan video")].map((v) => v.getAttribute("src")),
      log: window.__log,
    }));
    report.logic.push(["switch-stops-previous", switched.log.some((row) => row[0] === "stop" && (row[1][0] || "").includes("brand-title-opener"))]);
    report.logic.push(["switch-only-new-src", switched.srcs.length === 1 && switched.srcs[0].includes("pixel-rpg") && !switched.srcs[0].includes("brand-title")]);
    await page.click("#pan .x");
    const closed = await page.evaluate(() => [...document.querySelectorAll("#pan video")].map((v) => v.getAttribute("src")));
    report.logic.push(["close-unloads-src", closed.every((src) => !src), closed]);

    await page.click("#more summary");
    await page.click('[data-t="off"]');
    await page.waitForSelector("[data-off]");
    const groups = await page.evaluate(() => {
      setView({ tab: "all", kind: "", q: "", fit: "品牌" });
      const brand = filtered().map((item) => item.slug);
      setView({ tab: "all", kind: "", q: "caption-news", fit: "" });
      const found = filtered().map((item) => item.slug);
      setView({ tab: "off", kind: "绘画插画", q: "", fit: "" });
      const rows = filtered().map((item) => item.slug);
      const ordered = sortOfficialGroup(OFF.filter((item) => item.cat === "绘画插画")).map((item) => item.slug);
      const first = document.querySelector("[data-off]")?.getAttribute("data-off");
      setView({ tab: "off", kind: "", q: "", fit: "" });
      return {
        brand,
        found,
        first,
        rows,
        ordered,
        offCount: allEntries().filter((item) => item.source === "off").length,
      };
    });
    report.logic.push(["fit-brand", groups.brand.includes("brand-title-opener"), groups.brand.slice(0, 6)]);
    report.logic.push(["search-slug", groups.found.length === 1 && groups.found[0] === "caption-news", groups.found]);
    report.logic.push(["official-count-99", groups.offCount === 99, groups.offCount]);
    report.logic.push(["official-new-first", groups.first === "colored-pencil" && JSON.stringify(groups.rows) === JSON.stringify(groups.ordered), groups]);

    await page.click('[data-off="caption-news"]');
    await page.waitForSelector("#off-player");
    const offSrc = await page.$eval("#off-player", (v) => v.getAttribute("src") || "");
    const offControls = await page.$eval("#off-player", (v) => v.hasAttribute("controls"));
    report.logic.push(["official-src-logic", offSrc.includes("lemomo-ai.github.io/lemo-opuscar-films/caption-news.mp4"), offSrc]);
    report.logic.push(["official-controls", offControls === true]);
    await page.evaluate(() => openOff("newsreel"));
    const offSwitch = await page.evaluate(() => [...document.querySelectorAll("#pan video")].map((v) => v.getAttribute("src")));
    report.logic.push(["official-switch-src", offSwitch.length === 1 && offSwitch[0].includes("newsreel.mp4") && !offSwitch[0].includes("caption-news")]);
    await page.evaluate(() => openOff("crayon-world"));
    const offCredit = await page.evaluate(() => ({
      leak: /署名|Lemo-Opuscar|CC BY|制作说明|EianLu|2nd1st/.test(document.querySelector("#pan")?.innerText || ""),
      title: document.querySelector("#pan h2")?.textContent || "",
      englishSubtitle: !!document.querySelector("#pan .en"),
    }));
    report.logic.push(["official-no-credit", offCredit.leak === false && offCredit.englishSubtitle === false && offCredit.title.includes("蜡笔"), offCredit]);
    await page.click("#pan .x");

    await page.click('[data-t="ext"]');
    await page.waitForFunction(() => document.querySelectorAll("[data-ext]").length > 0, { timeout: 15000 });
    const ext = await page.evaluate(() => {
      const shown = document.querySelectorAll("[data-ext]").length;
      const visible = [...document.querySelectorAll("[data-ext]")].find((node) => node.querySelector("[data-preview]"));
      let sample = visible ? visible.getAttribute("data-ext") : "";
      if (!sample) {
        document.querySelector("#remake").value = "yes";
        setView({ tab: "ext", kind: "", q: "", fit: "" });
        sample = document.querySelector("[data-preview]")?.closest("[data-ext]")?.getAttribute("data-ext") || "";
      }
      return {
        shown,
        total: activeItems().length,
        remakes: activeItems().filter((it) => it.has_remake).length,
        sample,
      };
    });
    report.logic.push(["external-page-24", ext.shown === 24, ext.shown]);
    report.logic.push(["external-total-703", ext.total === 703, ext.total]);
    report.logic.push(["external-remakes-418", ext.remakes === 418, ext.remakes]);
    if (ext.sample) {
      await page.click(`[data-ext="${ext.sample}"]`);
      await page.waitForSelector("#preview-slot video", { timeout: 5000 }).catch(() => null);
      const clip = await page.evaluate((slug) => {
        const v = document.querySelector("#preview-slot video");
        return { src: v ? v.getAttribute("src") : "", controls: !!(v && v.hasAttribute("controls")), slug };
      }, ext.sample);
      const expected = `https://media.skillry.dev/opus-5-5/${ext.sample}/remake.mp4`;
      report.logic.push(["external-src-logic", clip.src === expected, clip.src]);
      report.logic.push(["external-controls", clip.controls === true]);
      const played = await page.evaluate(() => new Promise((resolve) => {
        const v = document.querySelector("#preview-slot video");
        if (!v) return resolve("no-element");
        const timer = setTimeout(() => resolve(v.error ? "error" : "pending"), 4000);
        v.addEventListener("error", () => { clearTimeout(timer); resolve("error"); }, { once: true });
        v.addEventListener("loadeddata", () => { clearTimeout(timer); resolve("loaded"); }, { once: true });
      }));
      if (played === "loaded") report.logic.push(["external-playback", true]);
      else report.network.push(["external-playback", played, "logic src checked separately"]);
      const extCredit = await page.evaluate(() => /署名|制作说明|作者主页|版权归原作者/.test(document.body.innerText));
      report.logic.push(["external-no-credit", extCredit === false]);
      await page.click("#pan .x");
      const extClosed = await page.evaluate(() => [...document.querySelectorAll("#pan video")].map((v) => v.getAttribute("src")));
      report.logic.push(["external-close-unloads", extClosed.every((src) => !src), extClosed]);
    }

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.click('[data-t="mine"]');
    await page.waitForSelector("[data-mine]");
    const narrowMine = await overflow(page);
    report.logic.push(["narrow-mine", narrowMine.ok, narrowMine]);
    await page.click('[data-mine="brand-title-opener"]');
    await page.waitForSelector("#pan video");
    const narrowDetail = await overflow(page);
    const narrowLayout = await page.evaluate(() => {
      const video = document.querySelector("#pan video").getBoundingClientRect();
      const title = document.querySelector("#pan h2").getBoundingClientRect();
      const scope = document.querySelector("#pan .scope").getBoundingClientRect();
      return { titleAbove: title.bottom <= video.top + 1, scopeBelow: scope.top >= video.bottom - 1, videoRight: video.right <= window.innerWidth + 1 };
    });
    report.logic.push(["narrow-detail", narrowDetail.ok, narrowDetail]);
    report.logic.push(["narrow-controls-clear", narrowLayout.titleAbove && narrowLayout.scopeBelow && narrowLayout.videoRight, narrowLayout]);
    await page.screenshot({ path: path.join(outDir, "detail-mobile-390.png") });
    report.shots.push("detail-mobile-390.png");
    await page.click("#pan .x");
    await page.click('[data-t="off"]');
    await page.waitForSelector("[data-off]");
    report.logic.push(["narrow-official", (await overflow(page)).ok]);
    await page.click('[data-t="ext"]');
    await page.waitForSelector("[data-ext]");
    report.logic.push(["narrow-external", (await overflow(page)).ok]);

    report.console = { index: bag };
    const failed = report.logic.filter((row) => row[1] !== true);
    await writeFile(path.join(outDir, "client-selection-report.json"), JSON.stringify({ failed, logic: report.logic, network: report.network, console: report.console, shots: report.shots }, null, 2));
    console.log(JSON.stringify({ failed, network: report.network, pageerrors: bag.pageerrors, consoleErrors: bag.console }, null, 2));
    if (failed.length) process.exitCode = 1;
  } finally {
    await browser.close();
    server.child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
