import { isDevelopmentSession, readDevelopmentPosts } from "@/lib/development";
import { supabase } from "@/lib/supabase";

export type DiagnosisOutcome = { title: string; description: string };
export type DiagnosisAnswer = { text: string; resultIndex: number };
export type DiagnosisQuestion = { prompt: string; options: DiagnosisAnswer[] };
export type DiagnosisDraft = {
  title: string;
  description: string;
  outcomes: DiagnosisOutcome[];
  questions: DiagnosisQuestion[];
};
export type PostDiagnosis = DiagnosisDraft & {
  id: string;
  creatorId: string;
  resultIndex: number | null;
  result: DiagnosisOutcome | null;
};

export function newDiagnosisDraft(): DiagnosisDraft {
  return {
    title: "",
    description: "",
    outcomes: [{ title: "タイプA", description: "" }, { title: "タイプB", description: "" }],
    questions: [{ prompt: "", options: [{ text: "", resultIndex: 0 }, { text: "", resultIndex: 1 }] }],
  };
}

export function isDiagnosisDraftValid(draft: DiagnosisDraft | null): boolean {
  if (!draft) return true;
  if (Array.from(draft.title.trim()).length < 1 || Array.from(draft.title.trim()).length > 60
    || Array.from(draft.description.trim()).length > 160
    || draft.outcomes.length < 2 || draft.outcomes.length > 6
    || draft.questions.length < 1 || draft.questions.length > 10) return false;
  if (draft.outcomes.some((outcome) => !outcome.title.trim() || Array.from(outcome.title.trim()).length > 40
    || Array.from(outcome.description.trim()).length > 160)) return false;
  return draft.questions.every((question) => question.prompt.trim().length > 0
    && Array.from(question.prompt.trim()).length <= 120
    && question.options.length >= 2 && question.options.length <= 6
    && question.options.every((option) => option.text.trim().length > 0
      && Array.from(option.text.trim()).length <= 60
      && option.resultIndex >= 0 && option.resultIndex < draft.outcomes.length));
}

export type DiagnosisRow = {
  post_id: string;
  diagnosis: {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    outcomes: DiagnosisOutcome[];
    questions: Array<{ prompt: string; options: Array<{ text: string; result_index: number }> }>;
    result_index: number | null;
    result: DiagnosisOutcome | null;
  };
};

export function fromDiagnosisRow(row: DiagnosisRow["diagnosis"]): PostDiagnosis {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description,
    outcomes: row.outcomes,
    questions: row.questions.map((question) => ({
      prompt: question.prompt,
      options: question.options.map((option) => ({ text: option.text, resultIndex: Number(option.result_index) })),
    })),
    resultIndex: row.result_index === null ? null : Number(row.result_index),
    result: row.result,
  };
}

export async function fetchPostDiagnoses(postIds: string[], userId?: string | null): Promise<Map<string, PostDiagnosis>> {
  if (postIds.length === 0) return new Map();
  if (isDevelopmentSession()) {
    return new Map(readDevelopmentPosts().flatMap((post) => post.diagnosis ? [[post.id, post.diagnosis] as const] : []));
  }
  const { data, error } = await supabase.rpc("get_post_diagnoses", {
    requested_post_ids: postIds,
    expected_user_id: userId ?? null,
  });
  if (error) throw error;
  return new Map(((data ?? []) as DiagnosisRow[]).map((row) => [row.post_id, fromDiagnosisRow(row.diagnosis)]));
}

export type DiagnosisSearchResult = { postId: string; diagnosis: PostDiagnosis };

export async function searchUserDiagnoses(query: string, userId?: string | null, limit = 24): Promise<DiagnosisSearchResult[]> {
  const keyword = query.trim();
  if (isDevelopmentSession()) {
    const needle = keyword.toLocaleLowerCase();
    const seen = new Set<string>();
    return readDevelopmentPosts().flatMap((post) => {
      const diagnosis = post.diagnosis;
      if (!diagnosis || seen.has(diagnosis.id)) return [];
      seen.add(diagnosis.id);
      const searchable = [diagnosis.title, diagnosis.description,
        ...diagnosis.outcomes.flatMap((outcome) => [outcome.title, outcome.description]),
        ...diagnosis.questions.flatMap((question) => [question.prompt, ...question.options.map((option) => option.text)])]
        .join(" ").toLocaleLowerCase();
      if (needle && !searchable.includes(needle)) return [];
      return [{ postId: post.id, diagnosis: { ...diagnosis, resultIndex: null, result: null } }];
    }).slice(0, Math.min(Math.max(limit, 1), 50));
  }
  const { data, error } = await supabase.rpc("search_user_diagnoses", {
    search_query: keyword || null,
    expected_user_id: userId ?? null,
    result_limit: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw error;
  return ((data ?? []) as DiagnosisRow[]).map((row) => ({
    postId: row.post_id,
    diagnosis: fromDiagnosisRow(row.diagnosis),
  }));
}
