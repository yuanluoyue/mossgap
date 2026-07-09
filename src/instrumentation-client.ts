// Sentry 客户端初始化：仅捕获 JS 错误，不开 Performance / Logs / Replay
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a4d9ab3eac3f3ab10cb7dee9de378060@o4508409298026496.ingest.de.sentry.io/4511706435223632",
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
});
