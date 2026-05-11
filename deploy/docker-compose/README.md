# Kite Docker Compose 部署

该目录提供 Kite 应用容器的 Docker Compose 部署方式。只编排 Kite 服务，不预置 PostgreSQL 连接串、鉴权地址或管理员账号。数据库地址、账号、密码、访问入口和管理员账号都在 `/setup` 页面完成初始化。

## 目录文件

- `docker-compose.yml`：只编排 Kite 应用容器。
- `Dockerfile`：构建 Kite 生产镜像。
- `entrypoint.sh`：容器启动时创建并加载 `/setup` 写入的运行时配置。
- `.env.example`：Compose 基础变量示例，只控制项目名、镜像名和 Kite 端口。

## 1. 准备 PostgreSQL

请先在 PostgreSQL 中手动创建数据库和账号，并授予该账号在目标数据库 `public` schema 下建表、建索引和读写数据的权限。

示例连接信息会在 `/setup` 页面填写：

```text
PG 地址：数据库服务器 IP / 域名 / host.docker.internal
端口：5432
用户名：手动创建的数据库用户
密码：手动创建的数据库密码
数据库：手动创建的数据库名
```

如果 PostgreSQL 安装在 Docker 宿主机上，通常可在 setup 中使用 `host.docker.internal` 作为 PG 地址；如果 PostgreSQL 在独立服务器上，填写该服务器的实际地址。

## 2. 准备 Compose 配置

进入本目录：

```bash
cd deploy/docker-compose
```

复制基础配置文件：

```bash
cp .env.example .env
mkdir -p data
```

`.env` 只需要保留基础运行信息：

```env
COMPOSE_PROJECT_NAME=kite
KITE_PORT=3000
KITE_IMAGE=kite:local
```

不要提前创建或填写 `data/kite.env`。容器首次启动时会创建空文件；`DATABASE_URL`、`AUTH_SECRET`、`KITE_PUBLIC_URL` 和 `KITE_SETUP_COMPLETE` 只由 `/setup` 页面在初始化完成后写入。

`docker-compose.yml` 默认开启：

```env
AUTH_TRUST_HOST=true
KITE_DYNAMIC_AUTH_URL=true
```

这意味着登录回跳会使用用户当前访问的域名，不会被初始化时写入的某个固定 IP 绑定死。

## 3. 启动 Kite

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f app
```

## 4. 页面初始化

打开：

```text
http://<server-ip>:3000/setup
```

按页面步骤完成：

1. 验证数据源：填写 PG 地址、端口、用户名、密码和数据库名。
2. 执行迁移：由应用执行 Prisma migrations。
3. 创建管理员：填写部署访问地址、superAdmin、默认工作区和默认项目。

初始化完成后，`/setup` 会把最终运行配置写入 `data/kite.env`。重启应用容器，让 entrypoint 重新加载该文件：

```bash
docker compose restart app
```

之后访问：

```text
http://<server-ip>:3000/login
```

## 公网域名、反向代理和端口映射

默认配置适用于以下场景：

- `http://<server-ip>:3000`
- `https://kite.example.com`
- Nginx、Traefik、SLB 等反向代理
- 内网端口映射到公网端口

如果历史版本的 `data/kite.env` 中已经写入了旧的固定地址，当前 entrypoint 会在默认动态 Host 模式下忽略它，避免公网访问时自动跳回节点 IP。

只有当你明确需要固定唯一访问地址时，才在 `docker-compose.yml` 或 `.env` 中设置：

```env
KITE_DYNAMIC_AUTH_URL=false
```

此时请确保 `data/kite.env` 中的 `KITE_PUBLIC_URL` 是最终公网地址，例如 `https://kite.example.com`。

## 常用命令

```bash
docker compose up -d
docker compose down
docker compose logs -f app
docker compose restart app
docker compose pull
docker compose build --no-cache app
```

进入应用容器执行维护命令：

```bash
docker compose exec app npm run prisma:deploy
docker compose exec app npm run check:migrations
```

## 数据和备份

Docker Compose 只负责 Kite 应用容器。PostgreSQL 数据、备份和恢复由你的数据库部署方式负责。

示例：

```bash
pg_dump -h <pg-host> -U <pg-user> -d <pg-database> > kite-backup.sql
psql -h <pg-host> -U <pg-user> -d <pg-database> < kite-backup.sql
```

## 重新初始化

开发或测试阶段如需重新初始化：

1. 停止应用：`docker compose down`
2. 清空或重建 PostgreSQL 数据库。
3. 清空运行时配置：删除 `data/kite.env`，或将它清空为空文件。
4. 重新启动：`docker compose up -d`
5. 再次访问 `/setup`。
