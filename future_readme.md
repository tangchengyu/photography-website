# 无 Token 让访客浏览 GitHub 仓库图片的解决方案

> 适用于：  
> - 管理员通过 GitHub + Netlify 上传图片  
> - 访客无需登录或 Token 即可查看图片  
> - 避免在代码中明文暴露 Personal Access Token（PAT）

---

## 核心思路

1. 把图片存放在 **公开 GitHub 仓库**（如 `yourname/images`）。  
2. 启用 **GitHub Pages** 作为静态资源 CDN。  
3. 访客直接通过 `https://yourname.github.io/images/xxx.jpg` 访问图片。  
4. 管理员仍可用现有 Netlify/GitHub Actions 流程上传图片，目标仓库改为该公开仓库。

---

## 实施步骤

| 步骤 | 操作说明 |
|------|----------|
| 1. 创建仓库 | 在 GitHub 新建公开仓库（Public），命名如 `my-images` |
| 2. 上传图片 | 将图片推送到该仓库根目录或任意子目录 |
| 3. 启用 Pages | 仓库 → Settings → Pages → Source 选择 `main` 分支 `/ (root)` → Save |
| 4. 获取 URL | 启用后，图片通过 `https://yourname.github.io/my-images/路径/文件名` 访问 |
| 5. 网站引用 | 前端直接写死或动态拼接上述 URL，无需任何 Token |

---

## 管理员上传（示例 GitHub Actions）

`.github/workflows/upload.yml`

```yaml
name: Upload Images

on:
  repository_dispatch:
    types: [upload-image]

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout public images repo
        uses: actions/checkout@v4
        with:
          repository: yourname/my-images
          token: ${{ secrets.PAT }}   # 仅管理员可见
          path: images

      - name: Download & commit image
        run: |
          curl -L -o images/${{ github.event.client_payload.filename }} \
            "${{ github.event.client_payload.image_url }}"
          cd images
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "Add ${{ github.event.client_payload.filename }}"
          git push