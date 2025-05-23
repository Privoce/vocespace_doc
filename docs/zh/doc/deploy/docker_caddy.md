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
  -p 7880:7880 \
  -e SERVER_NAME=your.server.name \
  --name live_meet_app \
  privoce/vocespace:latest
```

> [!NOTE]
>
> * `-p 3000:3000`：将容器的 3000 端口映射至宿主机 3000 端口。
> * `-e SERVER_NAME=your.server.name`：设置服务运行的主机名，供应用内部识别。(可选)
> * `--name`：给容器命名，便于后续管理。


## 2. 安装并配置Caddy

> [!INFO]
>
> 以下为 Ubuntu/Debian 安装方式
>
> 其他类型请参考：[Caddy install](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

### 2.1 安装Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 2.2 配置Caddy

Caddy支持多种方式进行配置，同时也直接支持使用nginx conf的方式

> [!WARNING]
>
> 请确保您已经购买了域名并进行了DNS解析

```bash
vim /etc/caddy/Caddyfile

# 配置如下：
your.server.name {
    tls {
      protocols tls1.2 tls1.3
    }
    reverse_proxy /* localhost:3000
}
```


### 2.3 重启并开机自启动

```bash
systemctl stop caddy
systemctl enabled caddy
systemctl start caddy
```