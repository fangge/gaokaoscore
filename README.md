# 广东高考2021-2025年录取最低分数线动态图表/2025年广东高考分数段统计

- 支持分数输入与科类匹配
- 本科/专科分组展示
- 科类筛选与动态图表
- Next.js + TypeScript + TailwindCSS
- 部署于GitHub Pages

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建静态站点

```bash
pnpm build
```

构建后静态文件在 `out/` 目录。

## GitHub Pages 部署

项目已配置GitHub Actions自动部署：

1. 推送代码到GitHub仓库后，GitHub Actions会自动触发部署流程。
2. 在仓库 Settings → Pages，按以下步骤配置：
   - Source: 选择 "GitHub Actions"（而不是"Deploy from a branch"）
   - 这将使用我们配置的GitHub Actions工作流来构建和部署网站
   - 无需手动选择分支，GitHub Actions会自动将构建结果部署到gh-pages分支
3. 稍等片刻（通常2-3分钟），GitHub Actions完成部署后，即可通过GitHub Pages访问网站。
   - 网站地址通常为：https://[用户名].github.io/gaokaoscore/
   - 可在仓库的Actions标签页查看部署进度

数据来源：广东省教育考试院，仅供参考。
