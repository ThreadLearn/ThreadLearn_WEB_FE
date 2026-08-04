'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { InstructorCodeAssignmentEditorPage } from '../../../../../../src/features/instructor/InstructorCodeAssignmentEditorPage';

export default function EditCodingExerciseRoute() {
  const params = useParams();
  const exerciseId = String(params?.exerciseId || '');

  if (!exerciseId) {
    return (
      <div className="p-8 text-center text-slate-400">
        Invalid Exercise ID.
      </div>
    );
  }

  return <InstructorCodeAssignmentEditorPage exerciseId={exerciseId} />;
}
