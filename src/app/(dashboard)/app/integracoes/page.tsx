import { redirect } from "next/navigation";

export default function IntegrationsRedirectPage() {
  redirect("/app/configuracoes?tab=integracoes");
}
