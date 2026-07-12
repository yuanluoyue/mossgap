import type { Metadata } from "next";

// 二分法：暂时移除所有 DB 查询和组件导入，只保留最小静态渲染
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Game ${slug}`,
    description: "Debug mode",
  };
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  console.log("[GameDetail] render start", { locale, slug });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">[Debug] Game Detail Minimal</h1>
      <p className="mt-4 text-sm">locale: {locale}</p>
      <p className="text-sm">slug: {slug}</p>
    </div>
  );
}
