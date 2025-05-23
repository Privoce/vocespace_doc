# VoceSpace 灵活部署指南

本文档介绍如何在 Ubuntu 服务器上部署 `vocespace-client` 前端项目，配置 Nginx + HTTPS，安装依赖、使用 PM2 管理服务，并配置 TURN 服务用于 WebRTC。


## 项目获取与构建 (可选)

实际上您无需自己手动进行项目克隆，我们已经在自动化部署脚本中帮助您进行了处理。

```bash
# 克隆项目
git clone https://github.com/your-org/vocespace-client.git vocespace-client
```

## 安装并配置 Nginx

### 安装 Nginx 与 Certbot

确保系统更新，并安装所需软件包：

```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

> [!WARNING]
>
> * 如果你使用的是 CentOS 或其他非 Debian 系发行版，请更换为相应的包管理命令（如 `yum` 或 `dnf`）。
> * `certbot` 和 `python3-certbot-nginx` 是用于自动配置 HTTPS 的工具。


### 配置 `nginx.conf`（全局配置）

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

### 配置站点文件（虚拟主机配置）

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

### 启动并检测 Nginx 状态

```bash
# 检测配置是否正确
nginx -t

# 重载配置（推荐）或重启服务
systemctl reload nginx
# 或
systemctl restart nginx
```


## 使用 Certbot 申请 HTTPS 证书

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


## HTTPS 与证书自动续期（Certbot）

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 获取并配置证书
sudo certbot --nginx -d example.com

# 测试自动续期
sudo certbot renew --dry-run
```


## 前端依赖安装与 pm2 管理

我们可以通过使用pm2对VoceSpace项目进行管理

```bash
# 安装 PM2
pnpm add -g pm2

# 开机自启动
pm2 startup
pm2 save
```

### 检测pm2状态

```bash
pm2 status
```


## Coturn TURN 服务器部署

用于 WebRTC 通信穿透。

### 安装 Coturn

```bash
sudo apt install coturn -y
```

打开服务器时自动启动，您必须修改/etc/default/coturn文件。

```bash
sudo vim /etc/default/coturn
```

找到以下行并取消注释以将 Coturn 作为自动系统服务守护程序运行。

```bash
TURNSERVER_ENABLED=1
```

### 编辑配置文件

编辑 `/etc/turnserver.conf`：

```conf
server-name=your.server.name
listening-ip=0.0.0.0
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=your.server.name
external-ip=158.247.198.2
min-port=49152
max-port=65535
```

### 启动 Coturn

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl restart coturn
```

### 测试 TURN 服务

可使用 WebRTC 测试页面如：

* [https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

使用如下配置：

```json
{
  "urls": "turn:example.com:3478",
  "username": "user",
  "credential": "password"
}
```



## 自动化部署脚本

我们提供了一个完整的自动化部署脚本，当您在服务器上对以上Nginx, Certbot, pm2, Node(pnpm), Coturn(可选)完成安装与配置之后，您可以直接复制我们的自动化部署脚本进行一键部署！

```bash
#!/bin/bash

#=========================================================================#
# shell script for deploy prod environment
#=========================================================================#

#=========================================================================#
# Variables --------------------------------------------------------------#
#=========================================================================#
ROOT_PATH="/root/vocespace-client/"
KIND="prod"
PKG_NAME="vocespace_prod"
REPO_URL="https://github.com/Privoce/vocespace-client.git"
BRANCH="main"
DEPLOY_NGINX_CONF="vocespace"
NGINX_CONF="nginx.conf"
NGINX_AVA_PATH="/etc/nginx/sites-available"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled"
LOG_FILE="deploy_prod.log"
LOG_SRC="/root/deploy_log"
LOG_PATH="$LOG_SRC/$LOG_FILE"
ERROR_FMT="AUTO DEPLOY ERROR: See $LOG_PATH for more details"
#=========================================================================#
# clear or create log file -----------------------------------------------#
#=========================================================================#
# check or create log src
if [ ! -d $LOG_SRC ]; then
    mkdir -p $LOG_SRC
