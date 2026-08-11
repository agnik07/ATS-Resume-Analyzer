import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function CareerTest() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/career/test/questions');
      setQuestions(res.data || []);
    } catch (error) {
      toast.error('Failed to load questions.');
    }
  };

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const handleNext = () => {
    if (!answers[currentQuestion]) {
      toast.error('Please select an option to proceed.');
      return;
    }
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, answer]) => ({
        question_id: parseInt(qId) + 1,
        answer,
      }));

      await api.post('/career/test/submit', { answers: formattedAnswers });
      toast.success('Career path evaluation completed!');
      navigate('/career-results');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Assessment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Psychometric Tech Career Assessment</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Evaluate your problem-solving style, preferred stack, and architectural intuition.
          </p>
        </motion.div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-2xl p-8 border border-border space-y-6"
        >
          <h2 className="text-xl font-bold text-foreground leading-snug">{question.question}</h2>

          <RadioGroup
            value={answers[currentQuestion]}
            onValueChange={handleAnswer}
            className="space-y-3"
          >
            {question.options.map((option, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  answers[currentQuestion] === option
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:bg-muted/40'
                }`}
                onClick={() => handleAnswer(option)}
              >
                <RadioGroupItem value={option} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-sm font-medium text-foreground">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 pt-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !answers[currentQuestion]}
              className="gap-2 shadow-md shadow-primary/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...
                </>
              ) : (
                <>
                  Submit Assessment <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!answers[currentQuestion]} className="gap-2">
              Next Question <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
