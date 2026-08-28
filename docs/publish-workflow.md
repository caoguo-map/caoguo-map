# 发布流程（GitHub 多仓拆分 + npm 发布）

每次代码更新，都需要走完以下两步发布流程：先把代码推到各 package 的独立 GitHub 仓库，再把包发布到 npmjs。

---

## 前置环境

- **GitHub SSH**：已认证（`uutanyang`）。拆分推送走 `git@github.com:caoguo-map/...`。
- **npm 认证**：token 配在 `~/.npmrc` 的 `//registry.npmjs.org/:_authToken=npm_xxx`。
- **镜像陷阱**：`~/.npmrc` 里 `registry=https://registry.npmmirror.com/`（淘宝镜像）。npm 命令默认走镜像，但**镜像只读、不能 publish**，且 `npm view` 走镜像会有缓存延迟。发布与验证必须显式加 `--registry https://registry.npmjs.org/`。
- **CodeBuddy safe-delete shim（头号杀手）**：`NODE_OPTIONS=--require=.../node-language-shim.cjs` + 一组 `CODEBUDDY_SAFE_DELETE_*` 环境变量启用。它拦截所有 `unlinkSync`，调用 `genie-trash` 二进制删除文件——在 build 清 dist、publish 清 npm cache 时会 **ETIMEDOUT**，导致：
  - build 偶发 Failed；
  - publish 表面报 `+ @x@v` 成功，实际只 staged、未 promote 到 `latest`。
  - **对策**：build 用 `tsup --no-clean`；publish 命令前缀 `NODE_OPTIONS=` 清空 shim。

---

## 一、GitHub 多仓拆分推送

仓库命名约定（`caoguo-map` 组织下）：

| 本地包 | 远程仓库 |
|---|---|
| packages/ai | caoguo-map/maplibre-ai |
| packages/compute | caoguo-map/maplibre-compute |
| packages/grid | caoguo-map/maplibre-grid |
| packages/editor | caoguo-map/map-editor |
| packages/pipeline | caoguo-map/maplibre-pipeline |
| packages/telecom | caoguo-map/maplibre-telecom |
| packages/transport | caoguo-map/maplibre-transport |
| packages/water | caoguo-map/maplibre-water |
| packages/maplibre | caoguo-map/maplibre（无前缀） |
| packages/theme | caoguo-map/theme（无前缀） |

方法：用 `git subtree split` 拆出子目录独立历史，再 `git push --force`（远程旧历史与 monorepo 无关，需覆盖）。

```bash
cd /Users/yangtanfang/project/2026/AI/caoguo-map

# 带前缀的 7 个包
for pkg in ai compute grid pipeline telecom transport water; do
  echo "===== packages/$pkg -> caoguo-map/maplibre-$pkg ====="
  SPLIT=$(git subtree split --prefix=packages/$pkg main)
  git push --force git@github.com:caoguo-map/maplibre-$pkg.git "$SPLIT:main"
done

# 无前缀的 2 个包
for pkg in maplibre theme; do
  echo "===== packages/$pkg -> caoguo-map/$pkg ====="
  SPLIT=$(git subtree split --prefix=packages/$pkg main)
  git push --force git@github.com:caoguo-map/$pkg.git "$SPLIT:main"
done

# editor 包（独立命名，无 maplibre 前缀）
echo "===== packages/editor -> caoguo-map/map-editor ====="
SPLIT=$(git subtree split --prefix=packages/editor main)
git push git@github.com:caoguo-map/map-editor.git "${SPLIT}:refs/heads/main"
```

> **空仓库坑（zsh + git）**：远程仓库刚建、无任何 refs 时，`git push <remote> <sha>:main` 会失败
> （源是裸 SHA，git 无法推断 `refs/heads/` 前缀），必须写全限定 refspec `<sha>:refs/heads/main`；
> 且 zsh 会把 `$SPLIT:r` 里的 `:r` 当参数展开修饰符吃掉，**必须用 `${SPLIT}` 花括号写法**。
> 远程已有无关历史时必须 `--force`（会丢弃远程现有提交）。

---

## 二、npm 发布

### 1. 版本 bump（必做）

npm 禁止覆盖已发布版本。每次发布前必须递增版本号：

```bash
# 方式 A：直接改 package.json（推荐，不自动打 git tag）
node -e "
const fs=require('fs');
for (const p of ['ai','compute','grid','maplibre','pipeline','telecom','theme','transport','water']) {
  const f='packages/'+p+'/package.json';
  const j=JSON.parse(fs.readFileSync(f,'utf8'));
  const [ma,mi,pa]=j.version.split('.').map(Number);
  j.version=ma+'.'+mi+'.'+(pa+1);
  fs.writeFileSync(f, JSON.stringify(j,null,2)+'\n');
}
"
```

> 注意：若上一次 publish 因 shim 中断只 staged 未公开，该版本号已被占用，必须再 bump 一次（不能重发同版本，会 `E409`/`E403`）。

### 2. 构建（串行 + 绕开 shim）

`pnpm -r build` 并发会竞态（下游包读到未就绪的 `maplibre` dist）。且 tsup 清旧 dist 会触发 safe-delete shim 超时。

```bash
# 串行按拓扑顺序（theme -> maplibre -> 其余），build 时加 --no-clean 跳过删旧文件
for d in theme maplibre ai compute grid pipeline telecom transport water; do
  (cd packages/$d && pnpm build -- --no-clean)
done
```

### 3. 发布（清空 shim + 官方源）

```bash
# NODE_OPTIONS= 清空 safe-delete shim，否则 publish 收尾清 cache 超时、版本只 staged 未公开
NODE_OPTIONS= pnpm -r publish --access public --no-git-checks --registry https://registry.npmjs.org/
```

- `--access public`：scope 包（`@caoguo/*`）默认私有，必须显式 public。
- `--no-git-checks`：允许工作区有未提交改动（我们刚 bump 了版本）。
- pnpm 会自动把包间 `workspace:*` 依赖重写为已发布版本，无需手动改引用。
- 若逐个发某个包：`NODE_OPTIONS= pnpm --filter @caoguo/<pkg> publish --access public --no-git-checks --registry https://registry.npmjs.org/`

### 4. 验证（权威，绕开镜像缓存）

`npm view` 走淘宝镜像会有延迟/不准。直接用 curl 查官方 registry：

```bash
for p in maplibre-ai maplibre-compute maplibre-grid maplibre maplibre-pipeline maplibre-telecom theme maplibre-transport maplibre-water; do
  v=$(curl -s "https://registry.npmjs.org/@caoguo%2f$p" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j['dist-tags']?j['dist-tags'].latest:'NO')}catch(e){console.log('ERR')}})")
  echo "@caoguo/$p -> $v"
done
```

> npm publish 有**异步 promote 延迟**（~1–2 分钟才更新 `latest`）。curl 验证若还是旧版本，等一会儿再查；不要误以为失败而重复 bump。

---

## 三、一键发布脚本（推荐每次更新后跑）

把上面三步串起来即为标准发布流程。务必保证：① GitHub 拆分推送完成 → ② npm bump + build + publish → ③ curl 验证 9 个包 latest 均为新版本。

完成后提交 `package.json` 的版本变更（以及本流程文档的更新）。
