# Docker + Nginx Production Deployment Guide

Through this guide, you will learn how to use Docker and Nginx to officially deploy applications to the production environment and configure HTTPS certificates to ensure communication security.

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
> * `-e SERVER_NAME=your.server.name`: Set the host name where the service runs for internal identification.
> * `--name`: Name the container for easy subsequent management.

## 2. Install and configure Nginx

### 2.1 Install Nginx and Certbot

Make sure the system is updated and install the required packages:

```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

> [!WARNING]
>
> * If you are using CentOS or other non-Debian distributions, please change to the corresponding package management command (such as `yum` or `dnf`).
> * `certbot` and `python3-certbot-nginx` are tools for automatically configuring HTTPS.

### 2.2 Configure `nginx.conf` (global configuration)

Path: `/etc/nginx/nginx.conf`

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
> * This is a global configuration and usually does not need to be changed frequently.
> * It is recommended to enable logrotate for the log directory to avoid disk fullness.

---

### 2.3 Configure site files (virtual host configuration)

Path recommendation: `/etc/nginx/sites-enabled/vocespace` or `/etc/nginx/conf.d/vocespace`

First, perform a simple configuration:

```nginx
# HTTP to HTTPS redirection
server {
    listen 80;
    listen [::]:80;

    server_name your.server.name;

    location / {
        return 301 https://$host$request_uri;
    }

    return 404;
}
```
### 2.4 Apply for an HTTPS certificate using Certbot

Make sure the domain name is correctly resolved to the server IP in the DNS service provider.

#### Certificate issuance command

```bash
certbot --nginx -d your.server.name --register-unsafely-without-email
```

> [!NOTE]
>
> * `--nginx`: Certbot will automatically modify your nginx configuration to enable HTTPS.
> * `--register-unsafely-without-email`: Do not bind an email address. **Not recommended for official use**, it is recommended to add `--email your@email.com`.

### Verify Nginx status and restart

```bash
nginx -t
systemctl reload nginx
```

### 2.5 Complete the https configuration

```nginx
# HTTPS reverse proxy configuration
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name your.server.name;

    ssl_certificate /etc/letsencrypt/live/your.server.name/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.server.name/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Application main service (such as front-end or back-end web interface)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebRTC service proxy (port and path depend on the project)
    location /rtc {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Socket.IO real-time communication proxy
    # location /socket.io {
    #    proxy_pass http://127.0.0.1:3000;  # Please modify according to the actual port
    #    proxy_http_version 1.1;
    #    proxy_set_header Upgrade $http_upgrade;
    #    proxy_set_header Connection "Upgrade";
    #    proxy_set_header Host $host;
    #    proxy_set_header X-Real-IP $remote_addr;
    #    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #    proxy_set_header X-Forwarded-Proto $scheme;
    #    proxy_cache_bypass $http_upgrade;
    # }
}
```

> [!WARNING]
>
> * `server_name` must be consistent with the domain name of the certificate you actually applied for.
> * Please make sure that the files in `/etc/letsencrypt/live/your.server.name/` have been generated (see the next section).
> The ssl configuration is generated by certbot

### 2.4 Start and check the status of Nginx

```bash
# Check if the configuration is correct
nginx -t

# Reload the configuration (recommended) or restart the service
systemctl reload nginx
# or
systemctl restart nginx
```


## Additional suggestions

**Automatically renew the certificate**:

```bash
# Test renewal
certbot renew --dry-run
```

**Open ports in the firewall** (if using `ufw`):

```bash
ufw allow 'Nginx Full'
```

**HTTPS enforcement and security reinforcement**: You can add the following configuration in `nginx.conf`:

  ```nginx
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;
  ```