fi
# check or create log file
if [ -f $LOG_PATH ]; then
    rm $LOG_PATH
fi
touch $LOG_PATH
#=========================================================================#
# Clone or pull and then do pkg (prod)-------------------------------------#
#=========================================================================#
# check if the root path is exist
if [ ! -d $ROOT_PATH ]; then
    mkdir -p $ROOT_PATH
fi

cd $ROOT_PATH

# do clone if vocespace_prod not exist or cd and do pull
if [ ! -d $ROOT_PATH/$PKG_NAME ]; then
    git clone --branch $BRANCH $REPO_URL $PKG_NAME
    if [ $? -ne 0 ]; then
        echo "clone vocespace_prod from github repo failed!" >> $LOG_PATH
        echo $ERROR_FMT
        exit 1
    fi
    echo "SYSTEM: clone vocespace_prod from github repo success" >> $LOG_PATH
    # set remote url for future pull
    cd $ROOT_PATH/$PKG_NAME
    git remote set-url origin $REPO_URL
else
    cd $ROOT_PATH/$PKG_NAME
    # set remote url
    git remote set-url origin $REPO_URL
    # do fetch and reset
    git fetch --all
    if [ $? -ne 0 ]; then
        echo "fetch from github repo failed!" >> $LOG_PATH
        echo $ERROR_FMT
        exit 1
    fi
    git reset --hard origin/$BRANCH
    if [ $? -ne 0 ]; then
        echo "reset to origin/$BRANCH failed!" >> $LOG_PATH
        echo $ERROR_FMT
        exit 1
    fi
    echo "SYSTEM: pull vocespace_prod from github repo success" >> $LOG_PATH
fi
#=========================================================================#
# Build environment ------------------------------------------------------#
#=========================================================================#
# make a .env file
# the following is standard .env file content:
# ```
# LIVEKIT_API_KEY=devkey
# LIVEKIT_API_SECRET=secret
# LIVEKIT_URL=wss://space.voce.chat
# NODE_ENV=production
# ```
# - remove the old .env file and replace with new one
if [ -f .env ]; then
    rm .env
fi
echo "LIVEKIT_API_KEY=devkey" >> .env
echo "LIVEKIT_API_SECRET=secret" >> .env
echo "LIVEKIT_URL=wss://space.voce.chat" >> .env
echo "NEXT_PUBLIC_BASE_PATH=/chat" >> .env
#=========================================================================#
# install dependencies and build -----------------------------------------#
#=========================================================================#
# do pnpm install and build
pnpm install
if [ $? -ne 0 ]; then
    echo "pnpm install failed!" >> $LOG_PATH
    echo $ERROR_FMT
    exit 1
fi
# - set NODE_OPTIONS for build add heap size to 8192
export NODE_OPTIONS="--max-old-space-size=8192"
# - build the project
pnpm build
if [ $? -ne 0 ]; then
    echo "pnpm build failed!" >> $LOG_PATH
    echo $ERROR_FMT
    exit 1
fi
echo "SYSTEM: pnpm install and build success" >> $LOG_PATH
#=========================================================================#
# pm2 stop and delete old version then pub--------------------------------#
#=========================================================================#
# stop $PKG_NAME
pm2 stop $PKG_NAME
# delete $PKG_NAME
pm2 delete $PKG_NAME
# start pm2 npm 
PORT=3000 pm2 start npm --name $PKG_NAME -- start
# save pm2
pm2 save
# sleep 2s for pm2 server to start
sleep 2
# netstat -tulnp | grep 3030 to check if the server is running, if have echo success
if [ $(netstat -tulnp | grep 3000 | wc -l) -gt 0 ]; then
    echo "pm2 server rebuild success!" >> $LOG_PATH
else 
    echo "pm2 server rebuild failed!" >> $LOG_PATH
    echo $ERROR_FMT
    exit 1
fi
# echo all done
echo "Deploy Prod: All done! Please check $LOG_PATH for more details to make sure everything is fine."
exit 0
```
