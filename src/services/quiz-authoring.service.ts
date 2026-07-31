// Real mentor-side quiz authoring (create/edit questions+options for a
// lesson's quiz). Mirrors curriculum.service.ts's conventions exactly -
// typed via Tables<>/Inserts<>/Updates<>, auto-assigned sort_order, soft
// delete via deleted_at where the table supports it. Only mcq/true_false
// question types are exposed here - multi_select/short_answer have no
// server-side auto-grading built yet (see submit_quiz_attempt RPC), so
// authoring them would produce questions nothing can ever score.
import type { Inserts, Tables, Updates } from "@/types/database";
import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type Quiz = Tables<"quizzes">;
export type QuizQuestion = Tables<"quiz_questions">;
export type QuizOption = Tables<"quiz_options">;
export type QuizQuestionWithOptions = QuizQuestion & { quiz_options: QuizOption[] };

export async function getOrCreateLessonQuiz(courseId: string, lessonId: string, title: string): Promise<Quiz> {
  const supabase = getSupabaseClientOrThrow();
  const { data: existing, error: findError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  assertServiceResponse(findError);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("quizzes")
    .insert({ course_id: courseId, lesson_id: lessonId, title, passing_score: 70, is_published: false })
    .select("*")
    .single();
  assertServiceResponse(error);
  return data;
}

export async function updateQuiz(quizId: string, input: Updates<"quizzes">): Promise<Quiz> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("quizzes").update(input).eq("id", quizId).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function listQuizQuestions(quizId: string): Promise<QuizQuestionWithOptions[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*, quiz_options(*)")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "quiz_options", ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export type NewQuestionInput = {
  quizId: string;
  questionText: string;
  questionType: "mcq" | "true_false";
  options: { text: string; isCorrect: boolean }[];
};

export async function createQuestionWithOptions(input: NewQuestionInput): Promise<QuizQuestionWithOptions> {
  const supabase = getSupabaseClientOrThrow();

  const { count } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", input.quizId);

  const { data: question, error: questionError } = await supabase
    .from("quiz_questions")
    .insert({ quiz_id: input.quizId, question_text: input.questionText, question_type: input.questionType, sort_order: count ?? 0 })
    .select("*")
    .single();
  assertServiceResponse(questionError);

  const optionRows: Inserts<"quiz_options">[] = input.options.map((opt, i) => ({
    question_id: question.id,
    option_text: opt.text,
    is_correct: opt.isCorrect,
    sort_order: i,
  }));
  const { data: options, error: optionsError } = await supabase.from("quiz_options").insert(optionRows).select("*");
  assertServiceResponse(optionsError);

  return { ...question, quiz_options: options ?? [] };
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  // quiz_questions has no deleted_at column - questions with no attempts yet are hard-deleted (options cascade).
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  assertServiceResponse(error);
}
