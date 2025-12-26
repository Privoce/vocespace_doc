# Руководство по гибкому развертыванию VoceSpace

В этом документе описывается, как развернуть проект интерфейса `vocespace-client` на сервере Ubuntu, настроить Nginx + HTTPS, установить зависимости, управлять сервисом с помощью PM2 и настроить сервис TURN для WebRTC.

## Получение и сборка проекта (необязательно)

На самом деле, вам не нужно вручную клонировать проект; мы уже сделали это за вас в скрипте автоматического развертывания.

```bash
# Проект клонирования
git clone https://github.com/your-org/vocespace-client.git vocespace-client
```

## Установка и настройка Nginx

### Установка Nginx и Certbot

Убедитесь, что ваша система обновлена ​​и установлены необходимые пакеты:

```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

> [ВНИМАНИЕ]
> 
> * Если вы используете CentOS или другой дистрибутив, отличный от Debian, пожалуйста, используйте соответствующую команду управления пакетами (например, `yum` или `dnf`).
> 
> * `certbot` и `python3-certbot-nginx` — это инструменты для автоматической настройки HTTPS.


### Настройка `nginx.conf` (глобальная конфигурация)

Путь: `/etc/nginx/nginx.conf`

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
> * Это глобальная конфигурация, и обычно её не нужно часто менять.
> * Рекомендуется включить функцию logrotate для каталога логов, чтобы избежать заполнения дискового пространства.

---

### Файлы конфигурации сайта (конфигурация виртуального хоста)

Рекомендуемый путь: `/etc/nginx/sites-enabled/livemeet.conf` или `/etc/nginx/conf.d/livemeet.conf`

```nginx
# Перенаправление HTTP на HTTPS
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

# Настройка обратного прокси HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name your.server.name;

    ssl_certificate /etc/letsencrypt/live/your.server.name/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.server.name/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Основной сервис приложения (например, веб-интерфейс для внешнего или внутреннего интерфейса).
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Прокси-сервер WebRTC (порт и путь зависят от проекта)
    location /rtc {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Прокси-сервер для обмена данными в реальном времени Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;  # Пожалуйста, внесите изменения в соответствии с фактическим портом.
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
> * Значение `server_name` должно совпадать с доменным именем сертификата, на который вы фактически подавали заявку.
> * Убедитесь, что файл в папке `/etc/letsencrypt/live/your.server.name/` создан (см. следующий раздел).

---

### Запуск и проверка состояния Nginx

```bash
# Проверьте правильность настроек.
nginx -t

# Перезагрузите конфигурацию (рекомендуется) или перезапустите службу.
systemctl reload nginx
# or
systemctl restart nginx
```


## Получение HTTPS-сертификата с помощью Certbot

Убедитесь, что ваш DNS-провайдер правильно преобразует доменное имя в IP-адрес сервера.

### Команда выдачи сертификата

```bash
certbot --nginx -d your.server.name --register-unsafely-without-email
```

> [!NOTE]
>
> * `--nginx`: Certbot автоматически изменит конфигурацию nginx, чтобы включить HTTPS.
> * `--register-unsafely-without-email`: Не привязывать адрес электронной почты. **Не рекомендуется для использования в производственной среде**, рекомендуется добавить `--email your@email.com`.

### Проверьте состояние Nginx и перезапустите его

```bash
nginx -t
systemctl reload nginx
```


## HTTPS и автоматическое продление сертификатов (Certbot)

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Получение и настройка сертификатов
sudo certbot --nginx -d example.com

# Тестирование автоматического продления
sudo certbot renew --dry-run
```


## Установка зависимостей для фронтенда и управление pm2

Мы можем управлять проектом VoiceSpace с помощью pm2.

```bash
# Установка PM2
pnpm add -g pm2

# Автоматический запуск при загрузке
pm2 startup
pm2 save
```

### Определение статуса PM2

```bash
pm2 status
```


## Развертывание сервера Coturn TURN

Используется для туннелирования связи WebRTC.

### Установка Coturn

```bash
sudo apt install coturn -y
```

Для включения автоматического запуска при открытии сервера необходимо изменить файл /etc/default/coturn.

```bash
sudo vim /etc/default/coturn
```

Найдите следующую строку и раскомментируйте её, чтобы запустить Coturn в качестве автоматической системной службы-демона.

```bash
TURNSERVER_ENABLED=1
```

### Редактирование конфигурационных файлов

Редактируйте файл `/etc/turnserver.conf`:

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

### запускать coturn

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl restart coturn
```

### Тестирование сервиса TURN

Вы можете использовать тестовую страницу WebRTC, например:

* [https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

Используйте следующую конфигурацию:

```json
{
  "urls": "turn:example.com:3478",
  "username": "user",
  "credential": "password"
}
```


## Автоматизированный скрипт развертывания

Мы предоставляем полный автоматизированный скрипт развертывания. После завершения установки и настройки Nginx, Certbot, pm2, Node (pnpm) и Coturn (опционально) на вашем сервере, вы можете напрямую скопировать наш автоматизированный скрипт развертывания для развертывания в один клик!

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
echo "LIVEKIT_URL=ws://localhost:7880" >> .env
echo "WEBHOOK=false" >> .env
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
