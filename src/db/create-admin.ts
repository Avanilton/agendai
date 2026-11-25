import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "./index";
import { accounts, users } from "./schema";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Administrador Agendai").trim();

  if (!email || !password) {
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_PASSWORD nas variáveis de ambiente."
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
  }

  const db = getDb();
  const hashedPassword = await hashPassword(password);
  const now = new Date();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;

  if (existing) {
    userId = existing.id;
    await db
      .update(users)
      .set({
        isPlatformAdmin: true,
        emailVerified: true,
        deletedAt: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    console.log(
      `Usuário existente promovido a superusuário admin: ${email} (id=${userId})`
    );
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        emailVerified: true,
        isPlatformAdmin: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    userId = created!.id;
    console.log(`Superusuário admin criado com sucesso: ${email} (id=${userId})`);
  }

  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"))
    )
    .limit(1);

  if (existingAccount) {
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
        updatedAt: now,
      })
      .where(eq(accounts.id, existingAccount.id));
    console.log("Senha da conta credential atualizada.");
  } else {
    await db.insert(accounts).values({
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });
    console.log("Conta credential criada.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro ao criar superusuário admin:", err);
    process.exit(1);
  });

