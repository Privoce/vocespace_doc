# Docker + Nginx 生产部署指南

通过本指南，你将学会如何使用 Docker 和 Nginx 将应用正式部署至生产环境，并配置 HTTPS 证书保障通信安全。


## 1. 使用 Docker 本地部署应用

### 步骤说明

在开始配置 Nginx 反向代理前，我们需要先将后端服务容器运行起来。

> [!INFO]
> 详细部署方式请参考文档：[本地部署指南](/zh/doc/deploy/local_docker)

### 示例命令

```bash
docker run -d \
  -p 3000:3000 \
  -e SERVER_NAME=your.server.name \
  --name live_meet_app \
  live_meet-livemeet-prod:latest
```

> [!NOTE]
>
> * `-p 3000:3000`：将容器的 3000 端口映射至宿主机 3000 端口。
> * `-e SERVER_NAME=your.server.name`：设置服务运行的主机名，供应用内部识别。
> * `--name`：给容器命名，便于后续管理。


## 2. 安装并配置 Nginx

### 2.1 安装 Nginx 与 Certbot

确保系统更新，并安装所需软件包：

```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

> [!WARNING]
>
> * 如果你使用的是 CentOS 或其他非 Debian 系发行版，请更换为相应的包管理命令（如 `yum` 或 `dnf`）。
> * `certbot` 和 `python3-certbot-nginx` 是用于自动配置 HTTPS 的工具。


### 2.2 配置 `nginx.conf`（全局配置）

路径：`/etc/nginx/nginx.conf`

```nginx
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    keepalive_timeout  65;

    include /etc/nginx/conf.d/*.conf;
}
```

> [!NOTE]
>
> * 此为全局配置，通常不需频繁更改。
> * 日志目录建议开启 logrotate，避免磁盘占满。

---

### 2.3 配置站点文件（虚拟主机配置）

路径建议：`/etc/nginx/sites-enabled/livemeet.conf` 或 `/etc/nginx/conf.d/livemeet.conf`

```nginx
# HTTP 重定向至 HTTPS
server {
    listen 80;
    listen [::]:80;

    server_name your.server.name;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 反向代理配置
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name your.server.name;

    ssl_certificate /etc/letsencrypt/live/your.server.name/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.server.name/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 应用主服务（例如前端或后端 Web 接口）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebRTC 服务代理（端口和路径视项目而定）
    location /rtc {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Socket.IO 实时通信代理
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;  # 请根据实际端口修改
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> [!WARNING]
>
> * `server_name` 必须与你实际申请的证书域名一致。
> * 请确保 `/etc/letsencrypt/live/your.server.name/` 中的文件已生成（见下一节）。

---

### 2.4 启动并检测 Nginx 状态

```bash
# 检测配置是否正确
nginx -t

# 重载配置（推荐）或重启服务
systemctl reload nginx
# 或
systemctl restart nginx
```


## 3. 使用 Certbot 申请 HTTPS 证书

在 DNS 服务商中确保域名已正确解析至服务器 IP。

### 签发证书命令

```bash
certbot --nginx -d your.server.name --register-unsafely-without-email
```

> [!NOTE]
>
> * `--nginx`：Certbot 将自动修改你的 nginx 配置以启用 HTTPS。
> * `--register-unsafely-without-email`：不绑定邮箱。**不推荐正式使用**，建议加上 `--email your@email.com`。

### 验证 Nginx 状态并重启

```bash
nginx -t
systemctl reload nginx
```

## 补充建议

**自动续签证书**：

  ```bash
  # 测试续签
  certbot renew --dry-run
  ```

**防火墙开放端口**（如使用 `ufw`）：

  ```bash
  ufw allow 'Nginx Full'
  ```

**HTTPS 强制与安全加固**：可在 `nginx.conf` 中增加如下配置：

  ```nginx
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;
  ```
