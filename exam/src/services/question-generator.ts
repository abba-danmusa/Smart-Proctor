export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface GeneratedQuestion {
  questionNumber: number
  topic: string
  difficulty: QuestionDifficulty
  prompt: string
  options: string[]
  answer: string
  explanation: string
}

export interface QuestionGenerationInput {
  courseCode: string
  courseTitle: string
  examTitle: string
  instructions: string
  topics: string[]
  numberOfQuestions: number
  difficulty: QuestionDifficulty
}

const PROMPT_TEMPLATES: Record<QuestionDifficulty, Array<(topic: string, courseCode: string, courseTitle: string) => string>> = {
  easy: [
    (topic, courseCode, courseTitle) => `Which option best describes ${topic} in ${courseCode} (${courseTitle})?`,
    (topic, courseCode, courseTitle) => `In ${courseCode} (${courseTitle}), what is the main role of ${topic}?`,
    (topic, courseCode, courseTitle) => `Choose the most accurate statement about ${topic} for ${courseCode} (${courseTitle}).`,
  ],
  medium: [
    (topic, courseCode, courseTitle) =>
      `A lecturer designs an assessment around ${topic} in ${courseCode} (${courseTitle}). Which response is most appropriate?`,
    (topic, courseCode, courseTitle) =>
      `Considering applied use-cases in ${courseCode} (${courseTitle}), which option reflects sound reasoning about ${topic}?`,
    (topic, courseCode, courseTitle) =>
      `Which option demonstrates practical understanding of ${topic} when solving problems in ${courseCode} (${courseTitle})?`,
  ],
  hard: [
    (topic, courseCode, courseTitle) =>
      `During a high-stakes scenario in ${courseCode} (${courseTitle}), which decision best balances trade-offs related to ${topic}?`,
    (topic, courseCode, courseTitle) =>
      `For an advanced ${courseCode} (${courseTitle}) challenge, which option gives the strongest technical justification for ${topic}?`,
    (topic, courseCode, courseTitle) =>
      `Which response most rigorously defends a strategy involving ${topic} under constrained conditions in ${courseCode} (${courseTitle})?`,
  ],
}

const DIFFICULTY_FOCUS: Record<QuestionDifficulty, string> = {
  easy: 'foundational understanding',
  medium: 'applied reasoning',
  hard: 'trade-off analysis',
}

function sanitizeInstructionSnippet(instructions: string) {
  const normalized = instructions.trim().replace(/\s+/g, ' ')

  if (normalized.length <= 120) {
    return normalized
  }

  return `${normalized.slice(0, 117)}...`
}

function buildQuestionPrompt(topic: string, courseCode: string, courseTitle: string, difficulty: QuestionDifficulty, index: number) {
  const templates = PROMPT_TEMPLATES[difficulty]
  const template = templates[index % templates.length]
  return template(topic, courseCode, courseTitle)
}

function buildQuestionOptions(topic: string, courseCode: string, difficulty: QuestionDifficulty, index: number) {
  const correctOption = `Apply ${topic} principles using ${DIFFICULTY_FOCUS[difficulty]} expected in ${courseCode}.`

  const distractorBank = [
    `Ignore key ${topic} constraints and optimize only for speed.`,
    `Replace ${topic} with unrelated concepts that do not solve the stated objective.`,
    `Treat ${topic} as optional regardless of requirements or risk.`,
    `Use assumptions about ${topic} without validating evidence or context.`,
  ]

  const answerIndex = index % 4

  const distractors = [
    distractorBank[index % distractorBank.length],
    distractorBank[(index + 1) % distractorBank.length],
    distractorBank[(index + 2) % distractorBank.length],
  ]

  const options = [...distractors]
  options.splice(answerIndex, 0, correctOption)

  return {
    options,
    answer: options[answerIndex],
  }
}

export function generateExamQuestions(input: QuestionGenerationInput): GeneratedQuestion[] {
  const instructionSnippet = sanitizeInstructionSnippet(input.instructions)
  const questions: GeneratedQuestion[] = []

  for (let index = 0; index < input.numberOfQuestions; index += 1) {
    const topic = input.topics[index % input.topics.length]
    const prompt = buildQuestionPrompt(topic, input.courseCode, input.courseTitle, input.difficulty, index)
    const { options, answer } = buildQuestionOptions(topic, input.courseCode, input.difficulty, index)

    questions.push({
      questionNumber: index + 1,
      topic,
      difficulty: input.difficulty,
      prompt,
      options,
      answer,
      explanation: `The correct option aligns with ${topic} objectives and follows exam guidance: "${instructionSnippet}".`,
    })
  }

  return questions
}
