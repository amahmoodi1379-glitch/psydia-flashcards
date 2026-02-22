import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const inFlightRequests = new Map<string, Promise<void>>();

export class RecordAnswerError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "RecordAnswerError";
    this.code = code;
  }
}

export interface RecordAnswerInput {
  userId: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  clientRequestId?: string;
}

const getErrorMessage = (error: { code?: string }) => {
  if (error.code === "57014") {
    return "درخواست شما به دلیل timeout کامل نشد. لطفاً دوباره تلاش کنید.";
  }

  if (error.code === "23505" || error.code === "409") {
    return "این پاسخ قبلاً ثبت شده است.";
  }

  return "ثبت پاسخ با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
};

export async function recordAnswerWithRpc(
  client: Pick<SupabaseClient<Database>, "rpc">,
  input: RecordAnswerInput
): Promise<void> {
  const requestId = input.clientRequestId ?? crypto.randomUUID();
  const requestKey = `${input.userId}:${input.questionId}:${requestId}`;

  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const { error } = await client.rpc("record_answer_and_update_state", {
      p_question_id: input.questionId,
      p_selected_index: input.selectedIndex,
      p_is_correct: input.isCorrect,
      p_client_request_id: requestId,
    });

    if (error) {
      throw new RecordAnswerError(getErrorMessage(error), error.code);
    }
  })();

  inFlightRequests.set(requestKey, requestPromise);

  try {
    await requestPromise;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}
