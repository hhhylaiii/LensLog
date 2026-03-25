# Nginx

## 版本

```
Docker Image: nginx:alpine
```

## 在此專案中的用途與角色

Nginx 在 LensLog **生產環境**中擔任反向代理與靜態檔案服務器的角色：

1. **靜態 SPA 服務**：服務 React 建置產出的靜態檔案（`index.html`、JS、CSS、assets）
2. **API 反向代理**：將 `/api/` 請求轉發至 FastAPI backend
3. **HTTPS 終止**：處理 SSL/TLS 加密，後端服務之間以 HTTP 通訊
4. **HTTP → HTTPS 重導向**：強制所有 HTTP 請求跳轉至 HTTPS
5. **靜態資源快取**：對圖片、JS、CSS 等靜態資源設定長期快取

設定檔位於 `nginx/nginx.conf`。

## 設定詳解

### HTTP → HTTPS 強制跳轉

```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
```

### SPA Fallback

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

React Router 使用 HTML5 History API，所有非靜態資源的路徑（如 `/map`、`/gear`）都必須回傳 `index.html`，讓 JavaScript 路由器處理。

### API 代理

```nginx
location /api/ {
    proxy_pass         http://backend:8000;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    client_max_body_size 10M;  # 允許最大 10MB 的請求體（照片 metadata）
}
```

`backend` 是 Docker Compose 中 FastAPI 服務的名稱，在 Docker 內部網路自動解析。

### API 文件代理（Staging 用）

```nginx
location /docs { proxy_pass http://backend:8000/docs; }
location /redoc { proxy_pass http://backend:8000/redoc; }
location /openapi.json { proxy_pass http://backend:8000/openapi.json; }
```

### 靜態資源快取

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Vite 建置的 JS/CSS 檔案名稱包含 content hash（如 `main.abc123.js`），因此設定 1 年快取安全可靠。

## SSL 憑證設定

```nginx
ssl_certificate     /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
```

憑證透過 Docker volume 掛載：

```yaml
# docker-compose.prod.yml
nginx:
  volumes:
    - ./nginx/certs:/etc/nginx/certs:ro
```

建議使用 Let's Encrypt 取得免費 SSL 憑證（certbot），並定期自動更新。

## 靜態檔案服務

React 建置產出的靜態檔案透過 named volume 在 `frontend_build` 容器（one-shot）和 Nginx 之間共享：

```yaml
frontend_build:
  volumes:
    - frontend_dist:/app/frontend/dist

nginx:
  volumes:
    - frontend_dist:/usr/share/nginx/html:ro  # read-only 掛載至 Nginx 預設 root
```

## 開發環境

開發環境**不使用 Nginx**，改以 Vite dev server（port 5173）提供前端服務，API 請求透過 Vite 的 proxy 設定轉發至 FastAPI。

## 相關資源

- [Nginx 官方文件](https://nginx.org/en/docs/)
- [nginx:alpine Docker Image](https://hub.docker.com/_/nginx)
- [Let's Encrypt + certbot](https://certbot.eff.org/)
- [Nginx 反向代理設定](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
