import { randomBytes } from "crypto"

export type BookingMode = "direct" | "proposal" | "poll"
export type QuestionType = "text" | "textarea" | "phone"

export interface AvailabilityRules {
  workingDays: number[]
  startTime: string
  endTime: string
  slotIntervalMinutes: number
  minNoticeMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  rollingWindowDays: number
  maxBookingsPerDay: number
}

export type AvailabilityOverrides = Partial<AvailabilityRules>

export interface CustomQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
}

export interface CustomAnswer {
  questionId: string
  label: string
  value: string
}

export const DEFAULT_AVAILABILITY_RULES: AvailabilityRules = {
  workingDays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "17:00",
  slotIntervalMinutes: 60,
  minNoticeMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  rollingWindowDays: 30,
  maxBookingsPerDay: 8,
}

export function normalizeAvailabilityRules(
  globalRules?: Partial<AvailabilityRules>,
  overrides?: Partial<AvailabilityRules>,
): AvailabilityRules {
  return {
    ...DEFAULT_AVAILABILITY_RULES,
    ...globalRules,
    ...overrides,
    workingDays:
      overrides?.workingDays && overrides.workingDays.length > 0
        ? overrides.workingDays
        : globalRules?.workingDays && globalRules.workingDays.length > 0
          ? globalRules.workingDays
          : DEFAULT_AVAILABILITY_RULES.workingDays,
  }
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "meeting"
}

export function createQuestionId() {
  return randomBytes(8).toString("hex")
}

export function validateAnswers(questions: CustomQuestion[], answers: CustomAnswer[] = []) {
  const errors: Record<string, string> = {}
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.value.trim()]))

  questions.forEach((question) => {
    if (question.required && !answerMap.get(question.id)) {
      errors[question.id] = "Required"
    }
  })

  return errors
}

export function normalizeAnswers(questions: CustomQuestion[], rawAnswers: CustomAnswer[] = []): CustomAnswer[] {
  const answerMap = new Map(rawAnswers.map((answer) => [answer.questionId, answer.value]))

  return questions
    .map((question) => ({
      questionId: question.id,
      label: question.label,
      value: String(answerMap.get(question.id) || "").trim(),
    }))
    .filter((answer) => answer.value.length > 0)
}
