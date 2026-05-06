# Kite

Kite 是一个面向内部团队的轻量项目管理系统，首版提供多工作区、项目、任务看板/列表、评论、优先级、负责人和截止日期。

## 环境要求

- Node.js 22 或更高版本
- pnpm 9 或更高版本
- PostgreSQL 15 或更高版本

## 本地开发

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
cp .env.example .env
pnpm prisma:migrate
pnpm dev
```

访问 `http://localhost:3000`，注册第一个用户后需由系统管理员创建工作区并添加成员。

如果当前机器不能使用 pnpm，也可以用 npm fallback：

```bash
npm install
npm run prisma:migrate
npm run dev
```

## 初始化管理员

执行数据库重置脚本会清空所有业务数据，并创建默认超级管理员：

- 邮箱：`admin@example.com`
- 初始密码：`plane`
- 系统角色：`SUPER_ADMIN`

默认管理员首次登录必须修改密码，修改后才能进入工作区。只有系统角色为 `SUPER_ADMIN` 的账号可以新建工作区，普通用户需要被添加到已有工作区后才能使用项目和任务功能。

```bash
npm run reset-db
```

## 快速演示数据

需要快速验证工作区权限、项目级权限、看板、列表、评论和归档项目时，可以执行：

```bash
npm run seed:demo
```

该脚本只会重建 `kite-demo` 工作区和以下演示账号，密码均为 `plane`：

- `owner@example.com`：工作区 OWNER，可查看和管理全部项目。
- `pm-admin@example.com`：工作区 ADMIN，可查看和管理全部项目。
- `lead@example.com`：工作区 MEMBER，`PLAT` 项目 LEAD，`ARCH` 项目 MEMBER。
- `member@example.com`：工作区 MEMBER，`PLAT` 项目 MEMBER，`OPS` 项目 LEAD。
- `viewer@example.com`：工作区 MEMBER，`PLAT`/`OPS` 项目 VIEWER。
- `outsider@example.com`：无工作区成员身份，用于验证访问隔离。

## 生产部署（裸机 Node）

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
pnpm prisma:deploy
pnpm build
pnpm start
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
pnpm install --frozen-lockfile
pnpm prisma:deploy
pnpm build
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

首版不包含附件、实时协作、Cycles、Modules、Pages、Analytics、AI、计费或审计日志。任务状态固定为 `待处理`、`进行中`、`已完成`。
