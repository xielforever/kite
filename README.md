# Kite

Kite 是一个面向内部团队的轻量项目管理系统，提供工作区、项目、任务看板、任务列表、评论、优先级、负责人、截止日期和项目成员权限管理。

## 环境要求

- Node.js 22 或更高版本
- npm 11 或更高版本
- PostgreSQL 15 或更高版本

## 首次初始化

Kite 推荐通过页面完成首次初始化。数据库需要先在 PostgreSQL 中手动创建，应用不会自动创建数据库。

### 1. 创建数据库和用户

示例 SQL：

```sql
CREATE DATABASE kite;
CREATE USER kite_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE kite TO kite_user;

\c kite;
GRANT ALL ON SCHEMA public TO kite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kite_user;
```

数据库账号需要具备：

- 连接目标数据库的权限
- 在 `public` schema 中创建表、索引、枚举类型的权限
- Prisma migration 所需的 DDL 权限

### 2. 启动应用

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000/setup
```

### 3. 页面三步初始化

`/setup` 会按顺序完成：

1. 验证数据源：填写 PG 地址、端口、用户名、密码、数据库名，并验证连接和建表权限。
2. 执行迁移：执行 `prisma migrate deploy`。
3. 创建管理员：创建第一个 `SUPER_ADMIN`、默认工作区和默认项目，并写入 `AUTH_URL`。

初始化成功后，当前页面会锁定，防止重复提交。服务重启后，已初始化环境访问 `/setup` 会重定向到登录页。

## 本地开发

```bash
npm install
npm run dev
```

首次本地开发也可以直接使用 `/setup` 初始化。

常用命令：

```bash
npm run lint
npm run test
npm run build
```

开发辅助脚本：

```bash
npm run reset-db
npm run seed:demo
npm run clear-db
```

`clear-db` 只清空业务数据，保留表结构和 `_prisma_migrations`，适合重新测试 `/setup` 初始化流程。

`reset-db` 会清空业务数据并创建默认管理员，仅适合本地开发或可丢弃环境。`seed:demo` 用于写入演示数据。

默认关闭公开注册，系统管理员可在后台新增用户。如确需允许用户自行注册，可设置：

```env
KITE_ALLOW_PUBLIC_REGISTRATION="true"
```

## 生产部署

裸 Node 部署：

```bash
npm ci
npm run build
npm run start
```

推荐首次启动后通过 `/setup` 完成数据库、访问地址、superAdmin、默认工作区和默认项目初始化。初始化会写入 `KITE_ENV_FILE` 指向的环境文件；如果未设置 `KITE_ENV_FILE`，默认写入项目根目录 `.env`。

只有在已有初始化配置或需要手工迁移配置时，才需要直接维护以下运行时变量：

```env
DATABASE_URL="postgresql://kite_user:your_password@localhost:5432/kite?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="https://tasks.example.com"
```

远程访问时不要把 `AUTH_URL` 设置为 `http://localhost:3000`。如果通过服务器 IP 访问，可以设置为：

```env
AUTH_URL="http://<server-ip>:3000"
```

否则认证流程可能把浏览器重定向回访问者本机的 `localhost:3000`。

手工维护时可用以下命令生成 `AUTH_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## systemd 部署

项目提供 systemd 服务模板和安装脚本：

```bash
sudo bash scripts/install-systemd.sh
```

默认安装位置：

- 应用目录：`/opt/kite`
- 环境文件：`/etc/kite/kite.env`
- 服务名：`kite`

可通过环境变量覆盖：

```bash
sudo APP_DIR=/srv/kite ENV_DIR=/etc/kite SERVICE_NAME=kite bash scripts/install-systemd.sh
```

首次安装后访问：

```text
http://<server>:3000/setup
```

完成页面初始化后重启服务：

```bash
sudo bash scripts/restart-kite.sh
```

也可以直接使用：

```bash
sudo systemctl restart kite
```

## Docker Compose 部署

项目提供 Docker Compose 部署方式，只启动 Kite 应用容器。PostgreSQL 需要提前手动创建数据库和账号，连接信息在 `/setup` 页面填写，不在 Compose 环境变量中预置。

```bash
cd deploy/docker-compose
cp .env.example .env
mkdir -p data
docker compose up -d --build
```

首次启动后访问：

```text
http://<server>:3000/setup
```

完成页面初始化后重启应用容器：

```bash
docker compose restart app
```

详细步骤见 [deploy/docker-compose/README.md](deploy/docker-compose/README.md)。

## 权限模型

- 只有 `SUPER_ADMIN` 可以创建工作区和项目。
- 普通用户需要被加入具体项目后，才能看到对应工作区和项目。
- 项目角色：
  - `LEAD`：管理项目和项目成员。
  - `MEMBER`：编辑任务内容。
  - `VIEWER`：只读访问。
- 工作区仅作为项目容器，不再暴露独立的成员管理入口。

## 任务生命周期

任务状态：

- `TODO`：待处理
- `IN_PROGRESS`：进行中
- `REVIEW`：待评审
- `DONE`：已完成
- `CLOSED`：已关闭

状态流转由系统限制，避免通过普通编辑绕过任务生命周期。普通编辑只更新标题、描述、优先级、负责人和截止日期，并在活动记录中写入字段级变化。

## 项目脚本

```bash
npm run dev              # 启动开发服务
npm run build            # Prisma generate + Next build
npm run start            # 启动生产服务
npm run lint             # ESLint
npm run test             # Vitest
npm run prisma:deploy    # 执行生产迁移
npm run prisma:migrate   # 本地开发迁移
npm run check:migrations # 检查 schema 与迁移历史是否一致
npm run clear-db         # 清空业务数据，保留迁移记录
npm run reset-db         # 清空并写入本地默认管理员
npm run seed:demo        # 写入演示数据
```

`check:migrations` 需要可用的 PostgreSQL shadow database。默认会尝试使用当前本地库名追加 `_shadow`，例如 `kite_shadow`；如果数据库用户没有 `CREATE DATABASE` 权限，请手动创建 shadow 库或设置 `SHADOW_DATABASE_URL`。

## 边界说明

当前版本不包含附件、实时协作、Cycles、Modules、Pages、Analytics、AI 或计费能力。
