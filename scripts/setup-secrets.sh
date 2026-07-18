#!/bin/bash
# 批量设置 Cloudflare Workers secrets（只需运行一次）
# Secrets 永久保留，wrangler deploy 不会清空。
#
# 用法：
#   bash scripts/setup-secrets.sh            # 从 .dev.vars 读取
#   bash scripts/setup-secrets.sh .env.prod  # 从指定文件读取

set -e

ENV_FILE="${1:-.dev.vars}"

if [ ! -f "$ENV_FILE" ]; then
  echo "错误：找不到环境变量文件 $ENV_FILE"
  echo "用法：bash scripts/setup-secrets.sh [env-file]"
  exit 1
fi

# 从环境变量文件中读取值（支持 KEY=value 格式，忽略注释和空行）
get_env() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2-
}

# 需要设置为 secret 的敏感变量
# 注意：secrets 永久保留在 Cloudflare，wrangler deploy 不会清空。
# GOOGLE_CLIENT_ID 严格说不是敏感信息（会出现在前端授权 URL 中），
# 但放 secret 更省心，避免 wrangler.jsonc 改动导致丢失。
SENSITIVE_VARS=(
  "S3_ACCESS_KEY_ID"
  "S3_SECRET_ACCESS_KEY"
  "JWT_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
)

echo "=========================================="
echo "  设置 Cloudflare Workers Secrets"
echo "=========================================="
echo "  读取文件：$ENV_FILE"
echo "  Worker：mossgap"
echo ""

for var in "${SENSITIVE_VARS[@]}"; do
  value=$(get_env "$var")
  if [ -z "$value" ]; then
    echo "  [跳过] $var （未在 $ENV_FILE 中找到）"
    continue
  fi
  echo "  [设置] $var ..."
  echo "$value" | npx wrangler secret put "$var"
  echo "  [完成] $var"
  echo ""
done

echo "=========================================="
echo "  所有 secrets 设置完成！"
echo "  Secrets 永久保留，deploy 后不会被清空。"
echo "=========================================="
