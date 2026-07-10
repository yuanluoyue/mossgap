import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE } from "./lib/auth";

// 使用 middleware.ts（而非 Next.js 16 的 proxy.ts）以确保 edge runtime
// OpenNext (Cloudflare) 不支持 Node.js middleware/proxy
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin 路由：仅做登录态乐观校验，不走 i18n（Admin 仅中文）
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isLogin = pathname === "/admin/login";
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (isLogin) {
      if (token) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }
    if (!token) {
      const url = new URL("/admin/login", request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 其余路由走 next-intl 国际化
  return intlMiddleware(request);
}

export const config = {
  // 匹配除 /api、/_next、/_vercel 及含点（静态资源）外的所有路径
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
