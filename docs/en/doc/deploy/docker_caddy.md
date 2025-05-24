# Docker + Caddy

Caddy is simpler than Nginx because it can automatically apply for certificates.

You need to start the project container first, then install and configure Caddy, otherwise the certificate application may fail.

## 1. Use Docker to deploy applications locally

### Steps

Before starting to configure Nginx reverse proxy, we need to run the backend service container first.

> [!INFO]
> For detailed deployment methods, please refer to the document: [Local Deployment Guide](/zh/doc/deploy/local_docker)

### Example command

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
> * `-p 3000:3000`: Map the container's port 3000 to the host's port 3000.
> * `-e SERVER_NAME=your.server.name`: Set the host name where the service runs for internal identification. (Optional)
> * `--name`: Name the container for easy management.

## 2. Install and configure Caddy

> [!INFO]
>
> The following is the installation method for Ubuntu/Debian
>
> For other types, please refer to: [Caddy install](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

### 2.1 Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 2.2 Configure Caddy

Caddy supports multiple configuration methods, and also directly supports the use of nginx conf

> [!WARNING]
>
> Please make sure you have purchased the domain name and performed DNS resolution


```bash
vim /etc/caddy/Caddyfile

# The configuration is as follows:
your.server.name {
    tls {
      protocols tls1.2 tls1.3
    }
    reverse_proxy /* localhost:3000
}
```


### 2.3 Restart and enabled

```bash
systemctl stop caddy
systemctl enabled caddy
systemctl start caddy
```