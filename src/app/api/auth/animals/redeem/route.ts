import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { redeemMossPet, MOSS_PET_REDEEM_PRICE, MOSS_PET_SPECIES_ID } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/animals/redeem — 兑换 moss pet（2 积分，每用户限兑一次）。
 *
 * 幂等：通过 point_logs 的 (bizType=pet_redeem, bizId=moss_pet:userId) 保证。
 * 余额不足或已兑换过时返回错误，不扣积分、不创建宠物。
 */
export async function POST() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const result = await redeemMossPet(guard.user.id);
    if (!result.ok) {
      const message =
        result.reason === "already_redeemed"
          ? "您已经兑换过 moss pet"
          : `积分不足，兑换需要 ${MOSS_PET_REDEEM_PRICE} 积分`;
      const code = result.reason === "already_redeemed" ? "ALREADY_REDEEMED" : "INSUFFICIENT_POINTS";
      return NextResponse.json(fail(code, message), { status: 400 });
    }

    await createAuditLog({
      action: "animal.redeem",
      resource: "animals",
      targetId: result.pet.id,
      meta: {
        ownerId: guard.user.id,
        speciesId: MOSS_PET_SPECIES_ID,
        generation: result.pet.generation,
        price: MOSS_PET_REDEEM_PRICE,
        balance: result.balance,
      },
    });

    return NextResponse.json(ok({ pet: result.pet, balance: result.balance }), { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/auth/animals/redeem", err);
  }
}
