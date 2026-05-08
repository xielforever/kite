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
3. 创建管理员：创建第一个 `SUPER_ADMIN` 和默认工作区。

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
```

`reset-db` 会清空业务数据并创建默认管理员，仅适合本地开发或可丢弃环境。`seed:demo` 用于写入演示数据。

## 生产部署

裸 Node 部署：

```bash
npm ci
npm run build
npm run start
```

生产环境至少需要配置：

```env
DATABASE_URL="postgresql://kite_user:your_password@localhost:5432/kite?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="https://tasks.example.com"
```

生成 `AUTH_SECRET`：

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

状态流转由系统限制，避免通过普通编辑绕过任务生命周期。

## 项目脚本

```bash
npm run dev              # 启动开发服务
npm run build            # Prisma generate + Next build
npm run start            # 启动生产服务
npm run lint             # ESLint
npm run test             # Vitest
npm run prisma:deploy    # 执行生产迁移
npm run prisma:migrate   # 本地开发迁移
npm run reset-db         # 清空并写入本地默认管理员
npm run seed:demo        # 写入演示数据
```

## 边界说明

当前版本不包含附件、实时协作、Cycles、Modules、Pages、Analytics、AI 或计费能力。
