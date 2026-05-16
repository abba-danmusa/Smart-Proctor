"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAttemptQuestionReview = buildAttemptQuestionReview;
exports.buildAutomaticGrading = buildAutomaticGrading;
exports.serializeAttemptGrading = serializeAttemptGrading;
exports.getResultStatus = getResultStatus;
function getOptionKey(index) {
    return String.fromCharCode(65 + index);
}
function normalizeText(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function getSelectedOption(question, rawAnswer) {
    const normalized = normalizeText(rawAnswer);
    if (!normalized) {
        return {
            selectedOptionKey: undefined,
            selectedOptionText: undefined,
        };
    }
    const upper = normalized.toUpperCase();
    if (/^[A-Z]$/.test(upper)) {
        const optionIndex = upper.charCodeAt(0) - 65;
        const optionValue = question.options[optionIndex];
        return {
            selectedOptionKey: optionValue ? upper : undefined,
            selectedOptionText: optionValue,
        };
    }
    const matchedOption = question.options.find((option) => option.trim().toLowerCase() === normalized.toLowerCase());
    if (!matchedOption) {
        return {
            selectedOptionKey: undefined,
            selectedOptionText: normalized,
        };
    }
    const matchedIndex = question.options.findIndex((option) => option === matchedOption);
    return {
        selectedOptionKey: matchedIndex >= 0 ? getOptionKey(matchedIndex) : undefined,
        selectedOptionText: matchedOption,
    };
}
function getCorrectOption(question) {
    const correctIndex = question.options.findIndex((option) => option === question.answer);
    return {
        correctOptionKey: correctIndex >= 0 ? getOptionKey(correctIndex) : undefined,
        correctOptionText: correctIndex >= 0 ? question.options[correctIndex] : question.answer,
    };
}
function buildAttemptQuestionReview(questions, answers) {
    const submittedAnswers = answers ?? {};
    return questions.map((question) => {
        const rawAnswer = submittedAnswers[`q${question.questionNumber}`] ?? submittedAnswers[String(question.questionNumber)];
        const { selectedOptionKey, selectedOptionText } = getSelectedOption(question, rawAnswer);
        const { correctOptionKey, correctOptionText } = getCorrectOption(question);
        const isCorrect = Boolean(selectedOptionText && correctOptionText && selectedOptionText === correctOptionText);
        return {
            questionNumber: question.questionNumber,
            prompt: question.prompt,
            topic: question.topic,
            difficulty: question.difficulty,
            options: question.options,
            selectedOptionKey,
            selectedOptionText,
            correctOptionKey,
            correctOptionText,
            isCorrect,
            explanation: question.explanation,
        };
    });
}
function buildAutomaticGrading(questions, answers, gradedAt = new Date()) {
    const review = buildAttemptQuestionReview(questions, answers);
    const totalQuestions = questions.length;
    const correctAnswers = review.filter((item) => item.isCorrect).length;
    const autoScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : undefined;
    return {
        grading: {
            status: totalQuestions > 0 ? 'auto_graded' : 'pending',
            method: totalQuestions > 0 ? 'automatic' : undefined,
            autoScore,
            finalScore: autoScore,
            correctAnswers,
            totalQuestions,
            gradedAt: totalQuestions > 0 ? gradedAt : undefined,
        },
        review,
    };
}
function serializeAttemptGrading(grading) {
    if (!grading) {
        return undefined;
    }
    return {
        status: grading.status,
        method: grading.method,
        autoScore: grading.autoScore,
        manualScore: grading.manualScore,
        finalScore: grading.finalScore,
        correctAnswers: grading.correctAnswers,
        totalQuestions: grading.totalQuestions,
        feedback: grading.feedback,
        gradedAt: grading.gradedAt?.toISOString(),
        gradedBy: grading.gradedBy
            ? {
                id: grading.gradedBy.id,
                email: grading.gradedBy.email,
                fullName: grading.gradedBy.fullName,
            }
            : undefined,
    };
}
function getResultStatus(finalScore) {
    if (typeof finalScore !== 'number') {
        return 'pending';
    }
    return finalScore >= 50 ? 'passed' : 'failed';
}
