// Sentry 服务端初始化：仅捕获 JS 错误，不开 Performance / Logs / Replay
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a4d9ab3eac3f3ab10cb7dee9de378060@o4508409298026496.ingest.de.sentry.io/4511706435223632",
  // 多环境区分：dev / production，可通过 SENTRY_ENVIRONMENT 覆盖
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
});
