import InstructorLessonEditorPage from '@/features/instructor/InstructorLessonEditorPage';

export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <InstructorLessonEditorPage lessonId={lessonId} />;
}
