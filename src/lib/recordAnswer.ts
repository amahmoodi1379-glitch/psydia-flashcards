import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const inFlightRequests = new Map<string, Promise<RecordAnswerResult>>();

export class RecordAnswerError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "RecordAnswerError";
    this.code = code;
  }
}


export interface RecordAnswerResult {
  alreadyProcessed: boolean;
  quotaAllowed: boolean;
  quotaRemaining: number | null;
}

export interface RecordAnswerInput {
  userId: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  clientRequestId?: string;
}

const getErrorMessage = (error: { code?: string; message?: string; details?: string | null }) => {
  if (error.code === "57014") {
    return "درخواست شما به دلیل timeout کامل نشد. لطفاً دوباره تلاش کنید.";
  }

  if (error.code === "23505" || error.code === "409") {
    return "این پاسخ قبلاً ثبت شده است.";
  }

  const combinedErrorText = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (
    combinedErrorText.includes("failed to fetch") ||
    combinedErrorText.includes("network") ||
    combinedErrorText.includes("timeout")
  ) {
    return "اتصال اینترنت ناپایدار است یا قطع شده. لطفاً اتصال را بررسی کنید و همان سوال را دوباره ثبت کنید.";
  }

  return "ثبت پاسخ با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
};

export async function recordAnswerWithRpc(
  client: Pick<SupabaseClient<Database>, "rpc">,
  input: RecordAnswerInput
): Promise<RecordAnswerResult> {
  const requestId = input.clientRequestId ?? crypto.randomUUID();
  const requestKey = `${input.userId}:${input.questionId}:${requestId}`;

  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const { data, error } = await client.rpc("record_answer_and_update_state", {
      p_question_id: input.questionId,
      p_selected_index: input.selectedIndex,
      p_is_correct: input.isCorrect,
      p_client_request_id: requestId,
    });

    if (error) {
      throw new RecordAnswerError(getErrorMessage(error), error.code);
    }

    const row = data?.[0];
    return {
      alreadyProcessed: row?.already_processed ?? false,
      quotaAllowed: row?.quota_allowed ?? true,
      quotaRemaining: row?.quota_remaining ?? null,
    };
  })();

  inFlightRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}
