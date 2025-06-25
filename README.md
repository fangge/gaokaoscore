# 广东高考2021-2024年录取最低分数线动态图表

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

## 构建与导出静态站点

```bash
pnpm build
pnpm export
```

导出后静态文件在 `out/` 目录。

## GitHub Pages 部署

1. 推送代码到 GitHub 仓库（已完成）。
2. 在仓库 Settings → Pages，按以下步骤配置：
   - Source: 选择 "Deploy from a branch"
   - Branch: 选择 "main" 分支和 "/out" 文件夹
   - 点击 "Save" 保存设置
3. 稍等片刻（通常1-2分钟），即可通过 GitHub Pages 访问网站。
   - 网站地址通常为：https://[用户名].github.io/gaokaoscore/

数据来源：广东省教育考试院，仅供参考。
