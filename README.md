# Kite

Kite 是一个面向内部团队的轻量项目管理系统，首版提供多工作区、项目、任务看板/列表、评论、优先级、负责人和截止日期。

## 环境要求

- Node.js 22 或更高版本
- npm 11 或更高版本
- PostgreSQL 15 或更高版本

## 本地开发

### 数据库准备

使用 PostgreSQL 15+，首先创建数据库和用户：

```bash
# 方式 1：使用提供的 SQL 脚本（推荐）
psql -U postgres -f prisma/setup-database.sql

# 方式 2：手动执行
psql -U postgres
```

```sql
-- 手动执行
CREATE DATABASE kite;
CREATE USER kite_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE kite TO kite_user;
\c kite;
GRANT ALL ON SCHEMA public TO kite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kite_user;
\q
```

### 项目初始化

```bash
npm install
cp .env.example .env
# 修改 .env 中的 DATABASE_URL 为实际值，例如：
# DATABASE_URL="postgresql://kite_user:your_password@localhost:5432/kite?schema=public"
npm run prisma:migrate
npm run dev
```

访问 `http://localhost:3000`。工作区和项目均由系统管理员创建；普通用户通过项目成员角色获得对应工作区与项目的访问权限。

## 初始化管理员

执行数据库重置脚本会清空所有业务数据，并创建默认超级管理员：

- 邮箱：`admin@example.com`
- 初始密码：`plane`
- 系统角色：`SUPER_ADMIN`

默认管理员首次登录必须修改密码，修改后才能进入工作区。只有系统角色为 `SUPER_ADMIN` 的账号可以新建工作区和项目；普通用户需要被加入具体项目后才能看到对应工作区与项目。

```bash
npm run reset-db
```

## 快速演示数据

需要快速验证工作区权限、项目级权限、看板、列表、评论和归档项目时，可以执行：

```bash
npm run seed:demo
```

该脚本只会重建 `kite-demo` 工作区和以下演示账号，密码均为 `plane`：

- `owner@example.com`（张无忌）：工作区 OWNER，可查看和管理全部项目。
- `pm-admin@example.com`（赵敏）：工作区 ADMIN，可查看和管理全部项目。
- `lead@example.com`（周芷若）：工作区 MEMBER，`PLAT` 项目 LEAD，`ARCH` 项目 MEMBER。
- `member@example.com`（殷离）：工作区 MEMBER，`PLAT` 项目 MEMBER，`OPS` 项目 LEAD。
- `viewer@example.com`（小昭）：工作区 MEMBER，`PLAT`/`OPS` 项目 VIEWER。
- `outsider@example.com`（宋青书）：无项目成员身份，用于验证访问隔离。

## 生产部署（裸机 Node）

```bash
npm ci
npm run prisma:deploy
npm run build
npm run start
```

生产环境必须设置：

- `DATABASE_URL`：PostgreSQL 连接串。
- `AUTH_SECRET`：至少 32 字符的随机密钥。
- `AUTH_URL`：站点访问地址，例如 `https://tasks.example.com`。

> `package.json` 固定在 Next.js 15.1.11 和 React 19.2.5。正式上线前仍建议按当时官方安全公告复核依赖。

### 生成强密钥

生产环境不要使用 `.env.example` 或本地测试值。可以用 Node 生成：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

然后写入：

```env
AUTH_SECRET="生成的随机值"
```

### PM2 示例

```bash
npm install -g pm2
pm2 start npm --name kite -- start
pm2 save
pm2 startup
```

更新时：

```bash
git pull
npm ci
npm run prisma:deploy
npm run build
pm2 restart kite
```

### systemd 示例

创建 `/etc/systemd/system/kite.service`：

```ini
[Unit]
Description=Kite
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/kite
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable kite
sudo systemctl start kite
```

## 功能边界

首版不包含附件、实时协作、Cycles、Modules、Pages、Analytics、AI 或计费。任务生命周期状态固定为 `待处理`、`进行中`、`待评审`、`已完成`、`已关闭`。

## 页面初始化与 systemd

首次启动时可以先不手工执行迁移和 seed。应用会在未初始化时引导到 `/setup`：

1. 填写 PostgreSQL `DATABASE_URL`。
2. 创建初始 `SUPER_ADMIN`。
3. 执行 `prisma migrate deploy`。
4. 写入环境文件并创建默认工作区。
5. 重启服务后进入登录页。

systemd 部署时建议使用 `/etc/kite/kite.env` 作为环境文件，初始化页会根据 `KITE_ENV_FILE` 写入该文件。

仓库提供了可直接安装的服务模板和脚本：

```bash
sudo bash scripts/install-systemd.sh
```

默认安装到：

- 应用目录：`/opt/kite`
- 环境文件：`/etc/kite/kite.env`
- 服务名：`kite`

可通过环境变量覆盖：

```bash
sudo APP_DIR=/srv/kite ENV_DIR=/etc/kite SERVICE_NAME=kite bash scripts/install-systemd.sh
```

初始化完成后重启：

```bash
sudo bash scripts/restart-kite.sh
```
