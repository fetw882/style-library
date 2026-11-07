# 发布机迁移与回滚

这些文件是受本仓库管理的发布入口。现在发布机上的 `/workspace/my-styles/publish.sh` 仍会清空 `/workspace/my-styles-pages` 里除 `.git` 和 `.nojekyll` 以外的内容，再推 `main`。在下面的替换完成之前，每天 9:00 的外部目录同步还不能算端到端生效。

不要在替换完成前运行旧的 `publish.sh`。本说明不合并、不部署、也不 force push。

## 迁移

1. 确认发布机上没有正在跑的 `watch.sh` 或 `publish-watch.sh`。有的话先停掉，避免旧脚本在拉取新页面时把 `external/` 删掉。
2. 备份未受管源，时间用北京时间：

```bash
stamp=$(TZ=Asia/Shanghai date +%Y%m%d%H%M)
mkdir -p "/workspace/my-styles.bak-$stamp"
cp -a /workspace/my-styles/build.py /workspace/my-styles/publish.sh \
  /workspace/my-styles/publish-watch.sh /workspace/my-styles/watch.sh \
  /workspace/my-styles/start.sh /workspace/my-styles/index.html \
  "/workspace/my-styles.bak-$stamp/"
```

3. 先让页面仓库包含这个 PR 合并后的 `main`（含 `external/`、`.github/workflows/sync-awesome-opus.yml` 和新的页面壳）。在发布机的 checkout 里只做快进，不要 force push：

```bash
git -C /workspace/my-styles-pages fetch origin
git -C /workspace/my-styles-pages checkout main
git -C /workspace/my-styles-pages pull --ff-only origin main
```

4. 用本仓库 `publisher/migration-bundle.tgz` 里的 `my-styles-publisher/` 替换那 5 个脚本和 `index.html`。压缩包里的 `index.html` 带有「外部参考」壳；`build.py` 之后只改快照，不改这个壳。

```bash
tar -xzf publisher/migration-bundle.tgz -C /tmp
cp -a /tmp/my-styles-publisher/build.py /tmp/my-styles-publisher/publish.sh \
  /tmp/my-styles-publisher/publish-watch.sh /tmp/my-styles-publisher/watch.sh \
  /tmp/my-styles-publisher/start.sh /tmp/my-styles-publisher/index.html \
  /workspace/my-styles/
chmod 755 /workspace/my-styles/publish.sh /workspace/my-styles/watch.sh \
  /workspace/my-styles/publish-watch.sh /workspace/my-styles/start.sh
```

5. 干跑。这一步会在源目录重建 `library.json`，但不会改页面 checkout，也不会推送：

```bash
PUBLISH_APPLY=0 STYLE_SRC=/workspace/my-styles PAGES=/workspace/my-styles-pages \
  bash /workspace/my-styles/publish.sh
```

6. 应用到本地 checkout，仍不推送。然后检查：`external/` 和 workflow 还在，`index.html` 仍有 `data-t="ext"`，个人风格的 approved/draft 没变，官方编号没变。

```bash
PUBLISH_PUSH=0 STYLE_SRC=/workspace/my-styles PAGES=/workspace/my-styles-pages \
  bash /workspace/my-styles/publish.sh
git -C /workspace/my-styles-pages status
git -C /workspace/my-styles-pages diff HEAD~1 --stat
```

7. 确认 diff 没有删除 `external/`、`.github/`、`scripts/`、`publisher/` 之后，才允许推送。新脚本没有 force push：

```bash
PUBLISH_PUSH=1 STYLE_SRC=/workspace/my-styles PAGES=/workspace/my-styles-pages \
  bash /workspace/my-styles/publish.sh
```

`publish-watch.sh` 调用的也是这个脚本。不导出 `PUBLISH_PUSH=1` 时，它只会尝试本地提交，不会推 `main`。

如果源目录的 `index.html` 仍是只有「我的风格库 / 官方风格」的旧壳，`build.py` 和 `publish.sh` 会直接退出，并且不会改页面 checkout。

## 回滚

源文件退回备份：

```bash
cp -a "/workspace/my-styles.bak-$stamp/." /workspace/my-styles/
```

页面 checkout 如果只做了本地提交、还没有推送：

```bash
git -C /workspace/my-styles-pages reset --hard ORIG_HEAD
```

已经推上去的提交不要 force push。用一条反向提交撤掉那次 `sync`。退回旧的 `publish.sh` 之后，在这个 PR 的文件还留在 `main` 上时不要运行它，否则它会再次清空 `external/`。
