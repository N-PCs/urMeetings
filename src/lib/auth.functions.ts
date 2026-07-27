import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ConfirmInput = z.object({
  userId: z.string().uuid(),
});

export const autoConfirmSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConfirmInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
