import { InstructorQuizEditorPage } from '@/features/instructor/InstructorQuizEditorPage';

interface PageProps {
  params: Promise<{ quizId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { quizId } = await params;
  return <InstructorQuizEditorPage quizId={quizId} />;
}
