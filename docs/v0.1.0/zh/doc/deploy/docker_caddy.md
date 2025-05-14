# Docker + Caddy

Caddy 比 Nginx 更简单，因为它可以自动申请证书。

您需要先启动项目容器，然后再安装和配置 Caddy，否则证书申请可能会失败。

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


## 2. 安装并配置Caddy

### 2.1 安装Caddy

```bash
sudo apt update
sudo apt install caddy
```

### 2.2 配置Caddy

Caddy支持多种方式进行配置，同时也直接支持使用nginx conf的方式

```bash
vim /etc/caddy/Caddyfile

# 配置如下：
your.server.name {
    root * /app
    ...
    reverse_proxy /* localhost:3000
}
```

### 2.3 重启并开机自启动

```bash
systemctl stop caddy
systemctl enabled caddy
systemctl start caddy
```