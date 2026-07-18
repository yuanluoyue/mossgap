import { listGameCards } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { SITE_NAME, SITE_TAGLINE_EN, getSiteUrl, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * llms.txt（https://llmstxt.org）
 *
 * 纯文本清单，供 LLM / AI 爬虫快速理解站点结构。
 * 列出核心静态页面 + 所有已发布游戏的详情页 URL。
 */
export async function GET() {
  const siteUrl = await getSiteUrl();
  const enabled = await hasServerEnv();

  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_TAGLINE_EN}. Play browser games instantly, no download required.`,
    "",
    "## Core Pages",
    `- [Home](${siteUrl}/): ${SITE_NAME} homepage with featured games`,
    `- [All Games](${absoluteUrl(siteUrl, "/games")}): Browse all browser games`,
    `- [About](${absoluteUrl(siteUrl, "/about")}): About ${SITE_NAME}`,
    `- [Contact](${absoluteUrl(siteUrl, "/contact")}): Contact us`,
    `- [Privacy Policy](${absoluteUrl(siteUrl, "/privacy")})`,
    `- [Terms of Service](${absoluteUrl(siteUrl, "/terms")})`,
    `- [Copyright Notice](${absoluteUrl(siteUrl, "/copyright-notice")})`,
    "",
  ];

  // 仅在服务端 env 就绪时列出游戏（与 sitemap 一致，dev 环境兜底）
  if (enabled) {
    // 拉取所有已发布游戏（按权重排序），上限 500 防止极端情况
    const { items } = await listGameCards(
      { page: 1, pageSize: 500, sort: "weight" },
      "en",
    );
    if (items.length > 0) {
      lines.push("## Games");
      for (const g of items) {
        const title = g.title || g.slug;
        lines.push(`- [${title}](${absoluteUrl(siteUrl, `/games/${g.slug}`)}): Play ${title} online for free`);
      }
      lines.push("");
    }
  }

  lines.push("## Optional");
  lines.push(`- [Sitemap](${absoluteUrl(siteUrl, "/sitemap.xml")}): XML sitemap for search engines`);
  lines.push(`- [Robots](${absoluteUrl(siteUrl, "/robots.txt")}): Robots exclusion protocol`);

  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
