import { redirect } from "next/navigation";

export default function SecurityRedirectPage() {
  redirect("/app/configuracoes?tab=seguranca");
}
