-- Kite 数据库初始化脚本
-- 适用于 PostgreSQL 15+
-- 使用前请修改用户名、密码和数据库名以符合生产要求

-- 创建数据库
CREATE DATABASE kite;

-- 连接到 kite 数据库
\c kite;

-- 创建数据库用户（可根据需要修改用户名和密码）
CREATE USER kite_user WITH PASSWORD 'kite123456';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE kite TO kite_user

-- 为该用户授予 schema 权限
GRANT ALL ON SCHEMA public TO kite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kite_user;

-- 验证
\l kite;
