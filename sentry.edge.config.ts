// Sentry Edge runtime 初始化：仅捕获 JS 错误
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a4d9ab3eac3f3ab10cb7dee9de378060@o4508409298026496.ingest.de.sentry.io/4511706435223632",
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
});
