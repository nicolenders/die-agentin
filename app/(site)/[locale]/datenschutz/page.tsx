import LegalPage from "@/components/LegalPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <LegalPage locale={locale} docKey="PRIVACY" />;
}
